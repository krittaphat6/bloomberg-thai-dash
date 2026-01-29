import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Camera, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ShieldCheck,
  Clock,
  ScanFace,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import ableTerminalLogo from '@/assets/able-terminal-logo.png';
import { FaceImagePicker } from '@/components/face-scan/FaceImagePicker';

interface FaceScanAuthProps {
  userId: string;
  userEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type ScanStatus = 'idle' | 'camera-init' | 'scanning' | 'processing' | 'success' | 'failed';
type RegistrationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export const FaceScanAuth = ({ userId, userEmail, onSuccess, onCancel }: FaceScanAuthProps) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraErrorDetails, setCameraErrorDetails] = useState<string | null>(null);

  const isEmbedded = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check existing face registration
  useEffect(() => {
    checkRegistration();
  }, [userId]);

  // Subscribe to realtime updates for approval status
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`face-registration-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'face_registrations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newStatus = payload.new.status as RegistrationStatus;
          setRegistrationStatus(newStatus);
          if (newStatus === 'approved') {
            toast({
              title: 'ได้รับการอนุมัติแล้ว!',
              description: 'กรุณาสแกนใบหน้าเพื่อเข้าสู่ระบบ'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Admin emails that bypass face scan requirement
  const ADMIN_EMAILS = ['krittaphat6@hotmail.com', 'admin@ableterminal.com'];

  const checkRegistration = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    // ✅ Check if user is admin - auto-approve bypass
    if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      console.log('🔓 Admin detected, bypassing face scan:', userEmail);
      setIsLoading(false);
      onSuccess(); // Directly grant access
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('face_registrations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking registration:', error);
        // On error, assume no registration
        setRegistrationStatus('none');
      } else if (data) {
        setRegistrationStatus(data.status as RegistrationStatus);
      } else {
        setRegistrationStatus('none');
      }
    } catch (error) {
      console.error('Error checking registration:', error);
      setRegistrationStatus('none');
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    setStatus('camera-init');
    setErrorMessage(null);
    setCameraErrorDetails(null);

    // stop any prior stream
    stopCamera();
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('CAMERA_UNSUPPORTED');
      }

      // Some browsers/embedded iframes can stall on permission prompts; fail fast.
      const stream = (await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), 10000)
        )
      ])) as MediaStream;

      streamRef.current = stream;
      const videoEl = videoRef.current;
      if (!videoEl) {
        throw new Error('CAMERA_ELEMENT_MISSING');
      }

      videoEl.srcObject = stream;
      // Don't await play() — it can hang in some environments. Transition UI immediately.
      videoEl.play().catch(() => {
        // ignore; user can still grant permission / browser may block autoplay
      });
      setStatus('scanning');
    } catch (error: any) {
      console.error('Camera error:', error);
      setStatus('failed');

      const name = error?.name as string | undefined;
      const message = String(error?.message || '');
      setCameraErrorDetails([name, message].filter(Boolean).join(': '));
      const isTimeout = message.includes('CAMERA_TIMEOUT');
      const isUnsupported = message.includes('CAMERA_UNSUPPORTED');
      const isPermission = name === 'NotAllowedError' || name === 'SecurityError';
      const isNoDevice = name === 'NotFoundError' || name === 'OverconstrainedError';

      if (isUnsupported) {
        setErrorMessage('อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');
      } else if (isNoDevice) {
        setErrorMessage('ไม่พบกล้องในอุปกรณ์นี้');
      } else if (isTimeout) {
        setErrorMessage(
          isEmbedded
            ? 'การเปิดกล้องค้างในหน้าพรีวิว — กรุณาเปิดในแท็บใหม่แล้วลองอีกครั้ง'
            : 'การเปิดกล้องใช้เวลานานเกินไป กรุณาลองใหม่'
        );
      } else if (isPermission) {
        setErrorMessage('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง');
      } else {
        setErrorMessage('ไม่สามารถเข้าถึงกล้องได้ กรุณาลองใหม่');
      }
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    if (!video.videoWidth || !video.videoHeight) {
      stopCamera();
      setStatus('failed');
      setErrorMessage(
        isEmbedded
          ? 'ยังไม่สามารถเริ่มภาพจากกล้องในหน้าพรีวิวได้ — กรุณาเปิดในแท็บใหม่แล้วลองอีกครั้ง'
          : 'กล้องยังไม่พร้อม กรุณาลองใหม่'
      );
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Flip horizontally for mirror effect
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();
    setStatus('processing');
    
    // Process the face
    await processFace(imageData);
  }, [stopCamera, isEmbedded]);

  const processFace = async (imageData: string) => {
    try {
      if (registrationStatus === 'none' || registrationStatus === 'rejected') {
        // Register new face
        const { error } = await supabase
          .from('face_registrations')
          .upsert({
            user_id: userId,
            face_image_url: imageData,
            face_encoding: imageData.substring(0, 500), // Simplified encoding
            status: 'pending',
            registered_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) throw error;
        
        setRegistrationStatus('pending');
        setStatus('success');
        toast({
          title: 'ลงทะเบียนใบหน้าสำเร็จ!',
          description: 'กรุณารอการอนุมัติจากผู้ดูแลระบบ'
        });
      } else if (registrationStatus === 'approved') {
        // Verify face (simplified - in production use proper face comparison)
        setStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Face processing error:', error);
      setStatus('failed');
      setErrorMessage(error.message || 'เกิดข้อผิดพลาดในการประมวลผลใบหน้า');
    }
  };

  const retryCapture = () => {
    setCapturedImage(null);
    setStatus('idle');
    setErrorMessage(null);
    setCameraErrorDetails(null);
  };

  const handleImageData = async (imageData: string) => {
    setCapturedImage(imageData);
    stopCamera();
    setStatus('processing');
    await processFace(imageData);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-terminal-amber mx-auto" />
          <p className="text-muted-foreground font-mono">กำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    );
  }

  // Waiting for approval screen
  if (registrationStatus === 'pending') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4 bg-card/80 backdrop-blur-md border-terminal-amber/20 shadow-2xl">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-terminal-amber/30">
                <img src={ableTerminalLogo} alt="ABLE" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-terminal-amber/10 border-2 border-terminal-amber/30 flex items-center justify-center animate-pulse">
                  <Clock className="h-10 w-10 text-terminal-amber" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-terminal-amber font-mono">รอการอนุมัติ</h3>
              <p className="text-sm text-muted-foreground">
                บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
              </p>
              <p className="text-xs text-muted-foreground/70">
                {userEmail}
              </p>
            </div>

            <div className="bg-terminal-amber/5 border border-terminal-amber/20 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-terminal-amber shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-terminal-amber">ความปลอดภัยสูงสุด</p>
                  <p className="text-xs text-muted-foreground">
                    เพื่อความปลอดภัย ทุกบัญชีต้องได้รับการอนุมัติจากผู้ดูแลระบบก่อนเข้าใช้งาน
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full font-mono border-terminal-amber/30 text-terminal-amber hover:bg-terminal-amber/10"
            >
              ออกจากระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-card/80 backdrop-blur-md border-terminal-amber/20 shadow-2xl overflow-hidden">
        <CardContent className="pt-6 pb-6 space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-terminal-amber/30">
                <img src={ableTerminalLogo} alt="ABLE" className="w-full h-full object-cover" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-terminal-amber font-mono">
              {registrationStatus === 'none' || registrationStatus === 'rejected' 
                ? 'ลงทะเบียนใบหน้า' 
                : 'ยืนยันตัวตน'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {registrationStatus === 'none' || registrationStatus === 'rejected'
                ? 'สแกนใบหน้าเพื่อลงทะเบียนเข้าใช้งาน'
                : 'สแกนใบหน้าเพื่อเข้าสู่ระบบ'}
            </p>
          </div>

          {/* Camera View */}
          <div className="relative aspect-[4/3] bg-black/50 rounded-xl overflow-hidden border border-terminal-amber/20">
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-terminal-amber/40 flex items-center justify-center">
                  <ScanFace className="h-12 w-12 text-terminal-amber/60" />
                </div>
                <p className="text-sm text-muted-foreground font-mono">กดปุ่มด้านล่างเพื่อเริ่ม</p>
              </div>
            )}

            {status === 'camera-init' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-terminal-amber" />
              </div>
            )}

            {(status === 'scanning' || status === 'processing') && !capturedImage && (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-56 border-2 border-terminal-amber/50 rounded-[50%] animate-pulse" />
                </div>
                {/* Scanning indicator */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 bg-black/50 rounded-lg py-2 px-3">
                  <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
                  <span className="text-xs text-terminal-green font-mono">กำลังสแกน...</span>
                </div>
              </>
            )}

            {capturedImage && (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            )}

            {status === 'processing' && capturedImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-10 w-10 animate-spin text-terminal-amber mx-auto" />
                  <p className="text-sm text-white font-mono">กำลังประมวลผล...</p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="absolute inset-0 bg-terminal-green/20 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <CheckCircle className="h-16 w-16 text-terminal-green mx-auto" />
                  <p className="text-lg text-terminal-green font-mono font-bold">สำเร็จ!</p>
                </div>
              </div>
            )}

            {status === 'failed' && (
              <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                <div className="text-center space-y-2 px-4">
                  <XCircle className="h-12 w-12 text-destructive mx-auto" />
                  <p className="text-sm text-destructive font-mono">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error message */}
          {errorMessage && status === 'failed' && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-destructive">{errorMessage}</p>
                {cameraErrorDetails && (
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono break-words">
                    {cameraErrorDetails}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <div className="flex gap-3">
            {status === 'idle' && (
              <>
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1 font-mono border-muted-foreground/30"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={startCamera}
                  className="flex-1 bg-terminal-amber hover:bg-terminal-amber/90 text-black font-mono font-semibold"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  เปิดกล้อง
                </Button>
              </>
            )}

            {status === 'scanning' && (
              <>
                <Button
                  onClick={() => {
                    stopCamera();
                    setStatus('idle');
                  }}
                  variant="outline"
                  className="flex-1 font-mono border-muted-foreground/30"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="flex-1 bg-terminal-green hover:bg-terminal-green/90 text-black font-mono font-semibold"
                >
                  <ScanFace className="h-4 w-4 mr-2" />
                  ถ่ายภาพ
                </Button>
              </>
            )}

            {status === 'failed' && (
              <>
                {isEmbedded && (
                  <Button
                    onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                    variant="outline"
                    className="flex-1 font-mono border-terminal-amber/30 text-terminal-amber hover:bg-terminal-amber/10"
                  >
                    เปิดในแท็บใหม่
                  </Button>
                )}
                <Button
                  onClick={retryCapture}
                  className={`${isEmbedded ? 'flex-1' : 'w-full'} bg-terminal-amber hover:bg-terminal-amber/90 text-black font-mono font-semibold`}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  ลองใหม่
                </Button>
              </>
            )}

            {status === 'success' && (
              <Button
                onClick={registrationStatus === 'approved' ? onSuccess : onCancel}
                variant="outline"
                className="w-full font-mono border-terminal-amber/30 text-terminal-amber"
              >
                {registrationStatus === 'approved' ? 'เข้าสู่ระบบ' : 'เข้าใจแล้ว'}
              </Button>
            )}
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
};
