# VideoCall.tsx - Fix Examples

## Fix 1: Deafen Toggle Logic (Line 519)

### BEFORE (BROKEN)
```typescript
const toggleDeafen = () => {
  setIsDeafened(!isDeafened);
  
  remotePeers.forEach(peer => {
    if (peer.stream) {
      peer.stream.getAudioTracks().forEach(track => {
        track.enabled = isDeafened;  // ✗ BACKWARDS!
      });
    }
  });
  // ...
};
```

### AFTER (FIXED)
```typescript
const toggleDeafen = () => {
  const newDeafenState = !isDeafened;
  setIsDeafened(newDeafenState);
  
  remotePeers.forEach(peer => {
    if (peer.stream) {
      peer.stream.getAudioTracks().forEach(track => {
        track.enabled = !newDeafenState;  // ✓ CORRECT - inverted
      });
    }
  });
  // ...
};
```

**Why**: When deafened=true, we want audio OFF (enabled=false)

---

## Fix 2: Screen Sharing Track Replacement (Line 533-572)

### BEFORE (BROKEN)
```typescript
const toggleScreenShare = async () => {
  if (isScreenSharing) {
    screenStream?.getTracks().forEach(track => track.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
    
    // Only updates VIDEO ELEMENT, not peer connections
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  } else {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    setScreenStream(stream);
    setIsScreenSharing(true);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;  // Only visual update
    }
    // ...
  }
};
```

### AFTER (FIXED)
```typescript
const toggleScreenShare = async () => {
  if (isScreenSharing) {
    // Stop screen stream
    screenStream?.getTracks().forEach(track => track.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
    
    // Update UI
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    // CRITICAL: Replace tracks in ALL peer connections
    for (const remotePeer of remotePeers.values()) {
      if (remotePeer.call?.peerConnection) {
        const sender = remotePeer.call.peerConnection
          .getSenders()
          .find(s => s.track?.kind === 'video');
        
        if (sender && localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            await sender.replaceTrack(videoTrack).catch(err => {
              console.error('[VIDEO] Failed to replace track:', err);
            });
          }
        }
      }
    }
  } else {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      setScreenStream(stream);
      setIsScreenSharing(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // CRITICAL: Replace tracks in ALL peer connections
      for (const remotePeer of remotePeers.values()) {
        if (remotePeer.call?.peerConnection) {
          const sender = remotePeer.call.peerConnection
            .getSenders()
            .find(s => s.track?.kind === 'video');
          
          if (sender && stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              await sender.replaceTrack(videoTrack).catch(err => {
                console.error('[VIDEO] Failed to replace track:', err);
              });
            }
          }
        }
      }

      // Handle user stopping screen share from OS
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }
        // Also switch back for peer connections
        for (const remotePeer of remotePeers.values()) {
          if (remotePeer.call?.peerConnection && localStream) {
            const sender = remotePeer.call.peerConnection
              .getSenders()
              .find(s => s.track?.kind === 'video');
            if (sender && localStream) {
              sender.replaceTrack(
                localStream.getVideoTracks()[0]
              ).catch(err => console.error('[VIDEO] Error:', err));
            }
          }
        }
      };

      toast({ title: '🖥️ Screen Sharing', description: 'Screen share started' });
    } catch (error: any) {
      console.error('[VIDEO] Screen share error:', error);
      toast({ title: 'Error', description: 'Could not start screen sharing' });
    }
  }
};
```

---

## Fix 3: AudioContext Cleanup for Remote Peers (Line 299-331)

### BEFORE (MEMORY LEAK)
```typescript
// Refs
const audioContextRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);

// Creates NEW AudioContext for EACH peer with no cleanup!
const setupRemoteAudioDetection = (peerId: string, stream: MediaStream) => {
  try {
    const audioContext = new AudioContext();  // ✗ Never stored
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);

    const detectRemoteAudio = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      setRemotePeers(prev => {
        const newMap = new Map(prev);
        const peer = newMap.get(peerId);
        if (peer) {
          peer.isSpeaking = average > 20;
          peer.audioLevel = average;
        }
        return newMap;
      });

      setTimeout(detectRemoteAudio, 100);  // ✗ Never cancelled
    };

    detectRemoteAudio();
  } catch (error) {
    console.error('Remote audio detection error:', error);
  }
};
```

