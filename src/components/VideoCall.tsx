import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2 } from 'lucide-react';
import Peer from 'simple-peer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
  roomId: string;
  currentUser: { id: string; username: string; color: string };
  onClose: () => void;
}

export const VideoCall = ({ roomId, currentUser, onClose }: VideoCallProps) => {
  const { toast } = useToast();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peers, setPeers] = useState<Map<string, Peer.Instance>>(new Map());
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize local media
  useEffect(() => {
    const initMedia = async () => {
      try {
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

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        toast({ title: 'Camera & Microphone Ready', description: 'Starting video call...' });
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast({
          title: 'Media Access Error',
          description: 'Could not access camera/microphone. Please check permissions.',
          variant: 'destructive'
        });
      }
    };

    initMedia();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peers.forEach(peer => peer.destroy());
    };
  }, []);

  // WebRTC Signaling through Supabase
  useEffect(() => {
    if (!localStream) return;

    const channel = supabase.channel(`video-call:${roomId}`)
      .on('broadcast', { event: 'user-joined' }, ({ payload }) => {
        if (payload.userId === currentUser.id) return;
        createPeer(payload.userId, true);
      })
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        handleOffer(payload.from, payload.signal);
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        handleAnswer(payload.from, payload.signal);
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        handleIceCandidate(payload.from, payload.candidate);
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        removePeer(payload.userId);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: { userId: currentUser.id, username: currentUser.username }
          });
        }
      });

    return () => {
      channel.send({
        type: 'broadcast',
        event: 'user-left',
        payload: { userId: currentUser.id }
      });
      supabase.removeChannel(channel);
    };
  }, [localStream, roomId]);

  const createPeer = (remoteUserId: string, initiator: boolean) => {
    if (!localStream) return;

    const peer = new Peer({
      initiator,
      trickle: true,
      stream: localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    peer.on('signal', async (signal) => {
      const event = initiator ? 'offer' : 'answer';
      await supabase.channel(`video-call:${roomId}`).send({
        type: 'broadcast',
        event,
        payload: {
          from: currentUser.id,
          to: remoteUserId,
          signal
        }
      });
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStreams(prev => new Map(prev).set(remoteUserId, remoteStream));
      const videoEl = remoteVideosRef.current.get(remoteUserId);
      if (videoEl) {
        videoEl.srcObject = remoteStream;
      }
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peer.on('close', () => {
      removePeer(remoteUserId);
    });

    setPeers(prev => new Map(prev).set(remoteUserId, peer));
  };

  const handleOffer = (fromUserId: string, signal: any) => {
    const peer = peers.get(fromUserId);
    if (peer) {
      peer.signal(signal);
    } else {
      createPeer(fromUserId, false);
      setTimeout(() => {
        const newPeer = peers.get(fromUserId);
        if (newPeer) newPeer.signal(signal);
      }, 100);
    }
  };

  const handleAnswer = (fromUserId: string, signal: any) => {
    const peer = peers.get(fromUserId);
    if (peer) {
      peer.signal(signal);
    }
  };

  const handleIceCandidate = (fromUserId: string, candidate: any) => {
    const peer = peers.get(fromUserId);
    if (peer) {
      peer.signal(candidate);
    }
  };

  const removePeer = (userId: string) => {
    const peer = peers.get(userId);
    if (peer) {
      peer.destroy();
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
    localStream?.getTracks().forEach(track => track.stop());
    peers.forEach(peer => peer.destroy());
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
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm">
            You ({currentUser.username})
          </div>
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
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
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm">
              User {userId.slice(0, 8)}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6 flex items-center justify-center gap-4">
        <Button
          onClick={toggleAudio}
          size="lg"
          className={`rounded-full w-14 h-14 ${isAudioOn ? 'bg-gray-700' : 'bg-red-600'}`}
        >
          {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleVideo}
          size="lg"
          className={`rounded-full w-14 h-14 ${isVideoOn ? 'bg-gray-700' : 'bg-red-600'}`}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={endCall}
          size="lg"
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};
