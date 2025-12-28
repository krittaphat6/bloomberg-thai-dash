import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { User, Friendship, ChatRoom, Message, Webhook as WebhookType, FriendNickname } from '@/types/chat';
import { UserPlus, Users, Settings, Paperclip, Image as ImageIcon, Send, X, Copy, Check, Edit2, Video, Webhook, Trash2, Share2, Loader2, RefreshCw, Volume2, VolumeX, PlugZap, Forward, Zap } from 'lucide-react';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { getThemeColors } from '@/utils/themeColors';
import { VideoCall } from './VideoCall';
import { APIBridgePanel } from './chat/APIBridgePanel';
import { useAuth } from '@/contexts/AuthContext';

// Notification sounds - 5 options using Web Audio API
const NOTIFICATION_SOUNDS = {
  ding: { name: '🔔 Ding', frequency: 880, duration: 0.3, type: 'sine' as OscillatorType },
  pop: { name: '💬 Pop', frequency: 600, duration: 0.15, type: 'sine' as OscillatorType },
  chime: { name: '🎵 Chime', frequencies: [523, 659, 784], duration: 0.4, type: 'sine' as OscillatorType },
  knock: { name: '🚪 Knock', frequency: 150, duration: 0.08, type: 'square' as OscillatorType, repeat: 2 },
  alert: { name: '⚡ Alert', frequencies: [1000, 800, 1000], duration: 0.1, type: 'square' as OscillatorType }
};

