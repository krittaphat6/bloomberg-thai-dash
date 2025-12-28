import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { User, Friendship, ChatRoom, Message, Webhook as WebhookType, FriendNickname } from '@/types/chat';
import { 
  UserPlus, Users, Settings, Paperclip, Image as ImageIcon, Send, 
  ArrowLeft, Search, Phone, Menu, Camera, Mic, Smile, Plus,
  Webhook, Trash2, Loader2, ChevronRight, MessageCircle
} from 'lucide-react';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { getThemeColors } from '@/utils/themeColors';
import { useAuth } from '@/contexts/AuthContext';

interface MobileMessengerProps {
  onBack?: () => void;
}

const MobileMessenger: React.FC<MobileMessengerProps> = ({ onBack }) => {
  const { user: authUser } = useAuth();
  const currentTheme = useCurrentTheme();
  const colors = getThemeColors(currentTheme);
  
  // View state: 'list' or 'chat'
  const [view, setView] = useState<'list' | 'chat'>('list');
  
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  
  // Friends & Rooms
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomNames, setRoomNames] = useState<{ [key: string]: string }>({});
  const [roomLastMessages, setRoomLastMessages] = useState<{ [key: string]: { content: string; time: string; unread?: number } }>({});
  
  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateWebhookRoom, setShowCreateWebhookRoom] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [webhookRoomName, setWebhookRoomName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Nicknames
  const [nicknames, setNicknames] = useState<{ [key: string]: string }>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Initialize user
  useEffect(() => {
    if (authUser) {
      initializeUser();
    }
  }, [authUser]);

  const initializeUser = async () => {
    if (!authUser) return;
    
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (existingUser) {
        setCurrentUser(existingUser as User);
      } else {
        const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            username: authUser.email?.split('@')[0] || 'User',
            color: randomColor,
            email: authUser.email,
            status: 'online'
          })
          .select()
          .single();

        if (createError) throw createError;
        setCurrentUser(newUser as User);
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing user:', error);
      setIsInitialized(true);
    }
  };

  // Load friends, rooms, nicknames
  useEffect(() => {
    if (!currentUser) return;
    loadFriends();
    loadRooms();
    loadNicknames();
  }, [currentUser]);

  const loadFriends = async () => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:users!friendships_friend_id_fkey(*)
      `)
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    
    if (data) {
      setFriends(data as Friendship[]);
    }
  };

  const loadRooms = async () => {
    if (!currentUser) return;
    
    const { data: memberRooms, error } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('user_id', currentUser.id);

    if (memberRooms) {
      const roomIds = memberRooms.map(m => m.room_id);
      
      const { data: roomsData } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds);

      if (roomsData) {
        setRooms(roomsData as ChatRoom[]);
        
        // Get last messages for each room
        for (const room of roomsData) {
          fetchRoomName(room as ChatRoom);
          fetchLastMessage(room.id);
        }
      }
    }
  };

  const fetchLastMessage = async (roomId: string) => {
    const { data: messages } = await supabase
      .from('messages')
      .select('content, created_at, message_type')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (messages && messages.length > 0) {
      const msg = messages[0];
      const time = new Date(msg.created_at || '');
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60 * 24));
      
      let timeStr = '';
      if (diffDays === 0) {
        timeStr = time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        timeStr = 'เมื่อวาน';
      } else if (diffDays < 7) {
        const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        timeStr = 'วัน' + days[time.getDay()];
      } else {
        timeStr = time.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
      }

      let content = msg.content || '';
      if (msg.message_type === 'image') {
        content = '📷 ส่งรูปภาพ';
      } else if (msg.message_type === 'file') {
        content = '📎 ส่งไฟล์';
      } else if (msg.message_type === 'webhook') {
        content = '🔗 Webhook Alert';
      }

      setRoomLastMessages(prev => ({
        ...prev,
        [roomId]: { content, time: timeStr }
      }));
    }
  };

  const loadNicknames = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('friend_nicknames')
      .select('*')
      .eq('user_id', currentUser.id);
    
    if (data) {
      const map: { [key: string]: string } = {};
      data.forEach((n: FriendNickname) => { map[n.friend_id] = n.nickname; });
      setNicknames(map);
    }
  };

  const fetchRoomName = async (room: ChatRoom) => {
    if (room.type === 'private') {
      const { data: members } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', room.id);
      
      if (members) {
        const otherMemberId = members.find(m => m.user_id !== currentUser?.id)?.user_id;
        if (otherMemberId) {
          const { data: otherUser } = await supabase
            .from('users')
            .select('username')
            .eq('id', otherMemberId)
            .single();
          
          if (otherUser) {
            setRoomNames(prev => ({ ...prev, [room.id]: nicknames[otherMemberId] || otherUser.username }));
          }
        }
      }
    } else {
      setRoomNames(prev => ({ ...prev, [room.id]: room.name || 'Group' }));
    }
  };

  const getDisplayName = (userId: string, username: string) => {
    return nicknames[userId] || username;
  };

  // Load messages when room changes
  useEffect(() => {
    if (currentRoomId) {
      loadMessages();
      subscribeToMessages();
    }
  }, [currentRoomId]);

  const loadMessages = async () => {
    if (!currentRoomId) return;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', currentRoomId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
      setTimeout(scrollToBottom, 100);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`room-${currentRoomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentRoomId || !currentUser) return;
    
    setIsSending(true);
    
    try {
      const { error } = await supabase.from('messages').insert({
        room_id: currentRoomId,
        user_id: currentUser.id,
        username: currentUser.username,
        color: currentUser.color,
        content: newMessage.trim(),
        message_type: 'text'
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'file' | 'image') => {
    if (!currentRoomId || !currentUser) return;
    
    setIsUploading(true);
    
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      const { error: msgError } = await supabase.from('messages').insert({
        room_id: currentRoomId,
        user_id: currentUser.id,
        username: currentUser.username,
        color: currentUser.color,
        message_type: type,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type
      });

      if (msgError) throw msgError;
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!friendUsername.trim() || !currentUser) return;
    
    try {
      const { data: friendUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', friendUsername.trim())
        .maybeSingle();

      if (!friendUser) {
        toast({ title: 'User not found', variant: 'destructive' });
        return;
      }

      if (friendUser.id === currentUser.id) {
        toast({ title: 'Cannot add yourself', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('friendships').insert({
        user_id: currentUser.id,
        friend_id: friendUser.id,
        status: 'accepted'
      });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already friends!', variant: 'destructive' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Friend added!' });
        setShowAddFriend(false);
        setFriendUsername('');
        loadFriends();
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      toast({ title: 'Error adding friend', variant: 'destructive' });
    }
  };

  const startPrivateChat = async (friendId: string, friendName: string) => {
    if (!currentUser) return;
    
    // Check existing room
    const { data: existingRooms } = await supabase
      .from('chat_rooms')
      .select('*, room_members(*)')
      .eq('type', 'private');

    const existingRoom = existingRooms?.find(room => {
      const members = room.room_members || [];
      const memberIds = members.map((m: any) => m.user_id);
      return memberIds.includes(currentUser.id) && memberIds.includes(friendId) && memberIds.length === 2;
    });

    if (existingRoom) {
      setCurrentRoomId(existingRoom.id);
      setView('chat');
      return;
    }

    // Create new room
    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({ type: 'private', created_by: currentUser.id })
      .select()
      .single();

    if (roomError || !newRoom) {
      toast({ title: 'Error creating chat', variant: 'destructive' });
      return;
    }

    await supabase.from('room_members').insert([
      { room_id: newRoom.id, user_id: currentUser.id },
      { room_id: newRoom.id, user_id: friendId }
    ]);

    setRoomNames(prev => ({ ...prev, [newRoom.id]: nicknames[friendId] || friendName }));
    await loadRooms();
    setCurrentRoomId(newRoom.id);
    setView('chat');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) return;
    
    try {
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'group',
          name: groupName.trim(),
          created_by: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('room_members').insert({
        room_id: newRoom.id,
        user_id: currentUser.id
      });

      toast({ title: 'Group created!' });
      setShowCreateGroup(false);
      setGroupName('');
      loadRooms();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ title: 'Error creating group', variant: 'destructive' });
    }
  };

  const handleCreateWebhookRoom = async () => {
    if (!webhookRoomName.trim() || !currentUser) return;
    
    try {
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'webhook',
          name: webhookRoomName.trim(),
          created_by: currentUser.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      await supabase.from('room_members').insert({
        room_id: newRoom.id,
        user_id: currentUser.id
      });

      // Create webhook
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tradingview-webhook`;
      const webhookSecret = crypto.randomUUID();

      await supabase.from('webhooks').insert({
        room_id: newRoom.id,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        created_by: currentUser.id
      });

      toast({ title: 'Webhook room created!' });
      setShowCreateWebhookRoom(false);
      setWebhookRoomName('');
      loadRooms();
    } catch (error) {
      console.error('Error creating webhook room:', error);
      toast({ title: 'Error creating room', variant: 'destructive' });
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const currentRoom = rooms.find(r => r.id === currentRoomId);

  // Filter rooms based on search
  const filteredRooms = rooms.filter(room => {
    const name = roomNames[room.id] || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // CHAT LIST VIEW
  if (view === 'list') {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">แชท</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="p-2 hover:bg-muted rounded-full"
              onClick={() => setShowAddFriend(true)}
            >
              <UserPlus className="w-5 h-5 text-foreground" />
            </button>
            <button 
              className="p-2 hover:bg-muted rounded-full"
              onClick={() => setShowCreateGroup(true)}
            >
              <Users className="w-5 h-5 text-foreground" />
            </button>
            <button 
              className="p-2 hover:bg-muted rounded-full relative"
              onClick={() => setShowCreateWebhookRoom(true)}
            >
              <Webhook className="w-5 h-5 text-foreground" />
            </button>
            <button 
              className="p-2 hover:bg-muted rounded-full"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา"
              className="pl-9 bg-muted border-none rounded-lg h-9"
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1 min-h-0">
          {/* Friends Section */}
          {friends.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium">เพื่อน ({friends.length})</p>
              {friends.map(friendship => {
                const friendId = friendship.friend_id === currentUser?.id ? friendship.user_id : friendship.friend_id;
                const friend = friendship.friend;
                const displayName = getDisplayName(friendId, friend?.username || 'Unknown');
                
                return (
                  <div
                    key={friendship.id}
                    className="flex items-center gap-3 py-3 active:bg-muted/50 rounded-lg"
                    onClick={() => startPrivateChat(friendId, displayName)}
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 relative"
                      style={{ backgroundColor: friend?.color || 'hsl(var(--primary))' }}
                    >
                      {friend?.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        displayName[0]?.toUpperCase()
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-sm text-muted-foreground">Online</p>
                    </div>
                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Rooms Section */}
          <div className="px-4 py-2">
            {friends.length > 0 && <div className="h-px bg-border my-2" />}
            <p className="text-xs text-muted-foreground mb-2 font-medium">ห้องแชท ({filteredRooms.length})</p>
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ยังไม่มีห้องแชท</p>
                <p className="text-xs">กดปุ่มด้านบนเพื่อเริ่มสนทนา</p>
              </div>
            ) : (
              filteredRooms.map(room => {
                const lastMsg = roomLastMessages[room.id];
                const roomName = roomNames[room.id] || 'Loading...';
                
                return (
                  <div
                    key={room.id}
                    className="flex items-center gap-3 py-3 active:bg-muted/50 rounded-lg"
                    onClick={() => {
                      setCurrentRoomId(room.id);
                      setView('chat');
                    }}
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ 
                        backgroundColor: room.type === 'webhook' 
                          ? 'hsl(210, 100%, 50%)' 
                          : room.type === 'group' 
                            ? 'hsl(280, 60%, 50%)' 
                            : 'hsl(var(--primary))' 
                      }}
                    >
                      {room.type === 'webhook' ? '🔗' : room.type === 'group' ? '👥' : roomName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground truncate flex items-center gap-1">
                          {roomName}
                          {room.type === 'webhook' && <span className="text-xs">🔔</span>}
                        </p>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {lastMsg?.time || ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {lastMsg?.content || (room.type === 'webhook' ? 'Webhook Room' : 'เริ่มสนทนา...')}
                        </p>
                        {lastMsg?.unread && lastMsg.unread > 0 && (
                          <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                            {lastMsg.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Dialogs */}
        {/* Add Friend Dialog */}
        <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader>
              <DialogTitle>เพิ่มเพื่อน</DialogTitle>
              <DialogDescription>ใส่ username ของเพื่อน</DialogDescription>
            </DialogHeader>
            <Input
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
              placeholder="Username..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddFriend(false)}>ยกเลิก</Button>
              <Button onClick={handleAddFriend}>เพิ่มเพื่อน</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader>
              <DialogTitle>สร้างกลุ่ม</DialogTitle>
              <DialogDescription>ตั้งชื่อกลุ่มของคุณ</DialogDescription>
            </DialogHeader>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
              placeholder="ชื่อกลุ่ม..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateGroup(false)}>ยกเลิก</Button>
              <Button onClick={handleCreateGroup}>สร้างกลุ่ม</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Webhook Room Dialog */}
        <Dialog open={showCreateWebhookRoom} onOpenChange={setShowCreateWebhookRoom}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader>
              <DialogTitle>🔗 สร้าง Webhook Room</DialogTitle>
              <DialogDescription>รับ alerts จาก TradingView</DialogDescription>
            </DialogHeader>
            <Input
              value={webhookRoomName}
              onChange={(e) => setWebhookRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateWebhookRoom()}
              placeholder="ชื่อห้อง..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateWebhookRoom(false)}>ยกเลิก</Button>
              <Button onClick={handleCreateWebhookRoom}>สร้างห้อง</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader>
              <DialogTitle>ตั้งค่า</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: currentUser?.color }}
                >
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    currentUser?.username[0]?.toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-bold">{currentUser?.username}</p>
                  <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                </div>
              </div>
              <Input
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="เปลี่ยน username..."
              />
              <Button 
                className="w-full" 
                onClick={async () => {
                  if (!tempUsername.trim() || !currentUser) return;
                  await supabase.from('users').update({ username: tempUsername.trim() }).eq('id', currentUser.id);
                  setCurrentUser({ ...currentUser, username: tempUsername.trim() });
                  setShowSettings(false);
                  toast({ title: 'บันทึกแล้ว!' });
                }}
                disabled={!tempUsername.trim()}
              >
                บันทึก
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // CHAT VIEW
  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-2 py-2 border-b border-border flex-shrink-0 bg-background">
        <button 
          className="p-2 hover:bg-muted rounded-full"
          onClick={() => {
            setView('list');
            setCurrentRoomId(null);
          }}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ 
            backgroundColor: currentRoom?.type === 'webhook' 
              ? 'hsl(210, 100%, 50%)' 
              : currentRoom?.type === 'group' 
                ? 'hsl(280, 60%, 50%)' 
                : 'hsl(var(--primary))' 
          }}
        >
          {currentRoom?.type === 'webhook' ? '🔗' : currentRoom?.type === 'group' ? '👥' : (roomNames[currentRoomId!] || 'C')[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {roomNames[currentRoomId!] || 'Chat'}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentRoom?.type === 'webhook' ? 'Webhook Room' : currentRoom?.type === 'group' ? 'Group Chat' : 'Online'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-muted rounded-full">
            <Search className="w-5 h-5 text-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-full">
            <Phone className="w-5 h-5 text-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-full">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-2">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">ยังไม่มีข้อความ</p>
            <p className="text-xs">เริ่มสนทนาเลย!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.user_id === currentUser?.id;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1].user_id !== message.user_id);
            
            return (
              <div
                key={message.id}
                className={`flex gap-2 mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwn && (
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: message.color }}
                      >
                        {message.avatar_url ? (
                          <img src={message.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          message.username[0]?.toUpperCase()
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] ${isOwn ? 'order-first' : ''}`}>
                  {showAvatar && !isOwn && (
                    <p className="text-xs text-muted-foreground mb-1 ml-1">{message.username}</p>
                  )}
                  <div 
                    className={`rounded-2xl px-3 py-2 ${
                      isOwn 
                        ? 'bg-emerald-500 text-white rounded-tr-sm' 
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}
                  >
                    {message.message_type === 'text' && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    {message.message_type === 'image' && (
                      <img 
                        src={message.file_url} 
                        alt="" 
                        className="max-w-full rounded-lg cursor-pointer"
                        onClick={() => window.open(message.file_url, '_blank')}
                      />
                    )}
                    {message.message_type === 'file' && (
                      <a 
                        href={message.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm underline"
                      >
                        <Paperclip className="w-4 h-4" />
                        {message.file_name}
                      </a>
                    )}
                    {message.message_type === 'webhook' && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">🔗 Webhook Alert</p>
                        <pre className="text-xs whitespace-pre-wrap bg-black/20 p-2 rounded">
                          {message.content}
                        </pre>
                      </div>
                    )}
                  </div>
                  <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-background flex-shrink-0">
        {isUploading && (
          <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            กำลังอัพโหลด...
          </div>
        )}
        <div className="flex items-center gap-1 px-2 py-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'file')}
          />
          <input
            type="file"
            ref={imageInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
          />
          
          <button 
            className="p-2 hover:bg-muted rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
          </button>
          <button 
            className="p-2 hover:bg-muted rounded-full"
            onClick={() => imageInputRef.current?.click()}
          >
            <Camera className="w-6 h-6 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-full">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Aa"
              className="rounded-full bg-muted border-none pr-10 h-10"
              disabled={isSending}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2">
              <Smile className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          {newMessage.trim() ? (
            <button 
              className="p-2 hover:bg-muted rounded-full"
              onClick={handleSendMessage}
              disabled={isSending}
            >
              <Send className="w-6 h-6 text-primary" />
            </button>
          ) : (
            <button className="p-2 hover:bg-muted rounded-full">
              <Mic className="w-6 h-6 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileMessenger;
