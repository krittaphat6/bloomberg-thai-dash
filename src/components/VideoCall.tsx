import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Minimize2, 
  Monitor, MonitorOff, AlertCircle, Volume2, VolumeX, Users, Wifi
} from 'lucide-react';
import Peer from 'peerjs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { getThemeColors } from '@/utils/themeColors';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';

interface VideoCallProps {
  roomId: string;
  currentUser: { id: string; username: string; color: string };
  onClose: () => void;
}

interface RemotePeer {
  peerId: string;
  userId: string;
  username: string;
  stream?: MediaStream;
  call?: any;
  isSpeaking?: boolean;
  audioLevel?: number;
}

export const VideoCall = ({ roomId, currentUser, onClose }: VideoCallProps) => {
  const { toast } = useToast();
  const currentTheme = useCurrentTheme();
  const colors = getThemeColors(currentTheme);

  // States
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  
  // Controls
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Status
  const [permissionError, setPermissionError] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [myAudioLevel, setMyAudioLevel] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const activeCallsChannel = useRef<any>(null);
  const myCallRecord = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        console.log('🎬 Starting video call...');
        setIsInitializing(true);

        // 1. Request permissions
        let stream: MediaStream;
        
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 }, 
              facingMode: 'user' 
            },
            audio: { 
              echoCancellation: true, 
              noiseSuppression: true, 
              autoGainControl: true 
            }
          });
        } catch (permError: any) {
          console.error('❌ Permission error:', permError);
          
          if (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError') {
            setPermissionError('⛔ Camera/Microphone access denied. Please allow access and refresh.');
          } else if (permError.name === 'NotFoundError') {
            setPermissionError('📷 No camera or microphone found. Please connect a device.');
          } else if (permError.name === 'NotReadableError') {
            setPermissionError('🔒 Camera/Microphone is already in use.');
          } else {
            setPermissionError(`❌ Error: ${permError.message}`);
          }
          
          setIsInitializing(false);
          return;
        }

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Setup audio level detection
        setupAudioLevelDetection(stream);

        // 2. Create Peer
        const peerIdString = `${roomId.slice(0, 8)}_${currentUser.id.slice(0, 8)}_${Date.now()}`;
        
        const peerInstance = new Peer(peerIdString, {
          host: '0.peerjs.com',
          secure: true,
          port: 443,
          debug: 2,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' }
            ]
          }
        });

        peerInstance.on('open', async (id) => {
          console.log('✅ Peer connected:', id);
          if (!mounted) return;
          
          setMyPeerId(id);
          setIsInitializing(false);
          
          // Register in database
          try {
            const { data, error } = await supabase
              .from('active_video_calls')
              .insert({
                room_id: roomId,
                user_id: currentUser.id,
                username: currentUser.username,
                peer_id: id,
                is_active: true
              })
              .select()
              .single();

            if (error) {
              console.error('❌ DB error:', error);
            } else {
              myCallRecord.current = data.id;
            }
          } catch (err) {
            console.error('❌ Registration error:', err);
          }

          toast({ title: '✅ Connected', description: 'Video call is ready!' });

          // Load and call existing peers
          await loadAndCallPeers(peerInstance, stream, id);
          
          // Subscribe to new peers
          subscribeToNewPeers(peerInstance, stream);
        });

        // Handle incoming calls
        peerInstance.on('call', (call) => {
          console.log('📞 Incoming call from:', call.peer);
          call.answer(stream);

          call.on('stream', (remoteStream) => {
            console.log('📺 Got stream from:', call.peer);
            addRemotePeer(call.peer, remoteStream, call);
            setupRemoteAudioDetection(call.peer, remoteStream);
          });

          call.on('close', () => {
            console.log('📴 Call closed:', call.peer);
            removeRemotePeer(call.peer);
          });

          call.on('error', (err) => {
            console.error('❌ Call error:', err);
            removeRemotePeer(call.peer);
          });
        });

        peerInstance.on('error', (err) => {
          console.error('❌ Peer error:', err);
          toast({ title: 'Connection Error', description: err.message, variant: 'destructive' });
        });

        setPeer(peerInstance);

      } catch (error: any) {
        console.error('❌ Init error:', error);
        setPermissionError(`Failed: ${error.message}`);
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [roomId, currentUser.id]);

  // Audio level detection for local user
  const setupAudioLevelDetection = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const detectAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMyAudioLevel(average);
        setIsSpeaking(average > 20 && isAudioOn);

        animationFrameRef.current = requestAnimationFrame(detectAudioLevel);
      };

      detectAudioLevel();
    } catch (error) {
      console.error('Audio detection error:', error);
    }
  };

  // Audio detection for remote peers
  const setupRemoteAudioDetection = (peerId: string, stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
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

        setTimeout(detectRemoteAudio, 100);
      };

      detectRemoteAudio();
    } catch (error) {
      console.error('Remote audio detection error:', error);
    }
  };

  const loadAndCallPeers = async (peerInstance: Peer, stream: MediaStream, myPeerId: string) => {
    try {
      const { data: existingPeers } = await supabase
        .from('active_video_calls')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .neq('peer_id', myPeerId);

      if (existingPeers && existingPeers.length > 0) {
        console.log(`📞 Calling ${existingPeers.length} peer(s)`);
        
        for (const peerData of existingPeers) {
          setTimeout(() => {
            callPeer(peerInstance, peerData.peer_id, peerData.user_id, peerData.username, stream);
          }, 500);
        }
      }
    } catch (error) {
      console.error('❌ Error loading peers:', error);
    }
  };

  const callPeer = (peerInstance: Peer, remotePeerId: string, userId: string, username: string, stream: MediaStream) => {
    console.log('📞 Calling:', remotePeerId);
    
    const call = peerInstance.call(remotePeerId, stream);

    call.on('stream', (remoteStream) => {
      console.log('📺 Got stream from:', remotePeerId);
      addRemotePeer(remotePeerId, remoteStream, call, userId, username);
      setupRemoteAudioDetection(remotePeerId, remoteStream);
    });

    call.on('close', () => {
      console.log('📴 Call closed:', remotePeerId);
      removeRemotePeer(remotePeerId);
    });

    call.on('error', (err) => {
      console.error('❌ Call error:', err);
      removeRemotePeer(remotePeerId);
    });
  };

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
          console.log('👋 New peer:', newPeer.username);
          setTimeout(() => {
            callPeer(peerInstance, newPeer.peer_id, newPeer.user_id, newPeer.username, stream);
          }, 1000);
        }
      })
      .subscribe();

    activeCallsChannel.current = channel;
  };

  const addRemotePeer = (peerId: string, stream: MediaStream, call?: any, userId?: string, username?: string) => {
    setRemotePeers(prev => {
      const newMap = new Map(prev);
      newMap.set(peerId, { 
        peerId, 
        userId: userId || '', 
        username: username || 'User', 
        stream, 
        call,
        isSpeaking: false,
        audioLevel: 0
      });
      return newMap;
    });

    toast({ title: '👋 Joined', description: username || 'Someone joined' });
  };

  const removeRemotePeer = (peerId: string) => {
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

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioOn(!isAudioOn);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    
    // Mute all remote audio
    remotePeers.forEach(peer => {
      if (peer.stream) {
        peer.stream.getAudioTracks().forEach(track => {
          track.enabled = isDeafened; // Toggle opposite
        });
      }
    });

    // Also mute own mic when deafened
    if (!isDeafened && localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      setIsAudioOn(false);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      screenStream?.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Switch back to camera
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }
        };

        toast({ title: '🖥️ Screen Sharing', description: 'You are now sharing your screen' });
      } catch (error: any) {
        console.error('Screen share error:', error);
        toast({ title: 'Error', description: 'Could not start screen sharing', variant: 'destructive' });
      }
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('video-call-container');
    if (!document.fullscreenElement && container) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const cleanup = async () => {
    console.log('🧹 Cleaning up...');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    audioContextRef.current?.close();

    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    
    remotePeers.forEach(p => {
      p.stream?.getTracks().forEach(t => t.stop());
      p.call?.close();
    });
    
    peer?.destroy();

    if (activeCallsChannel.current) {
      supabase.removeChannel(activeCallsChannel.current);
    }

    if (myCallRecord.current) {
      await supabase
        .from('active_video_calls')
        .delete()
        .eq('id', myCallRecord.current);
    }
  };

  const endCall = async () => {
    await cleanup();
    onClose();
    toast({ title: '📞 Call Ended' });
  };

  // Permission Error UI
  if (permissionError) {
    return (
      <div 
        id="video-call-container"
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="max-w-md p-6">
          <Alert style={{ borderColor: '#dc2626', backgroundColor: colors.panel }}>
            <AlertCircle className="h-4 w-4" style={{ color: '#dc2626' }} />
            <AlertDescription className="mt-2" style={{ color: colors.foreground }}>
              <p className="font-bold mb-2">Camera/Microphone Access Required</p>
              <p className="text-sm mb-4">{permissionError}</p>
              <div className="text-sm space-y-2 mb-4">
                <p className="font-semibold">How to fix:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click the camera icon 🎥 in your browser's address bar</li>
                  <li>Select "Allow" for camera and microphone</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <Button onClick={onClose} variant="outline">Close</Button>
                <Button onClick={() => window.location.reload()}>Refresh Page</Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Loading UI
  if (isInitializing) {
    return (
      <div 
        id="video-call-container"
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="text-center" style={{ color: colors.foreground }}>
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}></div>
          <p className="text-lg font-bold">Initializing Video Call...</p>
          <p className="text-sm opacity-60 mt-2">Please allow camera and microphone access</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="video-call-container"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between border-b"
        style={{ 
          backgroundColor: colors.panel, 
          borderColor: colors.border, 
          color: colors.foreground 
        }}
      >
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5" style={{ color: colors.primary }} />
          <div>
            <span className="font-bold">Video Call</span>
            <div className="text-xs opacity-60 flex items-center gap-2">
              <Wifi className="w-3 h-3" />
              {remotePeers.size + 1} participant{remotePeers.size !== 0 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowParticipants(!showParticipants)}
            style={{ color: colors.foreground }}
          >
            <Users className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen} 
            style={{ color: colors.foreground }}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className="flex-1 p-4 grid gap-4" style={{
          gridTemplateColumns: remotePeers.size === 0 ? '1fr' : 
                             remotePeers.size === 1 ? 'repeat(2, 1fr)' : 
                             'repeat(auto-fit, minmax(300px, 1fr))'
        }}>
          {/* Local Video */}
          <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: colors.panel }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Speaking Indicator */}
            {isSpeaking && (
              <div className="absolute inset-0 border-4 border-green-500 rounded-lg animate-pulse pointer-events-none"></div>
            )}
            <div 
              className="absolute bottom-3 left-3 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#ffffff' }}
            >
              <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              You ({currentUser.username})
              {isScreenSharing && <span className="text-xs">🖥️</span>}
            </div>
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center" 
                   style={{ backgroundColor: colors.panel }}>
                <VideoOff className="w-12 h-12 opacity-50" />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {Array.from(remotePeers.values()).map((remotePeer) => (
            <div 
              key={remotePeer.peerId} 
              className="relative rounded-lg overflow-hidden" 
              style={{ backgroundColor: colors.panel }}
            >
              <video
                ref={(el) => {
                  if (el && remotePeer.stream) {
                    remoteVideosRef.current.set(remotePeer.peerId, el);
                    el.srcObject = remotePeer.stream;
                  }
                }}
                autoPlay
                playsInline
                muted={isDeafened}
                className="w-full h-full object-cover"
              />
              {/* Speaking Indicator */}
              {remotePeer.isSpeaking && !isDeafened && (
                <div className="absolute inset-0 border-4 border-green-500 rounded-lg animate-pulse pointer-events-none"></div>
              )}
              <div 
                className="absolute bottom-3 left-3 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#ffffff' }}
              >
                <div className={`w-2 h-2 rounded-full ${remotePeer.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                {remotePeer.username}
              </div>
            </div>
          ))}
        </div>

        {/* Participants Sidebar */}
        {showParticipants && (
          <div 
            className="w-64 border-l p-4"
            style={{ backgroundColor: colors.panel, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: colors.foreground }}>Participants</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowParticipants(false)}>✕</Button>
            </div>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {/* Current User */}
                <div 
                  className="p-3 rounded flex items-center gap-3"
                  style={{ backgroundColor: colors.background }}
                >
                  <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: colors.foreground }}>
                      {currentUser.username} (You)
                    </div>
                    <div className="text-xs opacity-60">
                      {isAudioOn ? '🎤' : '🔇'} {isVideoOn ? '📹' : '📷'}
                    </div>
                  </div>
                </div>

                {/* Remote Participants */}
                {Array.from(remotePeers.values()).map((peer) => (
                  <div 
                    key={peer.peerId}
                    className="p-3 rounded flex items-center gap-3"
                    style={{ backgroundColor: colors.background }}
                  >
                    <div className={`w-3 h-3 rounded-full ${peer.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm" style={{ color: colors.foreground }}>
                        {peer.username}
                      </div>
                      <div className="text-xs opacity-60">
                        {peer.isSpeaking ? '🎤 Speaking' : '🔇 Quiet'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Controls */}
      <div 
        className="p-6 flex items-center justify-center gap-3 border-t"
        style={{ backgroundColor: colors.panel, borderColor: colors.border }}
      >
        <Button
          onClick={toggleAudio}
          size="lg"
          title={isAudioOn ? 'Mute Microphone' : 'Unmute Microphone'}
          className="rounded-full w-14 h-14 transition-all relative"
          style={{ backgroundColor: isAudioOn ? colors.accent : '#dc2626', color: '#ffffff' }}
        >
          {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          {isSpeaking && (
            <div className="absolute inset-0 border-2 border-green-400 rounded-full animate-ping"></div>
          )}
        </Button>

        <Button
          onClick={toggleDeafen}
          size="lg"
          title={isDeafened ? 'Undeafen' : 'Deafen (Mute All)'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ backgroundColor: isDeafened ? '#dc2626' : colors.accent, color: '#ffffff' }}
        >
          {isDeafened ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleVideo}
          size="lg"
          title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ backgroundColor: isVideoOn ? colors.accent : '#dc2626', color: '#ffffff' }}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleScreenShare}
          size="lg"
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ backgroundColor: isScreenSharing ? '#3b82f6' : colors.accent, color: '#ffffff' }}
        >
          {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
        </Button>

        <div className="w-px h-12 mx-2" style={{ backgroundColor: colors.border }}></div>

        <Button
          onClick={endCall}
          size="lg"
          title="Leave Call"
          className="rounded-full w-14 h-14 transition-all hover:scale-110"
          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};
