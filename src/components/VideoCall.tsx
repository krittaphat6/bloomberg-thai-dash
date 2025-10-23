import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Monitor, MonitorOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
  roomId: string;
  currentUser: { id: string; username: string; color: string };
  onClose: () => void;
}

interface PeerConnection {
  pc: RTCPeerConnection;
  userId: string;
  username: string;
}

export const VideoCall = ({ roomId, currentUser, onClose }: VideoCallProps) => {
  const { toast } = useToast();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream; username: string }>>(new Map());
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const channelRef = useRef<any>(null);

  // Initialize local media
  useEffect(() => {
    const initMedia = async () => {
      try {
        console.log('🎥 Requesting camera and microphone access...');
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

        console.log('✅ Media access granted:', stream.getTracks().map(t => t.kind));
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        toast({ title: '✅ Ready', description: 'Camera & microphone connected' });
      } catch (error: any) {
        console.error('❌ Media access error:', error);
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

    initMedia();

    return () => {
      console.log('🧹 Cleaning up media streams...');
      localStream?.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      screenStream?.getTracks().forEach(track => track.stop());
      peers.forEach(({ pc }) => pc.close());
    };
  }, []);

  // WebRTC Signaling through Supabase
  useEffect(() => {
    if (!localStream) return;

    console.log('📡 Setting up signaling channel for room:', roomId);
    
    const channel = supabase.channel(`video-call:${roomId}`)
      .on('broadcast', { event: 'user-joined' }, async ({ payload }) => {
        if (payload.userId === currentUser.id) return;
        console.log('👋 User joined:', payload.username);
        await createPeerConnection(payload.userId, payload.username, true);
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        console.log('📨 Received offer from:', payload.from);
        await handleOffer(payload.from, payload.username, payload.offer);
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        console.log('📨 Received answer from:', payload.from);
        await handleAnswer(payload.from, payload.answer);
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        console.log('🧊 Received ICE candidate from:', payload.from);
        await handleIceCandidate(payload.from, payload.candidate);
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        console.log('👋 User left:', payload.userId);
        removePeer(payload.userId);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to video call channel');
          await channel.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: { userId: currentUser.id, username: currentUser.username }
          });
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Disconnecting from call...');
      channel.send({
        type: 'broadcast',
        event: 'user-left',
        payload: { userId: currentUser.id }
      });
      supabase.removeChannel(channel);
    };
  }, [localStream, roomId]);

  const createPeerConnection = async (remoteUserId: string, remoteUsername: string, initiator: boolean) => {
    if (!localStream) {
      console.error('❌ No local stream available');
      return;
    }

    console.log(`🔗 Creating peer connection with ${remoteUsername} (initiator: ${initiator})`);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ]
    });

    // Add local tracks
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
      console.log(`➕ Added ${track.kind} track to peer connection`);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to', remoteUsername);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: currentUser.id,
            to: remoteUserId,
            candidate: event.candidate
          }
        });
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`📹 Received ${event.track.kind} track from ${remoteUsername}`);
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => new Map(prev).set(remoteUserId, { stream: remoteStream, username: remoteUsername }));
      
      const videoEl = remoteVideosRef.current.get(remoteUserId);
      if (videoEl) {
        videoEl.srcObject = remoteStream;
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`🔌 Connection state with ${remoteUsername}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        removePeer(remoteUserId);
      }
    };

    setPeers(prev => new Map(prev).set(remoteUserId, { pc, userId: remoteUserId, username: remoteUsername }));

    // Create offer if initiator
    if (initiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        console.log('📤 Sending offer to', remoteUsername);
        
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            from: currentUser.id,
            to: remoteUserId,
            username: currentUser.username,
            offer: offer
          }
        });
      } catch (error) {
        console.error('❌ Error creating offer:', error);
      }
    }
  };

  const handleOffer = async (fromUserId: string, fromUsername: string, offer: RTCSessionDescriptionInit) => {
    let peer = peers.get(fromUserId);
    
    if (!peer) {
      await createPeerConnection(fromUserId, fromUsername, false);
      peer = peers.get(fromUserId);
    }

    if (!peer) {
      console.error('❌ Failed to create peer connection');
      return;
    }

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      
      console.log('📤 Sending answer to', fromUsername);
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          from: currentUser.id,
          to: fromUserId,
          answer: answer
        }
      });
    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  };

  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    const peer = peers.get(fromUserId);
    if (!peer) {
      console.error('❌ No peer connection found for answer');
      return;
    }

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Answer set successfully');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const peer = peers.get(fromUserId);
    if (!peer) {
      console.error('❌ No peer connection found for ICE candidate');
      return;
    }

    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  };

  const removePeer = (userId: string) => {
    const peer = peers.get(userId);
    if (peer) {
      console.log('🗑️ Removing peer:', peer.username);
      peer.pc.close();
      setPeers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
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

      // Replace tracks in all peer connections
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        peers.forEach(({ pc }) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    } else {
      // Start screen sharing
      try {
        console.log('🖥️ Starting screen share');
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          } as any,
          audio: false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        // Show screen in local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Replace video track in all peer connections
        const screenTrack = stream.getVideoTracks()[0];
        peers.forEach(({ pc }) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Handle screen share stop (when user clicks browser's stop button)
        screenTrack.onended = () => {
          console.log('🖥️ Screen share ended');
          setIsScreenSharing(false);
          setScreenStream(null);
          
          // Switch back to camera
          if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }

          // Replace tracks back to camera
          if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            peers.forEach(({ pc }) => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
              }
            });
          }
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
    peers.forEach(({ pc }) => pc.close());
    onClose();
    toast({ title: 'Call Ended', description: 'Video call has been terminated' });
  };

  return (
    <div 
      id="video-call-container"
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-gray-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-green-500" />
          <span className="text-white font-bold">Video Call</span>
          <span className="text-gray-400 text-sm">
            {remoteStreams.size} participant{remoteStreams.size !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-white"
        >
          <Maximize2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid gap-4" style={{
        gridTemplateColumns: remoteStreams.size === 0 ? '1fr' : remoteStreams.size === 1 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(300px, 1fr))'
      }}>
        {/* Local Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            You ({currentUser.username})
            {isScreenSharing && <span className="text-xs">🖥️ Sharing screen</span>}
          </div>
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff className="w-12 h-12 text-gray-500" />
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, { stream, username }]) => (
          <div key={userId} className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={(el) => {
                if (el) {
                  remoteVideosRef.current.set(userId, el);
                  el.srcObject = stream;
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {username}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6 flex items-center justify-center gap-4">
        <Button
          onClick={toggleAudio}
          size="lg"
          title={isAudioOn ? 'Mute' : 'Unmute'}
          className={`rounded-full w-14 h-14 transition-all ${isAudioOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleVideo}
          size="lg"
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          className={`rounded-full w-14 h-14 transition-all ${isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleScreenShare}
          size="lg"
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          className={`rounded-full w-14 h-14 transition-all ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
        </Button>

        <Button
          onClick={endCall}
          size="lg"
          title="End call"
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 transition-all"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};