const LiveChatReal = () => {
  // Auth
  const { user: authUser } = useAuth();
  
  // Theme
  const currentTheme = useCurrentTheme();
  const colors = getThemeColors(currentTheme);
  
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  
  // Friends & Rooms
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomNames, setRoomNames] = useState<{ [key: string]: string }>({});
  
  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  // Forward message
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  
  // Nicknames
  const [nicknames, setNicknames] = useState<{ [key: string]: string }>({});
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [editingFriendId, setEditingFriendId] = useState<string>('');
  const [newNickname, setNewNickname] = useState('');
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateWebhookRoom, setShowCreateWebhookRoom] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showInviteToGroup, setShowInviteToGroup] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAPIBridge, setShowAPIBridge] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  
  // Mobile responsive state
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [webhookRoomName, setWebhookRoomName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [currentWebhookUrl, setCurrentWebhookUrl] = useState('');
  const [currentWebhookSecret, setCurrentWebhookSecret] = useState('');
  
  // Sound notification
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('messenger-sound-enabled');
    return saved !== 'false';
  });
  const [selectedSound, setSelectedSound] = useState<keyof typeof NOTIFICATION_SOUNDS>(() => {
    const saved = localStorage.getItem('messenger-sound-type');
    return (saved as keyof typeof NOTIFICATION_SOUNDS) || 'ding';
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // MT5 Forward state
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const [mt5ConnectionId, setMt5ConnectionId] = useState<string | null>(null);
  const [isMt5Connected, setIsMt5Connected] = useState(false);
  const [autoForwardEnabled, setAutoForwardEnabled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Save sound preferences
  useEffect(() => {
    localStorage.setItem('messenger-sound-enabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('messenger-sound-type', selectedSound);
  }, [selectedSound]);

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback((soundKey?: keyof typeof NOTIFICATION_SOUNDS) => {
    if (!soundEnabled) return;
    
    const sound = NOTIFICATION_SOUNDS[soundKey || selectedSound];
    if (!sound) return;

    try {
      const audioCtx = new AudioContext();
      const soundType = sound.type || 'sine';
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = soundType;
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      if ('frequencies' in sound && Array.isArray(sound.frequencies)) {
        // Multiple tones (chime, alert)
        sound.frequencies.forEach((freq: number, i: number) => {
          playTone(freq, audioCtx.currentTime + i * 0.1, sound.duration);
        });
      } else if ('repeat' in sound && typeof sound.repeat === 'number' && 'frequency' in sound) {
        // Repeated tone (knock)
        const freq = sound.frequency as number;
        for (let i = 0; i < sound.repeat; i++) {
          playTone(freq, audioCtx.currentTime + i * 0.15, sound.duration);
        }
      } else if ('frequency' in sound) {
        // Single tone
        playTone(sound.frequency as number, audioCtx.currentTime, sound.duration);
      }
    } catch (e) {
      console.log('Audio play failed:', e);
    }
  }, [soundEnabled, selectedSound]);

  // Helper functions
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mobile view detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (mobile && currentRoomId) {
        setShowSidebar(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Switch to chat when selecting room on mobile
  useEffect(() => {
    if (isMobileView && currentRoomId) {
      setShowSidebar(false);
    }
  }, [currentRoomId, isMobileView]);

  const getDisplayName = (friendId: string, username: string): string => {
    return nicknames[friendId] || username;
  };

  // Get friend name for private room
  const getFriendNameForRoom = async (room: ChatRoom): Promise<string> => {
    if (room.type !== 'private' || !currentUser) return room.name || 'Private Chat';

    try {
      const { data: members } = await supabase
        .from('room_members')
        .select('user_id, users(username)')
        .eq('room_id', room.id)
        .neq('user_id', currentUser.id);

      if (members && members.length > 0 && members[0].users) {
        const friendId = members[0].user_id;
        const username = members[0].users.username;
        return nicknames[friendId] || username;
      }
    } catch (error) {
      console.error('Error getting friend name:', error);
    }

    return 'Unknown User';
  };

  // Initialize user from Auth
  useEffect(() => {
    const initUser = async () => {
      if (!authUser) return;
      
      const userId = authUser.id;
      const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User';
      
      // Get user profile from database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (userProfile) {
        setCurrentUser({
          id: userProfile.id,
          username: userProfile.username,
          color: userProfile.color,
          avatar_url: userProfile.avatar_url,
          status: 'online',
          last_seen: new Date().toISOString()
        });
        
        // Update online status
        await supabase
          .from('users')
          .update({ status: 'online', last_seen: new Date().toISOString() })
          .eq('id', userId);
      } else {
        // Create profile if not exists
        const colors = ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff6b6b', '#4ecdc4'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        const newUser = {
          id: userId,
          username,
          color: randomColor,
          status: 'online',
          last_seen: new Date().toISOString()
        };
        
        await supabase.from('users').upsert(newUser);
        setCurrentUser(newUser as User);
      }
      
      setIsInitialized(true);
    };

    initUser();
  }, [authUser]);

  // Load nicknames
  useEffect(() => {
    if (!currentUser) return;

    const loadNicknames = async () => {
      const { data } = await supabase
        .from('friend_nicknames')
        .select('*')
        .eq('user_id', currentUser.id);

      if (data) {
        const nicknameMap: { [key: string]: string } = {};
        data.forEach((n: any) => {
          nicknameMap[n.friend_id] = n.nickname;
        });
        setNicknames(nicknameMap);
      }
    };

    loadNicknames();
  }, [currentUser]);

  // Subscribe to username and avatar changes - Enhanced for realtime profile updates
  useEffect(() => {
    if (!currentUser) return;

    const usersChannel = supabase
      .channel('users-profile-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users'
      }, async (payload) => {
        console.log('👤 User profile updated:', payload.new);
        const updatedUser = payload.new as User;
        
        // 1. Update friends list with new avatar/username/color
        setFriends(prev => prev.map(f => {
          if (f.friend?.id === updatedUser.id) {
            return {
              ...f,
              friend: { 
                ...f.friend, 
                avatar_url: updatedUser.avatar_url, 
                username: updatedUser.username,
                color: updatedUser.color
              }
            };
          }
          // Handle case where friend_id matches
          if (f.friend_id === updatedUser.id && f.friend) {
            return {
              ...f,
              friend: { 
                ...f.friend, 
                avatar_url: updatedUser.avatar_url, 
                username: updatedUser.username,
                color: updatedUser.color
              }
            };
          }
          return f;
        }));
        
        // 2. Update ALL messages from this user to show new avatar/username/color
        setMessages(prev => prev.map(m => {
          if (m.user_id === updatedUser.id) {
            return { 
              ...m, 
              avatar_url: updatedUser.avatar_url, 
              username: updatedUser.username,
              color: updatedUser.color
            };
          }
          return m;
        }));
        
        // 3. Reload friends and rooms to show new names
        const { data: friendData } = await supabase
          .from('friendships')
          .select('*, friend:users!friendships_friend_id_fkey(*)')
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

        if (friendData) {
          setFriends(friendData as any || []);
        }
        
        const { data: memberData } = await supabase
          .from('room_members')
          .select('room_id, chat_rooms(*)')
          .eq('user_id', currentUser.id);

        if (memberData) {
          const roomsData = memberData.map(m => m.chat_rooms).filter(Boolean);
          setRooms(roomsData as any);
        }
      })
      .subscribe((status) => {
        console.log('📡 Users subscription status:', status);
      });

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, [currentUser]);

  // Load friends
  useEffect(() => {
    if (!currentUser) return;

    const loadFriendships = async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*, friend:users!friendships_friend_id_fkey(*)')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

      if (error) {
        console.error('Error loading friendships:', error);
      } else {
        setFriends(data as any || []);
      }
    };

    loadFriendships();

    const channel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
      }, () => {
        loadFriendships();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Load rooms
  useEffect(() => {
    if (!currentUser) return;

    const loadRooms = async () => {
      const { data: memberData, error } = await supabase
        .from('room_members')
        .select('room_id, chat_rooms(*)')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error loading rooms:', error);
      } else {
        const roomsData = memberData?.map(m => m.chat_rooms).filter(Boolean) || [];
        setRooms(roomsData as any);
      }
    };

    loadRooms();

    const channel = supabase
      .channel('room-members-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_members',
      }, () => {
        loadRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Load room display names
  useEffect(() => {
    const loadRoomNames = async () => {
      const names: { [key: string]: string } = {};
      
      for (const room of rooms) {
        if (room.type === 'private') {
          names[room.id] = await getFriendNameForRoom(room);
        } else {
          names[room.id] = room.name || 'Group Chat';
        }
      }
      
      setRoomNames(names);
    };

    if (rooms.length > 0 && currentUser) {
      loadRoomNames();
    }
  }, [rooms, currentUser, nicknames]);

  // Load messages for current room
  useEffect(() => {
    if (!currentRoomId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else {
        setMessages((data || []) as Message[]);
        setTimeout(scrollToBottom, 100);
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`room:${currentRoomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoomId}`
      }, (payload) => {
        console.log('📨 New message received:', payload.new);
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        
        // Play sound if message is from someone else
        if (newMessage.user_id !== currentUser?.id) {
          playNotificationSound();
        }
        
        setTimeout(scrollToBottom, 100);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoomId}`
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoomId]);

  // Load webhooks
  useEffect(() => {
    if (!currentRoomId) return;

    const loadWebhooks = async () => {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('room_id', currentRoomId);

      if (error) {
        console.error('Error loading webhooks:', error);
      } else {
        setWebhooks(data || []);
        
        if (data && data.length > 0) {
          setCurrentWebhookUrl(data[0].webhook_url);
          setCurrentWebhookSecret(data[0].webhook_secret);
        }
      }
    };

    loadWebhooks();
  }, [currentRoomId]);

  // Check MT5 connection status
  const checkMT5Connection = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const { data: connections, error } = await supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('broker_type', 'mt5')
        .eq('is_connected', true)
        .limit(1);
      
      if (error) throw error;
      
      if (connections && connections.length > 0) {
        setMt5ConnectionId(connections[0].id);
        setIsMt5Connected(true);
      } else {
        setMt5ConnectionId(null);
        setIsMt5Connected(false);
      }
    } catch (err) {
      console.error('Error checking MT5 connection:', err);
    }
  }, [currentUser]);

  // Subscribe to MT5 connection changes
  useEffect(() => {
    if (!currentUser) return;
    
    checkMT5Connection();
    
    const channel = supabase
      .channel('mt5-connection-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'broker_connections',
        filter: `user_id=eq.${currentUser.id}`
      }, () => {
        checkMT5Connection();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkMT5Connection, currentUser]);

  // Forward webhook message to MT5
  const handleForwardToMT5 = async (message: Message) => {
    if (!mt5ConnectionId || !message.webhook_data) {
      toast({
        title: '❌ Error',
        description: 'กรุณาเชื่อมต่อ MT5 ก่อน',
        variant: 'destructive'
      });
      return;
    }
    
    setForwardingMessageId(message.id);
    
    try {
      const webhookData = message.webhook_data as any;
      const parsedTrade = webhookData.parsed_trade || webhookData;
      
      // Determine action
      let action = 'buy';
      const actionStr = (parsedTrade.action || webhookData.action || '').toString().toLowerCase();
      
      if (actionStr.includes('sell') || actionStr.includes('short')) {
        action = 'sell';
      } else if (actionStr.includes('close')) {
        action = 'close';
      }
      
      // Get symbol and price
      const symbol = parsedTrade.symbol || webhookData.ticker || webhookData.symbol || '';
      const price = parseFloat(parsedTrade.price || webhookData.price || webhookData.close || 0);
      const quantity = parseFloat(parsedTrade.lotSize || parsedTrade.quantity || webhookData.lot || webhookData.quantity || 0.01);
      
      // Insert into api_forward_logs (pending status)
      const { data: logData, error: logError } = await supabase
        .from('api_forward_logs')
        .insert({
          connection_id: mt5ConnectionId,
          room_id: message.room_id,
          message_id: message.id,
          broker_type: 'mt5',
          action: action,
          symbol: symbol,
          quantity: quantity,
          price: price,
          status: 'pending',
          response_data: {
            sl: parsedTrade.sl || 0,
            tp: parsedTrade.tp || 0,
            source: 'webhook',
            original_data: webhookData
          }
        })
        .select()
        .single();
      
      if (logError) throw logError;
      
      // Send confirmation message to chat
      await supabase.from('messages').insert({
        room_id: message.room_id,
        user_id: 'system',
        username: '🤖 ABLE System',
        color: '#00ff88',
        content: `📤 **Forwarded to MT5**\n\n` +
          `🏷️ Symbol: ${symbol}\n` +
          `📌 Action: ${action.toUpperCase()}\n` +
          `📊 Quantity: ${quantity}\n` +
          `💰 Price: ${price}\n\n` +
          `⏳ Status: Waiting for MT5 EA to execute...\n` +
          `🔗 Log ID: ${logData.id.slice(0, 8)}...`,
        message_type: 'text'
      });
      
      toast({
        title: '✅ Forwarded to MT5!',
        description: `${action.toUpperCase()} ${symbol} x${quantity} sent to MT5 EA`
      });
      
    } catch (err: any) {
      console.error('Error forwarding to MT5:', err);
      toast({
        title: '❌ Forward Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setForwardingMessageId(null);
    }
  };

  // Auto-forward webhook messages to MT5
  useEffect(() => {
    if (!autoForwardEnabled || !isMt5Connected || !currentRoomId) return;
    
    const channel = supabase
      .channel('webhook-auto-forward')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoomId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        if (newMessage.message_type === 'webhook' && newMessage.webhook_data) {
          // Auto forward
          handleForwardToMT5(newMessage);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoForwardEnabled, isMt5Connected, currentRoomId, mt5ConnectionId]);

  // Avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!currentUser || isUploadingAvatar) return;
    
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({ title: 'File Too Large', description: 'Max size is 2MB', variant: 'destructive' });
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please upload an image', variant: 'destructive' });
      return;
    }
    
    setIsUploadingAvatar(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);
      
      if (updateError) throw updateError;
      
      setCurrentUser({ ...currentUser, avatar_url: publicUrl });
      toast({ title: 'Avatar Updated!', description: 'Your profile picture has been changed' });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setSelectedMessageId(null);
      toast({ title: 'Message Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Forward message
  const handleForwardMessage = async (targetRoomId: string) => {
    if (!currentUser || !forwardingMessage) return;
    
    try {
      const forwardedContent = forwardingMessage.message_type === 'text' 
        ? `↪️ Forwarded:\n${forwardingMessage.content}`
        : forwardingMessage.content;
      
      const { error } = await supabase.from('messages').insert({
        room_id: targetRoomId,
        user_id: currentUser.id,
        username: currentUser.username,
        color: currentUser.color,
        content: forwardedContent,
        message_type: forwardingMessage.message_type,
        file_url: forwardingMessage.file_url,
        file_name: forwardingMessage.file_name,
        file_type: forwardingMessage.file_type,
        file_size: forwardingMessage.file_size,
      });
      
      if (error) throw error;
      
      toast({ title: 'Message Forwarded!', description: 'Message sent successfully' });
      setShowForwardDialog(false);
      setForwardingMessage(null);
      setSelectedMessageId(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Save nickname
  const saveNickname = async () => {
    if (!currentUser || !editingFriendId || !newNickname.trim()) return;

    try {
      const { error } = await supabase
        .from('friend_nicknames')
        .upsert({
          user_id: currentUser.id,
          friend_id: editingFriendId,
          nickname: newNickname.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,friend_id'
        });

      if (error) throw error;

      setNicknames(prev => ({
        ...prev,
        [editingFriendId]: newNickname.trim()
      }));

      toast({ title: 'Nickname Saved!', description: 'Friend nickname updated' });
      setShowEditNickname(false);
      setNewNickname('');
      setEditingFriendId('');
    } catch (error: any) {
      console.error('Error saving nickname:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Save username
  const handleSaveUsername = async () => {
    if (!tempUsername.trim() || !currentUser) return;

    const newUsername = tempUsername.trim();
    
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: newUsername })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setCurrentUser({ ...currentUser, username: newUsername });

      toast({ 
        title: 'Username Updated!', 
        description: `Your name is now "${newUsername}"` 
      });
      setShowSettings(false);
    } catch (error: any) {
      console.error('Error updating username:', error);
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  // Add friend
  const handleAddFriend = async () => {
    if (!currentUser || !friendUsername.trim()) return;

    try {
      const { data: friend, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('username', friendUsername.trim())
        .single();

      if (findError || !friend) {
        toast({ title: 'User Not Found', description: `No user with username "${friendUsername}"`, variant: 'destructive' });
        return;
      }

      if (friend.id === currentUser.id) {
        toast({ title: 'Error', description: 'You cannot add yourself as a friend', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUser.id,
          friend_id: friend.id,
          status: 'accepted',
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already Friends', description: 'This user is already your friend' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Friend Added!', description: `${friendUsername} is now your friend` });
        setFriendUsername('');
        setShowAddFriend(false);
        startPrivateChat(friend.id, friend.username);
      }
    } catch (error: any) {
      console.error('Error adding friend:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Start private chat
  const startPrivateChat = async (friendId: string, friendUsername: string) => {
    if (!currentUser) return;

    try {
      const { data: existingRooms } = await supabase
        .from('room_members')
        .select('room_id, chat_rooms!inner(type)')
        .eq('user_id', currentUser.id);

      let existingRoom: any = null;
      if (existingRooms) {
        for (const room of existingRooms) {
          const { data: members } = await supabase
            .from('room_members')
            .select('user_id')
            .eq('room_id', room.room_id);

          if (members && members.length === 2 && members.some(m => m.user_id === friendId)) {
            existingRoom = room;
            break;
          }
        }
      }

      if (existingRoom) {
        setCurrentRoomId(existingRoom.room_id);
        return;
      }

      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'private',
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: membersError } = await supabase
        .from('room_members')
        .insert([
          { room_id: newRoom.id, user_id: currentUser.id },
          { room_id: newRoom.id, user_id: friendId },
        ]);

      if (membersError) throw membersError;

      toast({ title: 'Chat Started', description: `Started chat with ${friendUsername}` });
      setCurrentRoomId(newRoom.id);
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim()) {
      toast({ title: 'Error', description: 'Please enter a group name', variant: 'destructive' });
      return;
    }

    try {
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: groupName.trim(),
          type: 'group',
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: memberError } = await supabase
        .from('room_members')
        .insert({ 
          room_id: newRoom.id, 
          user_id: currentUser.id 
        });

      if (memberError) throw memberError;

      await supabase.from('messages').insert({
        room_id: newRoom.id,
        user_id: 'system',
        username: 'SYSTEM',
        color: '#00ff00',
        content: `Group "${groupName.trim()}" created by ${currentUser.username}`,
        message_type: 'text'
      });

      toast({ 
        title: 'Group Created!', 
        description: `${groupName} is ready. Invite friends to join!` 
      });
      
      setGroupName('');
      setShowCreateGroup(false);
      setCurrentRoomId(newRoom.id);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create group', 
        variant: 'destructive' 
      });
    }
  };

  // Invite friend to group
  const inviteFriendToGroup = async (friendId: string, friendUsername: string) => {
    if (!currentRoomId || !currentUser) return;

    try {
      const { data: existing } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', currentRoomId)
        .eq('user_id', friendId)
        .single();

      if (existing) {
        toast({ title: 'Already Member', description: `${friendUsername} is already in this group` });
        return;
      }

      await supabase
        .from('room_members')
        .insert({
          room_id: currentRoomId,
          user_id: friendId
        });

      await supabase.from('messages').insert({
        room_id: currentRoomId,
        user_id: 'system',
        username: 'SYSTEM',
        color: '#00ff00',
        content: `${friendUsername} joined the group`,
        message_type: 'text'
      });

      toast({ 
        title: 'Friend Added!', 
        description: `${friendUsername} has been added to the group` 
      });
      
      setShowInviteToGroup(false);
    } catch (error: any) {
      console.error('Error inviting friend:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!currentUser || !currentRoomId || !newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: currentRoomId,
          user_id: currentUser.id,
          username: currentUser.username,
          color: currentUser.color,
          content: newMessage.trim(),
          message_type: 'text',
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  // Upload file
  const handleFileUpload = async (file: File, messageType: 'image' | 'file') => {
    if (!currentUser || !currentRoomId || isUploading) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File Too Large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${currentRoomId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          room_id: currentRoomId,
          user_id: currentUser.id,
          username: currentUser.username,
          color: currentUser.color,
          message_type: messageType,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });

      if (messageError) throw messageError;

      toast({ title: 'File Uploaded', description: `${file.name} uploaded successfully` });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // Create webhook
  const handleCreateWebhook = async () => {
    if (!currentUser || !currentRoomId) return;

    try {
      const webhookSecret = `whsec_${Math.random().toString(36).substr(2, 24)}`;
      const webhookUrl = `${window.location.origin}/webhook/${currentRoomId}`;

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          room_id: currentRoomId,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Webhook Created', description: 'Copy the URL and secret to use it' });
      setWebhooks([...webhooks, data]);
    } catch (error: any) {
      console.error('Error creating webhook:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(id);
    toast({ title: 'Copied!', description: 'Text copied to clipboard' });
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  // Create webhook room
  const handleCreateWebhookRoom = async () => {
    if (!currentUser || !webhookRoomName.trim()) return;

    try {
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: `🔗 ${webhookRoomName.trim()}`,
          type: 'webhook',
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      await supabase.from('room_members').insert({ 
        room_id: newRoom.id, 
        user_id: currentUser.id 
      });

      const webhookSecret = `whsec_${Math.random().toString(36).substr(2, 24)}`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const webhookUrl = `${supabaseUrl}/functions/v1/tradingview-webhook/${newRoom.id}`;

      const { data: webhook, error: webhookError } = await supabase
        .from('webhooks')
        .insert({
          room_id: newRoom.id,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (webhookError) throw webhookError;

      await supabase.from('messages').insert({
        room_id: newRoom.id,
        user_id: 'system',
        username: 'SYSTEM',
        color: '#00ff00',
        content: `🔗 Webhook Room Created!\n\n📡 Webhook URL:\n${webhookUrl}\n\n🔑 Secret:\n${webhookSecret}\n\n📊 Use this URL in TradingView Alert to receive signals here!`,
        message_type: 'text'
      });

      toast({ 
        title: '🔗 Webhook Room Created!', 
        description: 'Copy webhook URL from chat to use in TradingView' 
      });
      
      setWebhookRoomName('');
      setShowCreateWebhookRoom(false);
      setCurrentRoomId(newRoom.id);

    } catch (error: any) {
      console.error('Error creating webhook room:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Delete any chat room (with cascade)
  const handleDeleteRoom = async (roomId: string) => {
    if (!roomId || !confirm('Delete this room and all its data? This action cannot be undone!')) return;

    try {
      // Delete messages
      await supabase.from('messages').delete().eq('room_id', roomId);
      
      // Delete room members
      await supabase.from('room_members').delete().eq('room_id', roomId);
      
      // Delete webhooks
      await supabase.from('webhooks').delete().eq('room_id', roomId);
      
      // Get broker connections for this room
      const { data: connections } = await supabase
        .from('broker_connections')
        .select('id')
        .eq('room_id', roomId);
      
      // Delete MT5 commands for those connections
      if (connections && connections.length > 0) {
        const connectionIds = connections.map(c => c.id);
        await supabase.from('mt5_commands').delete().in('connection_id', connectionIds);
      }
      
      // Delete broker connections
      await supabase.from('broker_connections').delete().eq('room_id', roomId);
      
      // Delete the room
      await supabase.from('chat_rooms').delete().eq('id', roomId);

      toast({ title: '✅ Room Deleted', description: 'Chat room and all data permanently deleted' });
      
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
        setMessages([]);
        setRooms(prev => prev.filter(r => r.id !== roomId));
      }
    } catch (error: any) {
      console.error('Error deleting room:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Keep old function for backward compatibility
  const handleDeleteWebhookRoom = handleDeleteRoom;

  // Load and show webhook info
  const loadAndShowWebhookInfo = async () => {
    if (!currentRoomId) return;
    
    try {
      const { data: webhookData, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('room_id', currentRoomId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          await createWebhookForRoom();
          return;
        }
        throw error;
      }
      
      if (webhookData) {
        setCurrentWebhookUrl(webhookData.webhook_url);
        setCurrentWebhookSecret(webhookData.webhook_secret);
        setShowWebhookInfo(true);
      }
    } catch (error: any) {
      console.error('Error loading webhook info:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load webhook info', 
        variant: 'destructive' 
      });
    }
  };

  // Create webhook for room
  const createWebhookForRoom = async () => {
    if (!currentUser || !currentRoomId) return;
    
    try {
      const webhookSecret = `whsec_${Math.random().toString(36).substr(2, 24)}`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const webhookUrl = `${supabaseUrl}/functions/v1/tradingview-webhook/${currentRoomId}`;

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .insert({
          room_id: currentRoomId,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentWebhookUrl(webhook.webhook_url);
      setCurrentWebhookSecret(webhook.webhook_secret);
      setShowWebhookInfo(true);
      
      toast({ title: 'Webhook Created', description: 'Webhook URL is ready!' });
    } catch (error: any) {
      console.error('Error creating webhook:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const currentRoom = rooms.find(r => r.id === currentRoomId);

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-terminal-green animate-pulse">Initializing ABLE Messenger...</div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col md:flex-row font-mono overflow-hidden"
      style={{ 
        backgroundColor: colors.background,
        color: colors.foreground 
      }}
    >
      {/* Mobile Header */}
      {isMobileView && (
        <div 
          className="flex items-center justify-between p-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          {!showSidebar && currentRoomId ? (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowSidebar(true);
                  setCurrentRoomId(null);
                }}
                className="text-terminal-green"
              >
                ← Back
              </Button>
              <span className="font-bold truncate flex-1 text-center px-2">
                {roomNames[currentRoomId] || 'Chat'}
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowVideoCall(true)}
              >
                <Video className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="font-bold text-terminal-green">ABLE Messenger</span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Sidebar */}
      <div 
        className={`
          ${isMobileView 
            ? showSidebar 
              ? 'flex w-full h-full' 
              : 'hidden' 
            : 'flex w-72'
          } 
          flex-col flex-shrink-0
        `}
        style={{ borderRight: isMobileView ? 'none' : `1px solid ${colors.border}` }}
      >
        {/* User Profile */}
        <div 
          className="p-4"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3 mb-2">
            {/* Avatar - clickable for upload */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer hover:opacity-80 overflow-hidden relative" 
              style={{ backgroundColor: currentUser?.color }}
              onClick={() => avatarInputRef.current?.click()}
              title="Click to change avatar"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                currentUser?.username[0]
              )}
            </div>
            <input
              type="file"
              ref={avatarInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            />
            <div className="flex-1">
              <div className="font-bold">{currentUser?.username}</div>
              <div className="text-xs opacity-60">● Online</div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setTempUsername(currentUser?.username || '');
                setShowSettings(true);
              }}
              style={{ color: colors.foreground }}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Friends List */}
        <div 
          className="p-4"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">FRIENDS</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowAddFriend(true)}
              style={{ color: colors.foreground }}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-40">
            {friends.length === 0 ? (
              <div className="text-xs opacity-60 text-center py-4">No friends yet</div>
            ) : (
              friends.map(friendship => {
                const friend = friendship.friend_id === currentUser?.id 
                  ? friendship.friend
                  : friendship.friend;
                const friendId = friendship.friend_id === currentUser?.id ? friendship.user_id : friendship.friend_id;
                const displayName = getDisplayName(friendId, friend?.username || 'Unknown');
                
                return (
                  <div
                    key={friendship.id}
                    className="flex items-center gap-2 p-2 cursor-pointer rounded group"
                    style={{
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: colors.primary }}
                    ></div>
                    <span 
                      className="text-sm flex-1"
                      onClick={() => {
                        const friendData = friendship.friend_id === currentUser?.id 
                          ? { id: friendship.user_id, username: friend?.username || 'Unknown' }
                          : { id: friendship.friend_id, username: friend?.username || 'Unknown' };
                        startPrivateChat(friendData.id, friendData.username);
                      }}
                    >
                      {displayName}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6"
                      style={{ color: colors.foreground }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFriendId(friendId);
                        setNewNickname(nicknames[friendId] || '');
                        setShowEditNickname(true);
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Rooms List */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">ROOMS</h3>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowCreateWebhookRoom(true)}
                title="Create Webhook Room"
                style={{ color: colors.foreground }}
              >
                <Webhook className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowCreateGroup(true)}
                style={{ color: colors.foreground }}
              >
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {rooms.length === 0 ? (
              <div className="text-xs opacity-60 text-center py-4">No rooms yet</div>
            ) : (
              rooms.map(room => (
                <div
                  key={room.id}
                  className="p-2 mb-1 rounded cursor-pointer"
                  style={{
                    backgroundColor: currentRoomId === room.id ? colors.accent : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentRoomId !== room.id) {
                      e.currentTarget.style.backgroundColor = colors.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentRoomId !== room.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onClick={() => setCurrentRoomId(room.id)}
                >
                  <div className="text-sm font-bold">
                    {roomNames[room.id] || 'Loading...'}
                  </div>
                  <div className="text-xs opacity-60">
                    {room.type === 'private' ? '1:1 Chat' : room.type === 'webhook' ? '🔗 Webhook' : 'Group Chat'}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Chat Window */}
      <div 
        className={`
          ${isMobileView 
            ? showSidebar 
              ? 'hidden' 
              : 'flex w-full h-full' 
            : 'flex flex-1'
          } 
          flex-col min-w-0
        `}
      >
        {currentRoomId ? (
          <>
            {/* Chat Header - hide on mobile (using Mobile Header instead) */}
            {!isMobileView && (
              <div 
                className="p-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${colors.border}` }}
              >
              <div>
                <h2 className="font-bold text-lg">
                  {currentRoomId && roomNames[currentRoomId] ? roomNames[currentRoomId] : 'Chat'}
                </h2>
                <div className="text-xs opacity-60">
                  {currentRoom?.type === 'webhook' ? '🔗 Webhook Room' : currentRoom?.type === 'group' ? 'Group Chat' : 'Private Chat'}
                </div>
              </div>
              
              <div className="flex gap-2">
                {currentRoom?.type === 'webhook' && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={async () => {
                      const { data, error } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('room_id', currentRoomId)
                        .order('created_at', { ascending: true });
                      
                      if (data) {
                        setMessages(data as Message[]);
                        toast({ title: 'Messages refreshed!' });
                        setTimeout(scrollToBottom, 100);
                      }
                    }}
                    title="Refresh Messages"
                    className="text-green-500 hover:text-green-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
                
                {currentRoom?.type === 'webhook' && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => loadAndShowWebhookInfo()}
                    title="Show Webhook URL"
                    className="text-blue-500 hover:text-blue-400"
                  >
                    <Webhook className="w-4 h-4" />
                  </Button>
                )}
                
                {currentRoom?.type === 'webhook' && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteWebhookRoom(currentRoomId)}
                    title="Delete Webhook Room"
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                
                {currentRoom?.type === 'webhook' && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowAPIBridge(true)}
                    title="API Bridge - Connect to Broker"
                    className="text-purple-500 hover:text-purple-400"
                  >
                    <PlugZap className="w-4 h-4" />
                  </Button>
                )}
                
                {/* MT5 Status Indicator */}
                {currentRoom?.type === 'webhook' && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isMt5Connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isMt5Connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    MT5 {isMt5Connected ? 'Connected' : 'Offline'}
                  </div>
                )}
                
                {/* Auto Forward Toggle */}
                {currentRoom?.type === 'webhook' && isMt5Connected && (
                  <Button
                    variant={autoForwardEnabled ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAutoForwardEnabled(!autoForwardEnabled)}
                    className={`text-xs h-7 ${autoForwardEnabled ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                    title="Auto-forward all incoming webhook signals to MT5"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {autoForwardEnabled ? 'Auto ON' : 'Auto OFF'}
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowVideoCall(true)}
                  title="Start Video Call"
                  style={{ color: colors.foreground }}
                >
                  <Video className="w-4 h-4" />
                </Button>

                {/* Delete Room Button - Available for all room types */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDeleteRoom(currentRoomId)}
                  title="Delete Room"
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                {currentRoom?.type === 'group' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowInviteToGroup(true)}
                    style={{ color: colors.foreground }}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Invite
                  </Button>
                )}
              </div>
            </div>
            )}

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-terminal-green/60 py-8">No messages yet. Start the conversation!</div>
              ) : (
                messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`mb-4 group relative ${message.user_id === currentUser?.id ? 'cursor-pointer' : ''}`}
                    onClick={() => message.user_id === currentUser?.id && message.message_type !== 'webhook' && setSelectedMessageId(
                      selectedMessageId === message.id ? null : message.id
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden" 
                        style={{ backgroundColor: message.color }}
                      >
                        {message.avatar_url ? (
                          <img src={message.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          message.username[0]
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-sm" style={{ color: message.color }}>{message.username}</span>
                          <span className="text-xs text-terminal-green/40">{formatTime(message.created_at)}</span>
                        </div>
                        
                        {message.message_type === 'text' && (
                          <div className="text-terminal-green/90 break-words">{message.content}</div>
                        )}
                        
                        {message.message_type === 'image' && (
                          <div className="mt-2">
                            <img src={message.file_url} alt={message.file_name} className="max-w-sm rounded border border-terminal-green/30 cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); window.open(message.file_url, '_blank'); }} />
                          </div>
                        )}
                        
                        {message.message_type === 'file' && (
                          <div className="mt-2 p-3 bg-terminal-green/10 border border-terminal-green/30 rounded inline-block">
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              <div>
                                <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="text-terminal-green hover:underline font-bold" onClick={(e) => e.stopPropagation()}>{message.file_name}</a>
                                <div className="text-xs text-terminal-green/60">{formatFileSize(message.file_size)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {message.message_type === 'webhook' && (
                          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                            <pre className="text-sm whitespace-pre-wrap text-blue-300">{message.content}</pre>
                            {message.webhook_data && (
                              <>
                                {/* Parsed Trade Data */}
                                <div className="mt-3 p-2 bg-black/30 rounded text-xs">
                                  {(() => {
                                    const data = message.webhook_data as any;
                                    const parsedTrade = data.parsed_trade || data;
                                    const symbol = parsedTrade.symbol || data.ticker || data.symbol || '';
                                    const action = parsedTrade.action || data.action || '';
                                    const price = parsedTrade.price || data.price || data.close || '';
                                    const quantity = parsedTrade.lotSize || parsedTrade.quantity || data.lot || data.quantity || 0.01;
                                    
                                    return (
                                      <div className="space-y-1">
                                        <div className="text-blue-300">🏷️ Symbol: <span className="font-bold">{symbol || 'N/A'}</span></div>
                                        <div className="text-blue-300">📌 Action: <span className={`font-bold ${action.toLowerCase().includes('buy') ? 'text-green-400' : action.toLowerCase().includes('sell') ? 'text-red-400' : 'text-yellow-400'}`}>{action || 'N/A'}</span></div>
                                        <div className="text-blue-300">💰 Price: <span className="font-bold">{price || 'N/A'}</span></div>
                                        <div className="text-blue-300">📊 Quantity: <span className="font-bold">{quantity}</span></div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* Forward to MT5 Button */}
                                <div className="mt-3 flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant={isMt5Connected ? "default" : "outline"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleForwardToMT5(message);
                                    }}
                                    disabled={!isMt5Connected || forwardingMessageId === message.id}
                                    className={`h-8 text-xs ${isMt5Connected ? 'bg-green-600 hover:bg-green-700' : 'border-red-500/30 text-red-400'}`}
                                  >
                                    {forwardingMessageId === message.id ? (
                                      <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Forward className="w-3 h-3 mr-1" />
                                        {isMt5Connected ? 'Forward to MT5' : 'MT5 Not Connected'}
                                      </>
                                    )}
                                  </Button>
                                  
                                  {!isMt5Connected && (
                                    <span className="text-xs text-red-400/70">
                                      เชื่อมต่อ MT5 ใน API Bridge ก่อน
                                    </span>
                                  )}
                                </div>
                                
                                <details className="mt-2">
                                  <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">📊 Raw Data</summary>
                                  <pre className="text-xs mt-1 overflow-auto bg-black/30 p-2 rounded">
                                    {JSON.stringify(message.webhook_data, null, 2)}
                                  </pre>
                                </details>
                              </>
                            )}
                          </div>
                        )}

                        {/* Action Buttons for own messages (not webhook) */}
                        {selectedMessageId === message.id && message.user_id === currentUser?.id && message.message_type !== 'webhook' && (
                          <div className="flex gap-2 mt-2 animate-in fade-in">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(message.id);
                              }}
                              className="h-7 text-xs"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setForwardingMessage(message);
                                setShowForwardDialog(true);
                              }}
                              className="h-7 text-xs border-terminal-green/30"
                            >
                              <Share2 className="w-3 h-3 mr-1" />
                              Forward
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-terminal-green/30">
              {isUploading && (
                <div className="mb-2 text-xs text-terminal-green/60">Uploading file...</div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'file');
                  }}
                />
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'image');
                  }}
                />
                
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isUploading}>
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-black border-terminal-green/30 text-terminal-green"
                  disabled={isSending || isUploading}
                />
                <Button onClick={handleSendMessage} disabled={isSending || isUploading || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-terminal-green/60">
            Select a chat to start messaging
          </div>
        )}
      </div>

      {/* Forward Message Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              Select a chat to forward this message
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-60">
            {rooms
              .filter(room => room.type !== 'webhook')
              .map(room => (
                <div
                  key={room.id}
                  className="p-3 hover:bg-terminal-green/10 cursor-pointer rounded flex items-center justify-between"
                  onClick={() => handleForwardMessage(room.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-terminal-green/20 flex items-center justify-center">
                      {room.type === 'group' ? <Users className="w-4 h-4" /> : '💬'}
                    </div>
                    <span>{roomNames[room.id] || room.name || 'Chat'}</span>
                  </div>
                  <span className="text-xs opacity-60">
                    {room.type === 'group' ? 'Group' : 'Private'}
                  </span>
                </div>
              ))
            }
            
            {rooms.filter(r => r.type !== 'webhook').length === 0 && (
              <div className="text-center py-4 opacity-60">No chats available</div>
            )}
          </ScrollArea>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowForwardDialog(false)} className="border-terminal-green/30">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              Enter username to add as friend
            </DialogDescription>
          </DialogHeader>
          <Input
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
            placeholder="Enter username..."
            className="bg-black border-terminal-green/30 text-terminal-green"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddFriend(false)} className="border-terminal-green/30">
              Cancel
            </Button>
            <Button onClick={handleAddFriend} disabled={!friendUsername.trim()}>
              Add Friend
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              Enter a name for your group
            </DialogDescription>
          </DialogHeader>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            placeholder="Group name..."
            className="bg-black border-terminal-green/30 text-terminal-green"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreateGroup(false)} className="border-terminal-green/30">
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!groupName.trim()}>
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Room Dialog */}
      <Dialog open={showCreateWebhookRoom} onOpenChange={setShowCreateWebhookRoom}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>🔗 Create Webhook Room</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              สร้างห้องสำหรับรับสัญญาณจาก TradingView
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={webhookRoomName}
              onChange={(e) => setWebhookRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateWebhookRoom()}
              placeholder="ชื่อห้อง (เช่น BTC Signals, Gold Alerts)"
              className="bg-black border-terminal-green/30 text-terminal-green"
            />
            <div className="text-xs text-terminal-green/60">
              หลังสร้างห้อง คุณจะได้รับ Webhook URL สำหรับใส่ใน TradingView Alert
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreateWebhookRoom(false)} className="border-terminal-green/30">
              Cancel
            </Button>
            <Button onClick={handleCreateWebhookRoom} disabled={!webhookRoomName.trim()}>
              Create Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite to Group Dialog */}
      <Dialog open={showInviteToGroup} onOpenChange={setShowInviteToGroup}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Invite to Group</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              Select a friend to invite
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-60">
            {friends.length === 0 ? (
              <div className="text-center py-4 opacity-60">No friends to invite</div>
            ) : (
              friends.map(friendship => {
                const friend = friendship.friend;
                const friendId = friendship.friend_id === currentUser?.id ? friendship.user_id : friendship.friend_id;
                const displayName = getDisplayName(friendId, friend?.username || 'Unknown');
                
                return (
                  <div
                    key={friendship.id}
                    className="p-2 hover:bg-terminal-green/10 cursor-pointer rounded"
                    onClick={() => inviteFriendToGroup(friendId, displayName)}
                  >
                    {displayName}
                  </div>
                );
              })
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Nickname Dialog */}
      <Dialog open={showEditNickname} onOpenChange={setShowEditNickname}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Edit Nickname</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              Set a personal nickname for this friend (only visible to you)
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && saveNickname()}
            placeholder="Enter nickname..."
            className="bg-black border-terminal-green/30 text-terminal-green"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEditNickname(false)} className="border-terminal-green/30">
              Cancel
            </Button>
            <Button onClick={saveNickname} disabled={!newNickname.trim()}>
              Save Nickname
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Settings Dialog */}
      <Dialog open={showRoomSettings} onOpenChange={setShowRoomSettings}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-terminal-green/60 mb-2">Webhooks</div>
              {webhooks.length === 0 ? (
                <div className="text-xs opacity-60 mb-2">No webhooks configured</div>
              ) : (
                webhooks.map(webhook => (
                  <div key={webhook.id} className="mb-4 p-2 border border-terminal-green/20 rounded">
                    <div className="text-xs text-terminal-green/60 mb-1">URL:</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-terminal-green/10 p-2 rounded flex-1 overflow-auto">{webhook.webhook_url}</code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(webhook.webhook_url, webhook.id)}>
                        {copiedWebhook === webhook.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="text-xs text-terminal-green/60 mb-1">Secret:</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-terminal-green/10 p-2 rounded flex-1">{webhook.webhook_secret}</code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(webhook.webhook_secret, webhook.id + '-secret')}>
                        {copiedWebhook === webhook.id + '-secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button onClick={handleCreateWebhook} size="sm">
                Create New Webhook
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Webhook Info Dialog */}
      <Dialog open={showWebhookInfo} onOpenChange={setShowWebhookInfo}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green max-w-2xl">
          <DialogHeader>
            <DialogTitle>🔗 Webhook Information</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              ใช้ข้อมูลนี้ใน TradingView Alert
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-terminal-green/60 mb-1 block">Webhook URL:</label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-terminal-green/10 p-3 rounded flex-1 overflow-auto break-all border border-terminal-green/30">
                  {currentWebhookUrl}
                </code>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    navigator.clipboard.writeText(currentWebhookUrl);
                    toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-terminal-green/60 mb-1 block">Secret Key:</label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-terminal-green/10 p-3 rounded flex-1 border border-terminal-green/30">
                  {currentWebhookSecret}
                </code>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    navigator.clipboard.writeText(currentWebhookSecret);
                    toast({ title: 'Copied!', description: 'Secret copied to clipboard' });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="border border-terminal-green/30 rounded p-4 mt-4">
              <h4 className="font-bold mb-2">📊 วิธีใช้งานกับ TradingView:</h4>
              <ol className="text-sm space-y-2 text-terminal-green/80">
                <li>1. ไปที่ TradingView → สร้าง Alert ใหม่</li>
                <li>2. ใน "Notifications" เปิด "Webhook URL"</li>
                <li>3. วาง Webhook URL ด้านบน</li>
                <li>4. ใน "Message" ใส่ JSON format:</li>
              </ol>
              <pre className="text-xs bg-terminal-green/5 p-2 rounded mt-2 overflow-auto">
{`{
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": "{{close}}",
  "time": "{{time}}",
  "message": "Your custom message"
}`}
              </pre>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-terminal-green/30">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const { data: tvUser } = await supabase
                      .from('users')
                      .select('id')
                      .eq('id', 'tradingview')
                      .maybeSingle();

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

                    const { error } = await supabase.from('messages').insert({
                      room_id: currentRoomId,
                      user_id: 'tradingview',
                      username: '📊 TradingView',
                      color: '#2962FF',
                      content: `📊 **TradingView Alert**\n\n🏷️ Symbol: TEST\n📌 Action: BUY\n💰 Price: 100.00\n\n💬 🧪 Test alert from ABLE Messenger`,
                      message_type: 'webhook',
                      webhook_data: testData
                    });

                    if (error) throw error;
                    
                    toast({ title: '✅ Test Sent!', description: 'Check the chat for the test message' });
                    setShowWebhookInfo(false);
                  } catch (error) {
                    console.error('Test webhook error:', error);
                    toast({ title: 'Test Failed', description: 'Could not send test webhook', variant: 'destructive' });
                  }
                }}
                className="border-terminal-green/30"
              >
                🧪 Send Test Alert
              </Button>
              
              <Button onClick={() => setShowWebhookInfo(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-terminal-green/60 mb-2">Profile Picture</div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer hover:opacity-80 overflow-hidden"
                  style={{ backgroundColor: currentUser?.color }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.username[0]
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => avatarInputRef.current?.click()}
                  className="border-terminal-green/30"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Change Avatar
                </Button>
              </div>
            </div>
            <div>
              <div className="text-sm text-terminal-green/60 mb-2">Username</div>
              <Input
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveUsername()}
                placeholder="Enter new username..."
                className="bg-black border-terminal-green/30 text-terminal-green"
                maxLength={30}
              />
            </div>
            <div>
              <div className="text-sm text-terminal-green/60 mb-1">Email</div>
              <code className="text-xs bg-terminal-green/10 p-2 rounded block">{authUser?.email}</code>
            </div>
            <div>
              <div className="text-sm text-terminal-green/60 mb-1">Color</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: currentUser?.color }}></div>
                <span className="text-sm">{currentUser?.color}</span>
              </div>
            </div>
            
            {/* Sound Settings */}
            <div className="border-t border-terminal-green/20 pt-4">
              <div className="text-sm text-terminal-green/60 mb-2">Notification Sound</div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm">Enable notifications</span>
                <Button
                  variant={soundEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={soundEnabled 
                    ? "bg-terminal-green text-black hover:bg-terminal-green/80" 
                    : "border-terminal-green/30"
                  }
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 mr-1" /> : <VolumeX className="w-4 h-4 mr-1" />}
                  {soundEnabled ? 'On' : 'Off'}
                </Button>
              </div>
              
              {soundEnabled && (
                <div className="space-y-2">
                  <div className="text-xs text-terminal-green/60">Select sound:</div>
                  {Object.entries(NOTIFICATION_SOUNDS).map(([key, sound]) => (
                    <div 
                      key={key}
                      className={`
                        flex items-center justify-between p-2 rounded border cursor-pointer transition-colors
                        ${selectedSound === key 
                          ? 'border-terminal-green bg-terminal-green/10' 
                          : 'border-terminal-green/20 hover:border-terminal-green/50'
                        }
                      `}
                      onClick={() => setSelectedSound(key as keyof typeof NOTIFICATION_SOUNDS)}
                    >
                      <span className="text-sm">{sound.name}</span>
                      <div className="flex items-center gap-2">
                        {selectedSound === key && (
                          <Check className="w-4 h-4 text-terminal-green" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            playNotificationSound(key as keyof typeof NOTIFICATION_SOUNDS);
                          }}
                          className="h-7 px-2 hover:bg-terminal-green/20"
                        >
                          ▶️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowSettings(false)} className="border-terminal-green/30">
                Cancel
              </Button>
              <Button onClick={handleSaveUsername} disabled={!tempUsername.trim() || tempUsername === currentUser?.username}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Call */}
      {showVideoCall && currentRoomId && currentUser && (
        <VideoCall
          roomId={currentRoomId}
          currentUser={currentUser}
          onClose={() => setShowVideoCall(false)}
        />
      )}

      {/* API Bridge Panel */}
      {showAPIBridge && currentRoomId && currentUser && (
        <Dialog open={showAPIBridge} onOpenChange={setShowAPIBridge}>
          <DialogContent className="max-w-md p-0 w-[calc(100vw-1.5rem)] sm:w-full max-h-[90vh] h-[90vh] sm:h-[80vh] overflow-hidden flex flex-col min-h-0">
            <APIBridgePanel
              roomId={currentRoomId}
              userId={currentUser.id}
              onClose={() => setShowAPIBridge(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LiveChatReal;
