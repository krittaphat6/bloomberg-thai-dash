import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthScreen } from './AuthScreen';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-terminal-amber mx-auto" />
          <p className="text-muted-foreground font-mono">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // User is authenticated - render children directly (no face scan required)
  return <>{children}</>;
};
