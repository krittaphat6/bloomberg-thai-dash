import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Send, Users, Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  user_id: string;
  username: string;
  color: string;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  color: string;
}

// Generate persistent user ID
const getUserId = (): string => {
  let userId = localStorage.getItem('chat-user-id');
  if (!userId) {
    userId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chat-user-id', userId);
  }
  return userId;
};

// Generate color from user ID
const generateColor = (id: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Generate username from user ID
const generateUsername = (id: string): string => {
  const adjectives = ['Swift', 'Bold', 'Smart', 'Bright', 'Cool', 'Wise', 'Quick', 'Sharp'];
  const nouns = ['Trader', 'Investor', 'Analyst', 'Bull', 'Bear', 'Wolf', 'Hawk', 'Eagle'];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const adj = adjectives[Math.abs(hash) % adjectives.length];
  const noun = nouns[Math.abs(hash >> 4) % nouns.length];
  const num = (Math.abs(hash) % 999).toString().padStart(3, '0');
  
  return `${adj}${noun}${num}`;
};

// Format timestamp
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const LiveChatReal = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize user
  useEffect(() => {
    const userId = getUserId();
    const savedUsername = localStorage.getItem('chat-username') || generateUsername(userId);
    const userColor = generateColor(userId);
    
    setCurrentUser({
      id: userId,
      username: savedUsername,
      color: userColor
    });
    
    localStorage.setItem('chat-username', savedUsername);
  }, []);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);
        
        if (error) throw error;
        
        if (data) {
          setMessages(data);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages. Please refresh.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
        setIsConnecting(false);
      }
    };

    loadMessages();
  }, [toast]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Count online users
  useEffect(() => {
    const countOnline = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('messages')
          .select('user_id')
          .gte('created_at', fiveMinutesAgo);
        
        if (error) throw error;
        
        if (data) {
          const uniqueUsers = new Set(data.map(m => m.user_id));
          setOnlineCount(uniqueUsers.size);
        }
      } catch (error) {
        console.error('Error counting users:', error);
      }
    };
    
    countOnline();
    const interval = setInterval(countOnline, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    if (newMessage.length > 500) {
      toast({
        title: 'Message too long',
        description: 'Maximum 500 characters allowed',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          user_id: currentUser.id,
          username: currentUser.username,
          color: currentUser.color
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Update username
  const handleUpdateUsername = () => {
    if (!newUsername.trim() || !currentUser) return;

    const updated = {
      ...currentUser,
      username: newUsername.trim()
    };

    setCurrentUser(updated);
    localStorage.setItem('chat-username', newUsername.trim());
    setShowSettings(false);
    setNewUsername('');

    toast({
      title: 'Username updated',
      description: `Your username is now: ${newUsername.trim()}`
    });
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isConnecting) {
    return (
      <Card className="h-full bg-[#0a0a0a] border-[#00ff00]/20">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#00ff00]" />
            <p className="text-[#00ff00] font-mono">Connecting to chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-[#0a0a0a] border-[#00ff00]/20">
      <CardHeader className="border-b border-[#00ff00]/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#00ff00] font-mono flex items-center gap-2">
            💬 LIVE CHAT
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#00ff00] text-[#00ff00] font-mono">
              <Users className="h-3 w-3 mr-1" />
              {onlineCount} online
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setShowSettings(true);
                setNewUsername(currentUser?.username || '');
              }}
              className="text-[#00ff00] hover:bg-[#00ff00]/10"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {currentUser && (
          <p className="text-xs font-mono text-[#00ff00]/60">
            You are: <span style={{ color: currentUser.color }}>{currentUser.username}</span>
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 && !isLoading && (
              <p className="text-center text-[#00ff00]/50 font-mono text-sm py-8">
                No messages yet. Be the first to say something!
              </p>
            )}
            
            {messages.map((msg) => {
              const isCurrentUser = msg.user_id === currentUser?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className="font-mono text-sm font-bold"
                      style={{ color: msg.color }}
                    >
                      {msg.username}
                    </span>
                    <span className="text-[#00ff00]/40 text-xs font-mono">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[80%] ${
                      isCurrentUser
                        ? 'bg-[#00ff00]/10 border border-[#00ff00]/30'
                        : 'bg-[#1a1a1a] border border-[#00ff00]/10'
                    }`}
                  >
                    <p className="text-[#00ff00] font-mono text-sm break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-[#00ff00]/20 p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message... (max 500 chars)"
              className="flex-1 bg-[#1a1a1a] border-[#00ff00]/30 text-[#00ff00] font-mono placeholder:text-[#00ff00]/40 focus-visible:ring-[#00ff00]"
              maxLength={500}
              disabled={!currentUser}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !currentUser}
              className="bg-[#00ff00] text-black hover:bg-[#00ff00]/90 font-mono"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-[#00ff00]/40 font-mono mt-2">
            {newMessage.length}/500 characters
          </p>
        </div>
      </CardContent>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#0a0a0a] border-[#00ff00]/20">
          <DialogHeader>
            <DialogTitle className="text-[#00ff00] font-mono">Settings</DialogTitle>
            <DialogDescription className="text-[#00ff00]/60 font-mono">
              Update your username
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#00ff00] font-mono">
                Username
              </Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                className="bg-[#1a1a1a] border-[#00ff00]/30 text-[#00ff00] font-mono"
                maxLength={30}
              />
            </div>
            {currentUser && (
              <div className="space-y-2">
                <Label className="text-[#00ff00] font-mono">Your Color</Label>
                <div
                  className="h-10 rounded border border-[#00ff00]/30"
                  style={{ backgroundColor: currentUser.color }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateUsername}
              disabled={!newUsername.trim()}
              className="bg-[#00ff00] text-black hover:bg-[#00ff00]/90 font-mono"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LiveChatReal;
