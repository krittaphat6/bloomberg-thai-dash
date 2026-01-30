import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Users, Target } from 'lucide-react';
import { TacticalCommandMap } from '@/components/TacticalMap';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAILS = ['krittaphat6@hotmail.com', 'admin@ableterminal.com'];

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(ADMIN_EMAILS.includes(data?.email || user.email || ''));
      setIsLoading(false);
    };

    checkAdmin();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-terminal-amber animate-pulse font-mono">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-mono text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">เฉพาะผู้ดูแลระบบเท่านั้น</p>
          <Button onClick={() => navigate('/')} variant="outline" className="font-mono">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-terminal-amber/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-terminal-amber hover:bg-terminal-amber/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-terminal-amber" />
              <h1 className="text-xl font-mono font-bold text-terminal-amber">TACTICAL COMMAND CENTER</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <Users className="h-4 w-4" />
            {user?.email}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="h-[calc(100vh-73px)]">
        <TacticalCommandMap />
      </main>
    </div>
  );
};

export default Admin;