import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { User, Friendship, ChatRoom, Message, Webhook as WebhookType, FriendNickname } from '@/types/chat';
import { 
  UserPlus, Users, Settings, Paperclip, Image as ImageIcon, Send, 
  ArrowLeft, Search, Phone, Menu, Camera, Mic, Smile, Plus,
  Webhook, Trash2, Loader2, ChevronRight, MessageCircle, RefreshCw,
  Video, PlugZap, Forward, Copy, Check, X
} from 'lucide-react';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { getThemeColors } from '@/utils/themeColors';
import { useAuth } from '@/contexts/AuthContext';
import { VideoCall } from '@/components/VideoCall';
import { APIBridgePanel } from '@/components/chat/APIBridgePanel';

interface MobileMessengerProps {
  onBack?: () => void;
}

const MobileMessenger: React.FC<MobileMessengerProps> = ({ onBack }) => {
  const { user: authUser } = useAuth();
  const currentTheme = useCurrentTheme();
  const colors = getThemeColors(currentTheme);
  
  // View state
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
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAPIBridge, setShowAPIBridge] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [webhookRoomName, setWebhookRoomName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Webhook info
  const [currentWebhookUrl, setCurrentWebhookUrl] = useState('');
  const [currentWebhookSecret, setCurrentWebhookSecret] = useState('');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  
  // MT5 State - persist with localStorage
  const [mt5ConnectionId, setMt5ConnectionId] = useState<string | null>(() => {
    return localStorage.getItem('auto-bridge-mt5') || null;
  });
  const [isMt5Connected, setIsMt5Connected] = useState(false);
  const [autoForwardEnabled, setAutoForwardEnabled] = useState(() => {
    return localStorage.getItem('auto-bridge-enabled') === 'true';
  });
  
  // Load bridge_settings from database when room changes
  useEffect(() => {
    if (!currentRoomId || !currentUser) return;
    
    const loadBridgeSettings = async () => {
      const { data } = await supabase
        .from('bridge_settings')
        .select('enabled, mt5_connection_id')
        .eq('user_id', currentUser.id)
        .eq('room_id', currentRoomId)
        .maybeSingle();
      
      if (data) {
        setAutoForwardEnabled(data.enabled);
        if (data.mt5_connection_id) {
          setMt5ConnectionId(data.mt5_connection_id);
        }
      } else {
        setAutoForwardEnabled(false);
      }
    };
    
    loadBridgeSettings();
  }, [currentRoomId, currentUser]);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  
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
      const { data: existingUser } = await supabase
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

  // Check MT5 connection
  useEffect(() => {
    if (!currentRoomId || !currentUser) return;
    checkMT5Connection();
  }, [currentRoomId, currentUser]);

  const checkMT5Connection = async () => {
    if (!currentUser) return;
    
    try {
      // First, try to find a CONNECTED MT5 connection for this room
      if (currentRoomId) {
        const { data: roomConns } = await supabase
          .from('broker_connections')
          .select('*')
          .eq('room_id', currentRoomId)
          .eq('broker_type', 'mt5')
          .eq('is_connected', true)
          .order('last_connected_at', { ascending: false })
          .limit(1);
        
        if (roomConns && roomConns.length > 0) {
          const conn = roomConns[0];
          setMt5ConnectionId(conn.id);
          setIsMt5Connected(true);
          return;
        }
      }
      
      // Second, try to find any CONNECTED MT5 connection for this user
      const { data: connectedConns } = await supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('broker_type', 'mt5')
        .eq('is_connected', true)
        .order('last_connected_at', { ascending: false })
        .limit(1);
      
      if (connectedConns && connectedConns.length > 0) {
        const conn = connectedConns[0];
        setMt5ConnectionId(conn.id);
        
        // Verify connection is recently active
        const lastConnected = conn.last_connected_at ? new Date(conn.last_connected_at) : null;
        const isRecentlyActive = lastConnected && (Date.now() - lastConnected.getTime()) < 60000;
        
        setIsMt5Connected(isRecentlyActive || conn.is_connected === true);
        return;
      }
      
      // Fallback: Get most recent MT5 connection
      const { data: connections } = await supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('broker_type', 'mt5')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (connections && connections.length > 0) {
        const conn = connections[0];
        setMt5ConnectionId(conn.id);
        
        const lastConnected = conn.last_connected_at ? new Date(conn.last_connected_at) : null;
        const isRecentlyActive = lastConnected && (Date.now() - lastConnected.getTime()) < 60000;
        
        setIsMt5Connected(isRecentlyActive || conn.is_connected === true);
      } else {
        setMt5ConnectionId(null);
        setIsMt5Connected(false);
      }
    } catch (error) {
      console.error('Error checking MT5 connection:', error);
    }
  };

  const loadFriends = async () => {
    if (!currentUser) return;
    
    const { data } = await supabase
      .from('friendships')
      .select(`*, friend:users!friendships_friend_id_fkey(*)`)
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    
    if (data) setFriends(data as Friendship[]);
  };

  const loadRooms = async () => {
    if (!currentUser) return;
    
    const { data: memberRooms } = await supabase
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
        for (const room of roomsData) {
          fetchRoomName(room as ChatRoom);
          fetchLastMessage(room.id);
        }
      }
    }
  };

  const fetchLastMessage = async (roomId: string) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('content, created_at, message_type')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (msgs && msgs.length > 0) {
      const msg = msgs[0];
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
      if (msg.message_type === 'image') content = '📷 ส่งรูปภาพ';
      else if (msg.message_type === 'file') content = '📎 ส่งไฟล์';
      else if (msg.message_type === 'webhook') content = '🔗 Webhook Alert';

      setRoomLastMessages(prev => ({ ...prev, [roomId]: { content, time: timeStr } }));
    }
  };

  const loadNicknames = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('friend_nicknames').select('*').eq('user_id', currentUser.id);
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
          const { data: otherUser } = await supabase.from('users').select('username').eq('id', otherMemberId).single();
          if (otherUser) setRoomNames(prev => ({ ...prev, [room.id]: nicknames[otherMemberId] || otherUser.username }));
        }
      }
    } else {
      setRoomNames(prev => ({ ...prev, [room.id]: room.name || 'Group' }));
    }
  };

  const getDisplayName = (userId: string, username: string) => nicknames[userId] || username;

  // Load messages
  useEffect(() => {
    if (currentRoomId) {
      loadMessages();
      subscribeToMessages();
    }
  }, [currentRoomId]);

  const loadMessages = async () => {
    if (!currentRoomId) return;
    const { data } = await supabase
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
      .channel(`room-mobile-${currentRoomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoomId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        setTimeout(scrollToBottom, 100);
        
        // Auto forward webhook to MT5
        if (autoForwardEnabled && isMt5Connected && newMsg.message_type === 'webhook' && newMsg.webhook_data) {
          handleForwardToMT5(newMsg);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Forward to MT5
  const handleForwardToMT5 = async (message: Message) => {
    if (!mt5ConnectionId || !message.webhook_data) return;
    
    setForwardingMessageId(message.id);
    
    try {
      const webhookData = message.webhook_data as any;
      const parsedTrade = webhookData.parsed_trade || webhookData;
      
      const symbol = parsedTrade.symbol || webhookData.ticker || webhookData.symbol || 'BTCUSD';
      const action = (parsedTrade.action || webhookData.action || 'buy').toUpperCase();
      const volume = parsedTrade.lotSize || parsedTrade.quantity || webhookData.lot || webhookData.quantity || 0.01;
      const price = parsedTrade.price || webhookData.price || webhookData.close || 0;
      
      const commandType = action.includes('BUY') ? 'buy' : action.includes('SELL') ? 'sell' : 'buy';
      
      const { data: command, error } = await supabase
        .from('mt5_commands')
        .insert({
          connection_id: mt5ConnectionId,
          command_type: commandType,
          symbol: symbol,
          volume: parseFloat(String(volume)),
          price: parseFloat(String(price)),
          status: 'pending',
          comment: `Auto: ${message.id.slice(0, 8)}`
        })
        .select()
        .single();

      if (error) throw error;

      // Send system message
      await supabase.from('messages').insert({
        room_id: currentRoomId,
        user_id: 'system',
        username: '🤖 ABLE System',
        color: '#00ff00',
        content: `📤 **Forwarded to MT5**\n\n🏷️ Symbol: ${symbol}\n📌 Action: ${commandType.toUpperCase()}\n📊 Quantity: ${volume}\n💰 Price: ${price}\n\n⏳ Status: Waiting for MT5 EA to execute...\n🔗 Log ID: ${command.id.slice(0, 8)}...`,
        message_type: 'text'
      });

      toast({ title: '✅ Sent to MT5!', description: `${commandType.toUpperCase()} ${symbol}` });
    } catch (err: any) {
      console.error('MT5 forward error:', err);
      toast({ title: '❌ Forward Failed', description: err.message, variant: 'destructive' });
    } finally {
      setForwardingMessageId(null);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentRoomId || !currentUser) return;
    setIsSending(true);
    try {
      await supabase.from('messages').insert({
        room_id: currentRoomId,
        user_id: currentUser.id,
        username: currentUser.username,
        color: currentUser.color,
        content: newMessage.trim(),
        message_type: 'text'
      });
      setNewMessage('');
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to send', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  // File upload
  const handleFileUpload = async (file: File, type: 'file' | 'image') => {
    if (!currentRoomId || !currentUser) return;
    setIsUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(fileName);
      await supabase.from('messages').insert({
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
    } catch (error: any) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // Add friend
  const handleAddFriend = async () => {
    if (!friendUsername.trim() || !currentUser) return;
    try {
      const { data: friendUser } = await supabase.from('users').select('id').eq('username', friendUsername.trim()).maybeSingle();
      if (!friendUser) { toast({ title: 'User not found', variant: 'destructive' }); return; }
      if (friendUser.id === currentUser.id) { toast({ title: 'Cannot add yourself', variant: 'destructive' }); return; }
      const { error } = await supabase.from('friendships').insert({ user_id: currentUser.id, friend_id: friendUser.id, status: 'accepted' });
      if (error?.code === '23505') { toast({ title: 'Already friends!' }); }
      else if (error) throw error;
      else { toast({ title: 'Friend added!' }); setShowAddFriend(false); setFriendUsername(''); loadFriends(); }
    } catch (error: any) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Start private chat
  const startPrivateChat = async (friendId: string, friendName: string) => {
    if (!currentUser) return;
    const { data: existingRooms } = await supabase.from('chat_rooms').select('*, room_members(*)').eq('type', 'private');
    const existingRoom = existingRooms?.find(room => {
      const members = room.room_members || [];
      const memberIds = members.map((m: any) => m.user_id);
      return memberIds.includes(currentUser.id) && memberIds.includes(friendId) && memberIds.length === 2;
    });
    if (existingRoom) { setCurrentRoomId(existingRoom.id); setView('chat'); return; }
    const { data: newRoom } = await supabase.from('chat_rooms').insert({ type: 'private', created_by: currentUser.id }).select().single();
    if (!newRoom) return;
    await supabase.from('room_members').insert([{ room_id: newRoom.id, user_id: currentUser.id }, { room_id: newRoom.id, user_id: friendId }]);
    setRoomNames(prev => ({ ...prev, [newRoom.id]: nicknames[friendId] || friendName }));
    await loadRooms();
    setCurrentRoomId(newRoom.id);
    setView('chat');
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) return;
    try {
      const { data: newRoom } = await supabase.from('chat_rooms').insert({ type: 'group', name: groupName.trim(), created_by: currentUser.id }).select().single();
      if (!newRoom) return;
      await supabase.from('room_members').insert({ room_id: newRoom.id, user_id: currentUser.id });
      toast({ title: 'Group created!' });
      setShowCreateGroup(false);
      setGroupName('');
      loadRooms();
    } catch (error: any) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Create webhook room
  const handleCreateWebhookRoom = async () => {
    if (!webhookRoomName.trim() || !currentUser) return;
    try {
      const { data: newRoom } = await supabase.from('chat_rooms').insert({ type: 'webhook', name: `🔗 ${webhookRoomName.trim()}`, created_by: currentUser.id }).select().single();
      if (!newRoom) return;
      await supabase.from('room_members').insert({ room_id: newRoom.id, user_id: currentUser.id });
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tradingview-webhook/${newRoom.id}`;
      const webhookSecret = `whsec_${Math.random().toString(36).substr(2, 24)}`;
      await supabase.from('webhooks').insert({ room_id: newRoom.id, webhook_url: webhookUrl, webhook_secret: webhookSecret, created_by: currentUser.id });
      toast({ title: 'Webhook room created!' });
      setShowCreateWebhookRoom(false);
      setWebhookRoomName('');
      loadRooms();
    } catch (error: any) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Load webhook info
  const loadWebhookInfo = async () => {
    if (!currentRoomId) return;
    const { data } = await supabase.from('webhooks').select('*').eq('room_id', currentRoomId).maybeSingle();
    if (data) {
      setCurrentWebhookUrl(data.webhook_url);
      setCurrentWebhookSecret(data.webhook_secret);
      setShowWebhookInfo(true);
    } else {
      toast({ title: 'No webhook found' });
    }
  };

  // Delete room
  const handleDeleteRoom = async () => {
    if (!currentRoomId || !confirm('ลบห้องนี้และข้อมูลทั้งหมด?')) return;
    try {
      await supabase.from('messages').delete().eq('room_id', currentRoomId);
      await supabase.from('room_members').delete().eq('room_id', currentRoomId);
      await supabase.from('webhooks').delete().eq('room_id', currentRoomId);
      const { data: connections } = await supabase.from('broker_connections').select('id').eq('room_id', currentRoomId);
      if (connections?.length) {
        await supabase.from('mt5_commands').delete().in('connection_id', connections.map(c => c.id));
      }
      await supabase.from('broker_connections').delete().eq('room_id', currentRoomId);
      await supabase.from('chat_rooms').delete().eq('id', currentRoomId);
      toast({ title: '✅ Room Deleted' });
      setCurrentRoomId(null);
      setView('list');
      setRooms(prev => prev.filter(r => r.id !== currentRoomId));
      setShowRoomMenu(false);
    } catch (error: any) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    toast({ title: 'Copied!' });
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const currentRoom = rooms.find(r => r.id === currentRoomId);
  const filteredRooms = rooms.filter(room => (roomNames[room.id] || '').toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // === CHAT LIST VIEW ===
  if (view === 'list') {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">แชท</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-muted rounded-full" onClick={() => setShowAddFriend(true)}>
              <UserPlus className="w-5 h-5 text-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-full" onClick={() => setShowCreateGroup(true)}>
              <Users className="w-5 h-5 text-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-full" onClick={() => setShowCreateWebhookRoom(true)}>
              <Webhook className="w-5 h-5 text-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-full" onClick={() => setShowSettings(true)}>
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหา" className="pl-9 bg-muted border-none rounded-lg h-9" />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 min-h-0">
          {friends.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium">เพื่อน ({friends.length})</p>
              {friends.map(f => {
                const friendId = f.friend_id === currentUser?.id ? f.user_id : f.friend_id;
                const displayName = getDisplayName(friendId, f.friend?.username || 'Unknown');
                return (
                  <div key={f.id} className="flex items-center gap-3 py-3 active:bg-muted/50 rounded-lg" onClick={() => startPrivateChat(friendId, displayName)}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 relative" style={{ backgroundColor: f.friend?.color || 'hsl(var(--primary))' }}>
                      {f.friend?.avatar_url ? <img src={f.friend.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : displayName[0]?.toUpperCase()}
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

          <div className="px-4 py-2">
            {friends.length > 0 && <div className="h-px bg-border my-2" />}
            <p className="text-xs text-muted-foreground mb-2 font-medium">ห้องแชท ({filteredRooms.length})</p>
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ยังไม่มีห้องแชท</p>
              </div>
            ) : (
              filteredRooms.map(room => {
                const lastMsg = roomLastMessages[room.id];
                const roomName = roomNames[room.id] || 'Loading...';
                return (
                  <div key={room.id} className="flex items-center gap-3 py-3 active:bg-muted/50 rounded-lg" onClick={() => { setCurrentRoomId(room.id); setView('chat'); }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: room.type === 'webhook' ? 'hsl(210, 100%, 50%)' : room.type === 'group' ? 'hsl(280, 60%, 50%)' : 'hsl(var(--primary))' }}>
                      {room.type === 'webhook' ? '🔗' : room.type === 'group' ? '👥' : roomName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground truncate">{roomName}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{lastMsg?.time || ''}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{lastMsg?.content || (room.type === 'webhook' ? 'Webhook Room' : 'เริ่มสนทนา...')}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Dialogs */}
        <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader><DialogTitle>เพิ่มเพื่อน</DialogTitle></DialogHeader>
            <Input value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()} placeholder="Username..." />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddFriend(false)}>ยกเลิก</Button>
              <Button onClick={handleAddFriend}>เพิ่มเพื่อน</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader><DialogTitle>สร้างกลุ่ม</DialogTitle></DialogHeader>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()} placeholder="ชื่อกลุ่ม..." />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateGroup(false)}>ยกเลิก</Button>
              <Button onClick={handleCreateGroup}>สร้างกลุ่ม</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateWebhookRoom} onOpenChange={setShowCreateWebhookRoom}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader><DialogTitle>🔗 สร้าง Webhook Room</DialogTitle></DialogHeader>
            <Input value={webhookRoomName} onChange={(e) => setWebhookRoomName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleCreateWebhookRoom()} placeholder="ชื่อห้อง..." />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateWebhookRoom(false)}>ยกเลิก</Button>
              <Button onClick={handleCreateWebhookRoom}>สร้างห้อง</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogHeader><DialogTitle>ตั้งค่า</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: currentUser?.color }}>
                  {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : currentUser?.username[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">{currentUser?.username}</p>
                  <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                </div>
              </div>
              <Input value={tempUsername} onChange={(e) => setTempUsername(e.target.value)} placeholder="เปลี่ยน username..." />
              <Button className="w-full" onClick={async () => {
                if (!tempUsername.trim() || !currentUser) return;
                await supabase.from('users').update({ username: tempUsername.trim() }).eq('id', currentUser.id);
                setCurrentUser({ ...currentUser, username: tempUsername.trim() });
                setShowSettings(false);
                toast({ title: 'บันทึกแล้ว!' });
              }} disabled={!tempUsername.trim()}>บันทึก</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === CHAT VIEW ===
  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border flex-shrink-0 bg-background">
        <button className="p-2 hover:bg-muted rounded-full" onClick={() => { setView('list'); setCurrentRoomId(null); }}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: currentRoom?.type === 'webhook' ? 'hsl(210, 100%, 50%)' : currentRoom?.type === 'group' ? 'hsl(280, 60%, 50%)' : 'hsl(var(--primary))' }}>
          {currentRoom?.type === 'webhook' ? '🔗' : currentRoom?.type === 'group' ? '👥' : (roomNames[currentRoomId!] || 'C')[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{roomNames[currentRoomId!] || 'Chat'}</p>
          <p className="text-xs text-muted-foreground">{currentRoom?.type === 'webhook' ? 'Webhook Room' : currentRoom?.type === 'group' ? 'Group' : 'Online'}</p>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          {currentRoom?.type === 'webhook' && (
            <>
              {/* Refresh */}
              <button className="p-2 hover:bg-muted rounded-full" onClick={loadMessages}>
                <RefreshCw className="w-4 h-4 text-emerald-500" />
              </button>
              {/* Webhook Info */}
              <button className="p-2 hover:bg-muted rounded-full" onClick={loadWebhookInfo}>
                <Webhook className="w-4 h-4 text-blue-500" />
              </button>
              {/* Auto Bridge */}
              <button
                onClick={async () => {
                  if (!mt5ConnectionId) {
                    setShowAPIBridge(true);
                    toast({ title: '⚠️ เชื่อมต่อ MT5 ก่อน' });
                    return;
                  }
                  
                  const newState = !autoForwardEnabled;
                  setAutoForwardEnabled(newState);
                  
                  // Save to database for 24/7 operation
                  try {
                    const { error } = await supabase
                      .from('bridge_settings')
                      .upsert({
                        user_id: currentUser!.id,
                        room_id: currentRoomId,
                        enabled: newState,
                        mt5_connection_id: mt5ConnectionId,
                        auto_forward_signals: true,
                        signal_types: ['BUY', 'SELL', 'CLOSE'],
                        max_lot_size: 1.0
                      }, {
                        onConflict: 'user_id,room_id'
                      });
                    
                    if (error) throw error;
                    
                    toast({
                      title: newState ? '🟢 Auto Bridge ON - 24/7' : '🔴 Auto Bridge OFF',
                      description: newState ? 'ทำงานแม้ปิดเว็บ' : 'หยุดส่งอัตโนมัติ'
                    });
                  } catch (error: any) {
                    console.error('Error updating bridge settings:', error);
                    toast({ title: 'Error', variant: 'destructive' });
                    setAutoForwardEnabled(!newState); // rollback
                  }
                }}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                  autoForwardEnabled 
                    ? 'bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 shadow-lg shadow-emerald-500/40' 
                    : mt5ConnectionId ? 'bg-muted border border-border' : 'bg-muted/30 border border-border/50 opacity-60'
                }`}
              >
                <svg className={`w-5 h-5 ${autoForwardEnabled ? 'text-white' : 'text-foreground'}`} viewBox="0 0 24 24" fill="none">
                  <path d="M3 18V14C3 12.3431 4.34315 11 6 11H18C19.6569 11 21 12.3431 21 14V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M6 11V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M18 11V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 14L12 11L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={autoForwardEnabled ? 'animate-pulse' : ''}/>
                  <circle cx="6" cy="6" r="2" fill={autoForwardEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="18" cy="6" r="2" fill={autoForwardEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${autoForwardEnabled ? 'bg-emerald-400' : mt5ConnectionId ? 'bg-amber-500' : 'bg-destructive/60'}`} />
              </button>
              {/* MT5 Settings */}
              <button className="p-2 hover:bg-muted rounded-full" onClick={() => setShowAPIBridge(true)}>
                <PlugZap className={`w-4 h-4 ${isMt5Connected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              </button>
            </>
          )}
          {/* Video Call */}
          <button className="p-2 hover:bg-muted rounded-full" onClick={() => setShowVideoCall(true)}>
            <Video className="w-4 h-4 text-foreground" />
          </button>
          {/* Menu */}
          <button className="p-2 hover:bg-muted rounded-full" onClick={() => setShowRoomMenu(true)}>
            <Menu className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-2">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">ยังไม่มีข้อความ</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.user_id === currentUser?.id;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1].user_id !== message.user_id);
            
            return (
              <div key={message.id} className={`flex gap-2 mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: message.color }}>
                        {message.avatar_url ? <img src={message.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : message.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] ${isOwn ? 'order-first' : ''}`}>
                  {showAvatar && !isOwn && <p className="text-xs text-muted-foreground mb-1 ml-1">{message.username}</p>}
                  <div className={`rounded-2xl px-3 py-2 ${isOwn ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                    {message.message_type === 'text' && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
                    {message.message_type === 'image' && <img src={message.file_url} alt="" className="max-w-full rounded-lg" onClick={() => window.open(message.file_url, '_blank')} />}
                    {message.message_type === 'file' && <a href={message.file_url} target="_blank" className="flex items-center gap-2 text-sm underline"><Paperclip className="w-4 h-4" />{message.file_name}</a>}
                    {message.message_type === 'webhook' && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium">🔗 Webhook Alert</p>
                        <pre className="text-xs whitespace-pre-wrap bg-black/20 p-2 rounded">{message.content}</pre>
                        {message.webhook_data && (
                          <>
                            <div className="text-xs space-y-1 bg-black/20 p-2 rounded">
                              {(() => {
                                const data = message.webhook_data as any;
                                const parsed = data.parsed_trade || data;
                                return (
                                  <>
                                    <div>🏷️ Symbol: <span className="font-bold">{parsed.symbol || data.ticker || 'N/A'}</span></div>
                                    <div>📌 Action: <span className={`font-bold ${(parsed.action || data.action || '').toLowerCase().includes('buy') ? 'text-green-400' : 'text-red-400'}`}>{parsed.action || data.action || 'N/A'}</span></div>
                                    <div>💰 Price: <span className="font-bold">{parsed.price || data.price || 'N/A'}</span></div>
                                    <div>📊 Qty: <span className="font-bold">{parsed.lotSize || parsed.quantity || data.lot || 0.01}</span></div>
                                  </>
                                );
                              })()}
                            </div>
                            <Button
                              size="sm"
                              variant={isMt5Connected ? "default" : "outline"}
                              onClick={() => handleForwardToMT5(message)}
                              disabled={!isMt5Connected || forwardingMessageId === message.id}
                              className={`h-7 text-xs w-full ${isMt5Connected ? 'bg-green-600 hover:bg-green-700' : 'border-red-500/30 text-red-400'}`}
                            >
                              {forwardingMessageId === message.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending...</> : <><Forward className="w-3 h-3 mr-1" />{isMt5Connected ? 'Forward to MT5' : 'Connect MT5 First'}</>}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>{formatTime(message.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-background flex-shrink-0">
        {isUploading && <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />อัพโหลด...</div>}
        <div className="flex items-center gap-1 px-2 py-2">
          <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'file')} />
          <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} />
          <button className="p-2 hover:bg-muted rounded-full" onClick={() => fileInputRef.current?.click()}><Plus className="w-6 h-6 text-muted-foreground" /></button>
          <button className="p-2 hover:bg-muted rounded-full" onClick={() => imageInputRef.current?.click()}><Camera className="w-6 h-6 text-muted-foreground" /></button>
          <button className="p-2 hover:bg-muted rounded-full"><ImageIcon className="w-6 h-6 text-muted-foreground" /></button>
          <div className="flex-1 relative">
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Aa" className="rounded-full bg-muted border-none pr-10 h-10" disabled={isSending} />
            <button className="absolute right-3 top-1/2 -translate-y-1/2"><Smile className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          {newMessage.trim() ? (
            <button className="p-2 hover:bg-muted rounded-full" onClick={handleSendMessage} disabled={isSending}><Send className="w-6 h-6 text-primary" /></button>
          ) : (
            <button className="p-2 hover:bg-muted rounded-full"><Mic className="w-6 h-6 text-muted-foreground" /></button>
          )}
        </div>
      </div>

      {/* Room Menu Sheet */}
      <Sheet open={showRoomMenu} onOpenChange={setShowRoomMenu}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          <SheetHeader><SheetTitle>ตัวเลือกห้อง</SheetTitle></SheetHeader>
          <div className="space-y-2 mt-4">
            {currentRoom?.type === 'webhook' && (
              <Button variant="outline" className="w-full justify-start" onClick={() => { loadWebhookInfo(); setShowRoomMenu(false); }}>
                <Webhook className="w-4 h-4 mr-2" />Webhook Info
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start" onClick={() => { setShowVideoCall(true); setShowRoomMenu(false); }}>
              <Video className="w-4 h-4 mr-2" />Video Call
            </Button>
            {currentRoom?.type === 'webhook' && (
              <Button variant="outline" className="w-full justify-start" onClick={() => { setShowAPIBridge(true); setShowRoomMenu(false); }}>
                <PlugZap className="w-4 h-4 mr-2" />MT5 Settings
              </Button>
            )}
            <Button variant="destructive" className="w-full justify-start" onClick={handleDeleteRoom}>
              <Trash2 className="w-4 h-4 mr-2" />ลบห้องแชท
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Webhook Info Dialog */}
      <Dialog open={showWebhookInfo} onOpenChange={setShowWebhookInfo}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">🔗 Webhook Information</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">ใช้ข้อมูลนี้ใน TradingView Alert</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Webhook URL:</label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-primary/10 text-primary p-3 rounded flex-1 overflow-auto break-all border border-primary/30">
                  {currentWebhookUrl}
                </code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(currentWebhookUrl, 'url')}>
                  {copiedItem === 'url' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Secret Key:</label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-primary/10 text-primary p-3 rounded flex-1 border border-primary/30">
                  {currentWebhookSecret}
                </code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(currentWebhookSecret, 'secret')}>
                  {copiedItem === 'secret' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="border border-primary/30 rounded p-4">
              <h4 className="font-bold mb-2 text-primary">📊 วิธีใช้งานกับ TradingView:</h4>
              <ol className="text-sm space-y-1 text-muted-foreground">
                <li>1. ไปที่ TradingView → สร้าง Alert ใหม่</li>
                <li>2. ใน "Notifications" เปิด "Webhook URL"</li>
                <li>3. วาง Webhook URL ด้านบน</li>
                <li>4. ใน "Message" ใส่ JSON format:</li>
              </ol>
              <pre className="text-xs bg-black/50 text-primary p-2 rounded mt-2 overflow-auto">
{`{
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": "{{close}}",
  "time": "{{time}}",
  "message": "Your custom message"
}`}
              </pre>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    // Ensure TradingView user exists
                    const { data: tvUser } = await supabase.from('users').select('id').eq('id', 'tradingview').maybeSingle();
                    if (!tvUser) {
                      await supabase.from('users').insert({
                        id: 'tradingview',
                        username: '📊 TradingView',
                        color: '#2962FF',
                        status: 'online'
                      });
                    }
                    const testData = {
                      ticker: 'TEST',
                      action: 'BUY',
                      price: '100.00',
                      time: new Date().toISOString(),
                      message: '🧪 Test alert from ABLE Messenger'
                    };
                    await supabase.from('messages').insert({
                      room_id: currentRoomId,
                      user_id: 'tradingview',
                      username: '📊 TradingView',
                      color: '#2962FF',
                      content: `📊 **TradingView Alert**\n\n🏷️ Symbol: TEST\n📌 Action: BUY\n💰 Price: 100.00\n\n💬 🧪 Test alert from ABLE Messenger`,
                      message_type: 'webhook',
                      webhook_data: testData
                    });
                    toast({ title: '✅ Test Sent!', description: 'Check the chat for the test message' });
                    setShowWebhookInfo(false);
                  } catch (error) {
                    console.error('Test webhook error:', error);
                    toast({ title: 'Test Failed', variant: 'destructive' });
                  }
                }}
                className="border-primary/30"
              >
                🧪 Send Test Alert
              </Button>
              <Button onClick={() => setShowWebhookInfo(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Bridge Dialog */}
      <Dialog open={showAPIBridge} onOpenChange={setShowAPIBridge}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md p-0 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
          {currentRoomId && currentUser && (
            <div className="flex-1 overflow-hidden">
              <APIBridgePanel roomId={currentRoomId} userId={currentUser.id} onClose={() => { setShowAPIBridge(false); checkMT5Connection(); }} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Call */}
      {showVideoCall && currentRoomId && currentUser && (
        <VideoCall roomId={currentRoomId} currentUser={currentUser} onClose={() => setShowVideoCall(false)} />
      )}
    </div>
  );
};

export default MobileMessenger;
