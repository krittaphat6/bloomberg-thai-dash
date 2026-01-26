import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AuthScreen } from './AuthScreen';
import { FaceScanAuth } from './FaceScanAuth';
import { Loader2 } from 'lucide-react';

type AuthStep = 'loading' | 'login' | 'face-scan' | 'authenticated';
type FaceStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { user, loading, signOut } = useAuth();
  const [authStep, setAuthStep] = useState<AuthStep>('loading');
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('none');

  useEffect(() => {
    if (loading) {
      setAuthStep('loading');
      return;
    }

    if (!user) {
      setAuthStep('login');
      return;
    }

    // User is logged in, check face registration status
    checkFaceStatus();
  }, [user, loading]);

  // Subscribe to face registration updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('face-status-wrapper')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'face_registrations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newStatus = payload.new.status as FaceStatus;
          setFaceStatus(newStatus);
          
          if (newStatus === 'approved') {
            // User just got approved, show face scan for verification
            setAuthStep('face-scan');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkFaceStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('face_registrations')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFaceStatus(data.status as FaceStatus);
        
        if (data.status === 'approved') {
          // Check if this is first login after approval (need face scan)
          // For now, allow direct access after approval
          setAuthStep('authenticated');
        } else {
          // Pending or rejected - need to scan face
          setAuthStep('face-scan');
        }
      } else {
        // No face registration - need to register
        setFaceStatus('none');
        setAuthStep('face-scan');
      }
    } catch (error) {
      console.error('Error checking face status:', error);
      // On error, require face scan
      setAuthStep('face-scan');
    }
  };

  const handleFaceScanSuccess = () => {
    setAuthStep('authenticated');
  };

  const handleFaceScanCancel = async () => {
    await signOut();
    setAuthStep('login');
  };

  if (authStep === 'loading') {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-terminal-amber mx-auto" />
          <p className="text-muted-foreground font-mono">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (authStep === 'login') {
    return <AuthScreen />;
  }

  if (authStep === 'face-scan' && user) {
    return (
      <FaceScanAuth
        userId={user.id}
        userEmail={user.email || ''}
        onSuccess={handleFaceScanSuccess}
        onCancel={handleFaceScanCancel}
      />
    );
  }

  // Authenticated - render children
  return <>{children}</>;
};