### AFTER (FIXED)
```typescript
// Refs - store AudioContext and timeout IDs
const audioContextRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const remoteAudioContextsRef = useRef<Map<string, {
  context: AudioContext;
  timeoutId: number;
}>>(new Map());

const setupRemoteAudioDetection = (peerId: string, stream: MediaStream) => {
  try {
    // Stop any existing detection for this peer
    const existing = remoteAudioContextsRef.current.get(peerId);
    if (existing) {
      clearTimeout(existing.timeoutId);
      existing.context.close();
      remoteAudioContextsRef.current.delete(peerId);
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);

    let timeoutId: number;
    const detectRemoteAudio = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      setRemotePeers(prev => {
        const newMap = new Map(prev);
        const peer = newMap.get(peerId);
        if (peer) {
          peer.isSpeaking = average > 20;
          peer.audioLevel = average;
        }
        return newMap;
      });

      // Schedule next detection - but store ID
      timeoutId = window.setTimeout(detectRemoteAudio, 100);
    };

    detectRemoteAudio();
    
    // Store for cleanup
    remoteAudioContextsRef.current.set(peerId, { context: audioContext, timeoutId });
  } catch (error) {
    console.error('[AUDIO] Remote detection error:', error);
  }
};
```

Then in `removeRemotePeer`:

```typescript
const removeRemotePeer = (peerId: string) => {
  // CLEANUP AUDIO CONTEXT
  const audioData = remoteAudioContextsRef.current.get(peerId);
  if (audioData) {
    clearTimeout(audioData.timeoutId);
    audioData.context.close();
    remoteAudioContextsRef.current.delete(peerId);
  }

  setRemotePeers(prev => {
    const newMap = new Map(prev);
    const peer = newMap.get(peerId);
    if (peer) {
      peer.stream?.getTracks().forEach(t => t.stop());
      peer.call?.close();
    }
    newMap.delete(peerId);
    return newMap;
  });
};
```

---

## Fix 4: Exponential Backoff for Reconnection (Line 407-421)

### BEFORE (CONNECTION STORM)
```typescript
call.peerConnection.onconnectionstatechange = () => {
  const state = call.peerConnection.connectionState;
  console.log(`Connection ${remotePeerId}:`, state);
  
  if (state === 'failed' || state === 'disconnected') {
    console.log('Connection failed, attempting reconnection...');
    setTimeout(() => {  // ✗ No backoff, no limit
      if (peerInstance && peerInstance.open) {
        removeRemotePeer(remotePeerId);
        callPeer(peerInstance, remotePeerId, userId, username, stream);
      }
    }, 2000);  // ✗ Always 2s
  }
};
```

### AFTER (FIXED)
```typescript
// Add to component state
const reconnectAttemptsRef = useRef<Map<string, {
  count: number;
  timeoutId: number;
}>>(new Map());

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 2000; // 2 seconds
const MAX_DELAY = 60000; // 60 seconds

// Helper to calculate exponential backoff with jitter
const getBackoffDelay = (attemptCount: number): number => {
  const exponentialDelay = BASE_DELAY * Math.pow(2, attemptCount - 1);
  const delay = Math.min(exponentialDelay, MAX_DELAY);
  const jitter = Math.random() * delay * 0.1; // 10% jitter
  return delay + jitter;
};

// In callPeer function:
if (call.peerConnection) {
  call.peerConnection.onconnectionstatechange = () => {
    const state = call.peerConnection.connectionState;
    console.log(`[PEER] Connection ${remotePeerId}: ${state}`);
    
    if (state === 'failed' || state === 'disconnected') {
      const existing = reconnectAttemptsRef.current.get(remotePeerId);
      const attemptCount = (existing?.count || 0) + 1;
      
      // Clear previous timeout if any
      if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId);
      }
      
      if (attemptCount > MAX_RECONNECT_ATTEMPTS) {
        console.error(`[PEER] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached for ${remotePeerId}`);
        removeRemotePeer(remotePeerId);
        reconnectAttemptsRef.current.delete(remotePeerId);
        toast({
          title: 'Connection Lost',
          description: `Lost connection to ${username} after ${MAX_RECONNECT_ATTEMPTS} attempts`,
          variant: 'destructive'
        });
        return;
      }
      
      const delay = getBackoffDelay(attemptCount);
      console.log(`[PEER] Reconnect attempt ${attemptCount}/${MAX_RECONNECT_ATTEMPTS} for ${remotePeerId} in ${Math.round(delay)}ms`);
      
      const timeoutId = window.setTimeout(() => {
        if (peerInstance && peerInstance.open) {
          removeRemotePeer(remotePeerId);
          callPeer(peerInstance, remotePeerId, userId, username, stream);
          reconnectAttemptsRef.current.delete(remotePeerId);
        }
      }, delay);
      
      reconnectAttemptsRef.current.set(remotePeerId, {
        count: attemptCount,
        timeoutId
      });
    } else if (state === 'connected') {
      // Reset on successful connection
      const existing = reconnectAttemptsRef.current.get(remotePeerId);
      if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId);
      }
      reconnectAttemptsRef.current.delete(remotePeerId);
    }
  };
}
```

Then in cleanup:

```typescript
const cleanup = async () => {
  // Cancel all pending reconnect attempts
  for (const data of reconnectAttemptsRef.current.values()) {
    clearTimeout(data.timeoutId);
  }
  reconnectAttemptsRef.current.clear();
  
  // ... rest of cleanup
};
```

