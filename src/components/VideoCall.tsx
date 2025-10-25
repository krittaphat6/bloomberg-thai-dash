import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Minimize2, Monitor, MonitorOff } from 'lucide-react';
import Peer from 'peerjs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { getThemeColors } from '@/utils/themeColors';

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
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const activeCallsChannel = useRef<any>(null);
  const myCallRecord = useRef<string>('');

  // Initialize
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        console.log('🎬 Initializing video call...');

        // 1. Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Create Peer
        const peerIdString = `${roomId.slice(0, 8)}_${currentUser.id.slice(0, 8)}_${Date.now()}`;
        const peerInstance = new Peer(peerIdString, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ]
          }
        });

        peerInstance.on('open', async (id) => {
          console.log('✅ Peer ready:', id);
          if (!mounted) return;
          
          setMyPeerId(id);
          
          // 3. Register in Supabase
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
            console.error('❌ Register error:', error);
          } else {
            myCallRecord.current = data.id;
            console.log('✅ Registered in room');
          }

          setIsReady(true);
          toast({ title: '✅ Ready to Call', description: 'Searching for peers...' });

          // 4. Load existing peers and call them
          await loadAndCallPeers(peerInstance, stream, id);
        });

        // Handle incoming calls
        peerInstance.on('call', (call) => {
          console.log('📞 Receiving call from:', call.peer);
          
          call.answer(stream);

          call.on('stream', (remoteStream) => {
            console.log('📺 Received remote stream from:', call.peer);
            addRemotePeer(call.peer, remoteStream, call);
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

        // 5. Subscribe to new peers joining
        subscribeToNewPeers(peerInstance, stream);

      } catch (error: any) {
        console.error('❌ Init error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Could not start video call',
          variant: 'destructive'
        });
      }
    };

    init();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [roomId, currentUser.id]);

  const loadAndCallPeers = async (peerInstance: Peer, stream: MediaStream, myPeerId: string) => {
    try {
      const { data: existingPeers } = await supabase
        .from('active_video_calls')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .neq('peer_id', myPeerId);

      if (existingPeers && existingPeers.length > 0) {
        console.log(`📞 Calling ${existingPeers.length} existing peers`);
        
        existingPeers.forEach((peerData) => {
          setTimeout(() => {
            callPeer(peerInstance, peerData.peer_id, peerData.user_id, peerData.username, stream);
          }, 500); // Small delay for stability
        });
      } else {
        console.log('👤 You are the first one in the call');
      }
    } catch (error) {
      console.error('❌ Error loading peers:', error);
    }
  };

  const callPeer = (peerInstance: Peer, remotePeerId: string, userId: string, username: string, stream: MediaStream) => {
    console.log('📞 Calling peer:', remotePeerId);
    
    const call = peerInstance.call(remotePeerId, stream);

    call.on('stream', (remoteStream) => {
      console.log('📺 Got stream from:', remotePeerId);
      addRemotePeer(remotePeerId, remoteStream, call, userId, username);
    });

    call.on('close', () => {
      console.log('📴 Call closed:', remotePeerId);
      removeRemotePeer(remotePeerId);
    });

    call.on('error', (err) => {
      console.error('❌ Call error:', remotePeerId, err);
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
          console.log('👋 New peer joined:', newPeer.username);
          
          // Wait a bit then call them
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
      newMap.set(peerId, { peerId, userId: userId || '', username: username || 'User', stream, call });
      return newMap;
    });

    toast({ 
      title: '👋 Peer Connected', 
      description: username ? `${username} joined` : 'A peer joined the call' 
    });
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

  return (
    <div 
      id="video-call-container"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between border-b"
        style={{ backgroundColor: colors.panel, borderColor: colors.border, color: colors.foreground }}
      >
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5" style={{ color: colors.primary }} />
          <div>
            <span className="font-bold">Video Call</span>
            <div className="text-xs opacity-60">
              {remotePeers.size} participant{remotePeers.size !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} style={{ color: colors.foreground }}>
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </Button>
      </div>

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
          <div 
            className="absolute bottom-3 left-3 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: colors.foreground }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            You ({currentUser.username})
            {isScreenSharing && <span className="text-xs">🖥️</span>}
          </div>
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: colors.panel }}>
              <VideoOff className="w-12 h-12 opacity-50" />
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {Array.from(remotePeers.values()).map((remotePeer) => (
          <div key={remotePeer.peerId} className="relative rounded-lg overflow-hidden" style={{ backgroundColor: colors.panel }}>
            <video
              ref={(el) => {
                if (el && remotePeer.stream) {
                  remoteVideosRef.current.set(remotePeer.peerId, el);
                  el.srcObject = remotePeer.stream;
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div 
              className="absolute bottom-3 left-3 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: colors.foreground }}
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {remotePeer.username}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div 
        className="p-6 flex items-center justify-center gap-4 border-t"
        style={{ backgroundColor: colors.panel, borderColor: colors.border }}
      >
        <Button
          onClick={toggleAudio}
          size="lg"
          title={isAudioOn ? 'Mute' : 'Unmute'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ backgroundColor: isAudioOn ? colors.accent : '#dc2626' }}
        >
          {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleVideo}
          size="lg"
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ backgroundColor: isVideoOn ? colors.accent : '#dc2626' }}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleScreenShare}
          size="lg"
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ backgroundColor: isScreenSharing ? '#3b82f6' : colors.accent }}
        >
          {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
        </Button>

        <Button
          onClick={endCall}
          size="lg"
          title="End call"
          className="rounded-full w-14 h-14 transition-all"
          style={{ backgroundColor: '#dc2626' }}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};
