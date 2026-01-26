import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  Shield,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FaceRegistration {
  id: string;
  user_id: string;
  face_image_url: string | null;
  status: string;
  registered_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  user_email?: string;
  username?: string;
}

export const FaceApprovalPanel = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<FaceRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchRegistrations();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('face-registrations-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'face_registrations'
        },
        () => {
          fetchRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    // Check if user is admin based on email
    const adminEmails = ['krittaphat6@hotmail.com', 'admin@ableterminal.com'];
    const { data } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();
    
    setIsAdmin(adminEmails.includes(data?.email || user.email || ''));
  };

  const fetchRegistrations = async () => {
    try {
      // First get all face registrations
      const { data: faceData, error: faceError } = await supabase
        .from('face_registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (faceError) throw faceError;

      // Then get user info from the users table
      if (faceData && faceData.length > 0) {
        const userIds = faceData.map(r => r.user_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', userIds);

        const enrichedData = faceData.map(registration => {
          const userInfo = usersData?.find(u => u.id === registration.user_id);
          return {
            ...registration,
            username: userInfo?.username || 'Unknown',
            user_email: userInfo?.email || 'Unknown'
          };
        });

        setRegistrations(enrichedData);
      } else {
        setRegistrations([]);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (registration: FaceRegistration) => {
    if (!user) return;
    setProcessing(registration.id);
    
    try {
      const { error } = await supabase
        .from('face_registrations')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: 'อนุมัติสำเร็จ',
        description: `อนุมัติผู้ใช้ ${registration.username || registration.user_email} แล้ว`
      });
      
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (registration: FaceRegistration) => {
    if (!user) return;
    setProcessing(registration.id);
    
    try {
      const { error } = await supabase
        .from('face_registrations')
        .update({
          status: 'rejected',
          rejection_reason: 'ไม่ผ่านการตรวจสอบ'
        })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: 'ปฏิเสธแล้ว',
        description: `ปฏิเสธผู้ใช้ ${registration.username || registration.user_email} แล้ว`,
        variant: 'destructive'
      });
      
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-terminal-amber text-terminal-amber"><Clock className="h-3 w-3 mr-1" /> รอดำเนินการ</Badge>;
      case 'approved':
        return <Badge className="bg-terminal-green/20 text-terminal-green border-terminal-green"><CheckCircle className="h-3 w-3 mr-1" /> อนุมัติแล้ว</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> ปฏิเสธ</Badge>;
      default:
        return null;
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-card/50 border-muted">
        <CardContent className="pt-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">เฉพาะผู้ดูแลระบบเท่านั้น</p>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  return (
    <Card className="bg-card/50 border-terminal-amber/20 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2 text-terminal-amber">
            <UserCheck className="h-5 w-5" />
            อนุมัติผู้ใช้งาน
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-terminal-amber text-terminal-amber">
                {pendingCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRegistrations}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-terminal-amber" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-mono">ไม่มีคำขอใหม่</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-3">
              {registrations.map((registration) => (
                <div
                  key={registration.id}
                  className={`p-4 rounded-lg border ${
                    registration.status === 'pending'
                      ? 'border-terminal-amber/30 bg-terminal-amber/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Face Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {registration.face_image_url ? (
                        <img
                          src={registration.face_image_url}
                          alt="Face"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <UserCheck className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="font-mono font-medium truncate">
                            {registration.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {registration.user_email}
                          </p>
                        </div>
                        {getStatusBadge(registration.status)}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        ลงทะเบียน: {new Date(registration.registered_at).toLocaleString('th-TH')}
                      </p>
                      
                      {registration.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(registration)}
                            disabled={processing === registration.id}
                            className="bg-terminal-green hover:bg-terminal-green/90 text-black text-xs"
                          >
                            {processing === registration.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                อนุมัติ
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(registration)}
                            disabled={processing === registration.id}
                            className="text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            ปฏิเสธ
                          </Button>
                        </div>
                      )}
                      
                      {registration.status === 'approved' && registration.approved_at && (
                        <p className="text-xs text-terminal-green">
                          อนุมัติเมื่อ: {new Date(registration.approved_at).toLocaleString('th-TH')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