---

## Fix 5: Race Condition Guards (Line 333-354)

### BEFORE (RACE CONDITION)
```typescript
const loadAndCallPeers = async (peerInstance: Peer, stream: MediaStream, myPeerId: string) => {
  try {
    const { data: existingPeers } = await supabase
      .from('active_video_calls')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .neq('peer_id', myPeerId);

    if (existingPeers && existingPeers.length > 0) {
      for (const peerData of existingPeers) {
        setTimeout(() => {  // ✗ All fire simultaneously if network fast
          callPeer(peerInstance, peerData.peer_id, peerData.user_id, peerData.username, stream);
        }, 500);  // ✗ Fixed delay
      }
    }
  } catch (error) {
    console.error('❌ Error loading peers:', error);
  }
};
```

### AFTER (FIXED)
```typescript
const loadAndCallPeersRef = useRef<Map<string, boolean>>(new Map());

const loadAndCallPeers = async (peerInstance: Peer, stream: MediaStream, myPeerId: string) => {
  try {
    const { data: existingPeers } = await supabase
      .from('active_video_calls')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .neq('peer_id', myPeerId);

    if (existingPeers && existingPeers.length > 0) {
      console.log(`[INIT] Found ${existingPeers.length} existing peer(s)`);
      
      // Stagger the calls to avoid connection storms
      for (let i = 0; i < existingPeers.length; i++) {
        const peerData = existingPeers[i];
        const delay = (i + 1) * 500;  // 500ms, 1s, 1.5s, etc.
        
        setTimeout(() => {
          // Check if already loading this peer
          if (loadAndCallPeersRef.current.get(peerData.peer_id)) {
            console.log(`[INIT] Already loading peer ${peerData.peer_id}`);
            return;
          }
          
          // Mark as loading
          loadAndCallPeersRef.current.set(peerData.peer_id, true);
          
          callPeer(peerInstance, peerData.peer_id, peerData.user_id, peerData.username, stream);
          
          // Clear loading flag after successful call attempt
          setTimeout(() => {
            loadAndCallPeersRef.current.delete(peerData.peer_id);
          }, 2000);
        }, delay);
      }
    }
  } catch (error) {
    console.error('[INIT] Error loading peers:', error);
  }
};
```

---

## Fix 6: Supabase Channel Cleanup (Line 441-460)

### BEFORE (NO CLEANUP)
```typescript
const subscribeToNewPeers = (peerInstance: Peer, stream: MediaStream) => {
  const channel = supabase
    .channel(`video-calls:${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'active_video_calls',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      const newPeer = payload.new as any;
      if (newPeer.peer_id !== myPeerId && newPeer.is_active) {
        setTimeout(() => {
          callPeer(peerInstance, newPeer.peer_id, newPeer.user_id, newPeer.username, stream);
        }, 1000);
      }
    })
    .subscribe();

  activeCallsChannel.current = channel;  // ✗ Ref can be overwritten
};
```

### AFTER (PROPER CLEANUP)
```typescript
// Move to separate useEffect after peer is ready
useEffect(() => {
  if (!peer || !localStream || myPeerId === '') return;

  const subscribeToNewPeers = () => {
    const channel = supabase
      .channel(`video-calls:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'active_video_calls',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newPeer = payload.new as any;
        if (newPeer.peer_id !== myPeerId && newPeer.is_active) {
          // Check if already have this peer
          if (remotePeers.has(newPeer.peer_id)) {
            console.log(`[SUBSCRIBE] Already have peer ${newPeer.peer_id}`);
            return;
          }
          
          console.log(`[SUBSCRIBE] New peer joined: ${newPeer.username}`);
          setTimeout(() => {
            callPeer(peer, newPeer.peer_id, newPeer.user_id, newPeer.username, localStream);
          }, 1000);
        }
      })
      .subscribe();

    return channel;
  };

  const channel = subscribeToNewPeers();

  return () => {
    supabase.removeChannel(channel);  // ✓ PROPER CLEANUP
  };
}, [peer, localStream, myPeerId, roomId, remotePeers]);
```

---

## Summary of Changes

| Issue | File | Lines | Change Type | Risk Level |
|-------|------|-------|-------------|-----------|
| Deafen logic | VideoCall.tsx | 519 | 1-line logic fix | LOW |
| Screen sharing | VideoCall.tsx | 533-572 | Function rewrite | MEDIUM |
| AudioContext cleanup | VideoCall.tsx | 267-331 | Add refs + cleanup | MEDIUM |
| Exponential backoff | VideoCall.tsx | 407-421 | Function rewrite | MEDIUM |
| Race condition guards | VideoCall.tsx | 333-354 | Add debounce | LOW |
| Channel cleanup | VideoCall.tsx | 441-460 | Move to useEffect | MEDIUM |

All fixes maintain backward compatibility and don't require API changes.
