import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Minimize2, Monitor, MonitorOff } from 'lucide-react';
import Peer from 'peerjs';
import { useToast } from '@/hooks/use-toast';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { getThemeColors } from '@/utils/themeColors';

interface VideoCallProps {
  roomId: string;
  currentUser: { id: string; username: string; color: string };
  onClose: () => void;
}

export const VideoCallPeerJS = ({ roomId, currentUser, onClose }: VideoCallProps) => {
  const { toast } = useToast();
  const currentTheme = useCurrentTheme();
  const colors = getThemeColors(currentTheme);

  // States
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const currentCallRef = useRef<any>(null);

  // Initialize PeerJS and get local media
  useEffect(() => {
    const initPeer = async () => {
      try {
        console.log('🎥 Requesting camera and microphone access...');
        
        // 1. Get local media first
        const stream = await navigator.mediaDevices.getUserMedia({
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

        console.log('✅ Media access granted');
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Create PeerJS instance
        const myPeerId = `${roomId}_${currentUser.id.slice(0, 8)}`;
        console.log('📡 Creating peer with ID:', myPeerId);
        
        const peerInstance = new Peer(myPeerId, {
          host: '0.peerjs.com',
          secure: true,
          port: 443,
          path: '/',
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ]
          }
        });

        peerInstance.on('open', (id) => {
          console.log('✅ Peer connected! ID:', id);
          setPeerId(id);
          toast({ 
            title: '✅ Ready to Call', 
            description: `Share your Peer ID to connect` 
          });
        });

        peerInstance.on('call', (call) => {
          console.log('📞 Receiving call from:', call.peer);
          
          // Answer the call with local stream
          const currentStream = screenStream || localStream;
          call.answer(currentStream!);
          currentCallRef.current = call;

          call.on('stream', (remoteStreamReceived) => {
            console.log('📹 Received remote stream');
            setRemoteStream(remoteStreamReceived);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamReceived;
            }
            setIsConnected(true);
            setIsConnecting(false);
            toast({ 
              title: '✅ Call Connected!', 
              description: 'You are now in a video call' 
            });
          });

          call.on('close', () => {
            console.log('☎️ Call closed');
            handleCallEnd();
          });

          call.on('error', (err) => {
            console.error('❌ Call error:', err);
            toast({ 
              title: 'Call Error', 
              description: err.message, 
              variant: 'destructive' 
            });
          });
        });

        peerInstance.on('disconnected', () => {
          console.log('🔌 Peer disconnected, reconnecting...');
          toast({ 
            title: 'Disconnected', 
            description: 'Trying to reconnect...' 
          });
          peerInstance.reconnect();
        });

        peerInstance.on('error', (err) => {
          console.error('❌ Peer error:', err);
          toast({ 
            title: 'Connection Error', 
            description: err.message, 
            variant: 'destructive' 
          });
        });

        setPeer(peerInstance);

        toast({ 
          title: '🎥 Camera & Microphone Ready', 
          description: 'Share your Peer ID to start calling' 
        });

      } catch (error: any) {
        console.error('❌ Error initializing:', error);
        const errorMsg = error.name === 'NotAllowedError' 
          ? 'Permission denied. Please allow camera/microphone access.'
          : error.name === 'NotFoundError'
          ? 'No camera/microphone found.'
          : 'Could not access media devices: ' + error.message;
        
        toast({
          title: 'Media Access Error',
          description: errorMsg,
          variant: 'destructive'
        });
      }
    };

    initPeer();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up video call...');
      localStream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
      currentCallRef.current?.close();
      peer?.destroy();
    };
  }, []);

  // Call a peer
  const callPeer = (targetPeerId: string) => {
    if (!peer || !localStream) {
      toast({ 
        title: 'Not Ready', 
        description: 'Please wait for initialization', 
        variant: 'destructive' 
      });
      return;
    }

    setIsConnecting(true);
    console.log('📞 Calling peer:', targetPeerId);

    const currentStream = screenStream || localStream;
    const call = peer.call(targetPeerId, currentStream);
    currentCallRef.current = call;

    call.on('stream', (remoteStreamReceived) => {
      console.log('📹 Received remote stream from call');
      setRemoteStream(remoteStreamReceived);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamReceived;
      }
      setIsConnected(true);
      setIsConnecting(false);
      toast({ 
        title: '✅ Call Connected!', 
        description: 'You are now in a video call' 
      });
    });

    call.on('close', () => {
      console.log('☎️ Call closed');
      handleCallEnd();
    });

    call.on('error', (err) => {
      console.error('❌ Call error:', err);
      setIsConnecting(false);
      toast({ 
        title: 'Call Failed', 
        description: 'Could not connect to peer', 
        variant: 'destructive' 
      });
    });
  };

  const handleCallEnd = () => {
    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const enabled = !isVideoOn;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      setIsVideoOn(enabled);
      console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const enabled = !isAudioOn;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      setIsAudioOn(enabled);
      console.log(`🎤 Audio ${enabled ? 'enabled' : 'disabled'}`);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      console.log('🖥️ Stopping screen share');
      screenStream?.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Switch back to camera
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Update call with camera stream
      if (currentCallRef.current && localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = currentCallRef.current.peerConnection
          ?.getSenders()
          .find((s: any) => s.track?.kind === 'video');
        
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }
    } else {
      // Start screen sharing
      try {
        console.log('🖥️ Starting screen share');
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
          } as any,
          audio: false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        // Show screen in local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Update call with screen stream
        if (currentCallRef.current) {
          const screenTrack = stream.getVideoTracks()[0];
          const sender = currentCallRef.current.peerConnection
            ?.getSenders()
            .find((s: any) => s.track?.kind === 'video');
          
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        // Handle screen share stop
        stream.getVideoTracks()[0].onended = () => {
          console.log('🖥️ Screen share ended');
          toggleScreenShare();
        };

        toast({ title: '🖥️ Screen Sharing', description: 'You are now sharing your screen' });
      } catch (error: any) {
        console.error('❌ Screen share error:', error);
        toast({
          title: 'Screen Share Error',
          description: error.message || 'Could not start screen sharing',
          variant: 'destructive'
        });
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

  const endCall = () => {
    console.log('📞 Ending call');
    localStream?.getTracks().forEach(track => track.stop());
    screenStream?.getTracks().forEach(track => track.stop());
    currentCallRef.current?.close();
    peer?.destroy();
    onClose();
    toast({ title: 'Call Ended' });
  };

  const handleConnectClick = () => {
    if (remotePeerId.trim()) {
      callPeer(remotePeerId.trim());
    } else {
      toast({ 
        title: 'Enter Peer ID', 
        description: 'Please enter the peer ID to connect', 
        variant: 'destructive' 
      });
    }
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
            <div className="text-xs opacity-60">
              {isConnected ? '● Connected' : isConnecting ? '● Connecting...' : '○ Waiting'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Connection Info */}
      {!isConnected && peerId && (
        <div 
          className="p-4 border-b"
          style={{ 
            backgroundColor: colors.accent,
            borderColor: colors.border 
          }}
        >
          <div className="max-w-2xl mx-auto space-y-3">
            <div>
              <label className="text-xs opacity-60 block mb-1">Your Peer ID (share this):</label>
              <div 
                className="p-2 rounded font-mono text-sm flex items-center justify-between gap-2"
                style={{ 
                  backgroundColor: colors.panel,
                  color: colors.primary 
                }}
              >
                <span className="truncate flex-1">{peerId}</span>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(peerId);
                    toast({ title: 'Copied!', description: 'Peer ID copied to clipboard' });
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-xs opacity-60 block mb-1">Enter Friend's Peer ID:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={remotePeerId}
                  onChange={(e) => setRemotePeerId(e.target.value)}
                  placeholder="Paste peer ID here..."
                  className="flex-1 p-2 rounded font-mono text-sm"
                  style={{ 
                    backgroundColor: colors.panel,
                    color: colors.foreground,
                    border: `1px solid ${colors.border}`
                  }}
                />
                <Button
                  onClick={handleConnectClick}
                  disabled={isConnecting || !remotePeerId.trim()}
                  style={{ 
                    backgroundColor: colors.primary,
                    color: colors.background 
                  }}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Video */}
        <div 
          className="relative rounded-lg overflow-hidden"
          style={{ backgroundColor: colors.panel }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div 
            className="absolute bottom-3 left-3 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: colors.foreground 
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            You ({currentUser.username})
            {isScreenSharing && <span className="text-xs">🖥️ Sharing</span>}
          </div>
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff className="w-16 h-16 opacity-50" />
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div 
          className="relative rounded-lg overflow-hidden"
          style={{ backgroundColor: colors.panel }}
        >
          {remoteStream ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div 
                className="absolute bottom-3 left-3 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
                style={{ 
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: colors.foreground 
                }}
              >
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Remote User
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center opacity-60">
                <Video className="w-16 h-16 mx-auto mb-2" />
                <p>Waiting for connection...</p>
                <p className="text-xs mt-2">Share your Peer ID or enter friend's ID above</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div 
        className="p-6 flex items-center justify-center gap-4 border-t"
        style={{ 
          backgroundColor: colors.panel,
          borderColor: colors.border 
        }}
      >
        <Button
          onClick={toggleAudio}
          size="lg"
          title={isAudioOn ? 'Mute' : 'Unmute'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ 
            backgroundColor: isAudioOn ? colors.accent : '#dc2626'
          }}
        >
          {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleVideo}
          size="lg"
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ 
            backgroundColor: isVideoOn ? colors.accent : '#dc2626'
          }}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleScreenShare}
          size="lg"
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          className="rounded-full w-14 h-14 transition-all"
          style={{ 
            backgroundColor: isScreenSharing ? '#3b82f6' : colors.accent
          }}
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
