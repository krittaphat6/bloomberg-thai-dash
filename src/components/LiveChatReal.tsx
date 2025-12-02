import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { User, Friendship, ChatRoom, Message, Webhook as WebhookType, FriendNickname } from '@/types/chat';
import { UserPlus, Users, Settings, Paperclip, Image as ImageIcon, Send, X, Copy, Check, Edit2, Video, Webhook, Trash2 } from 'lucide-react';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { getThemeColors } from '@/utils/themeColors';
import { VideoCall } from './VideoCall';

const LiveChatReal = () => {
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
  const [friendUsername, setFriendUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [webhookRoomName, setWebhookRoomName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [currentWebhookUrl, setCurrentWebhookUrl] = useState('');
  const [currentWebhookSecret, setCurrentWebhookSecret] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Helper functions
  const getUserId = () => {
    let userId = localStorage.getItem('able_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('able_user_id', userId);
    }
    return userId;
  };

  const generateColor = (id: string) => {
    const colors = ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff6b6b', '#4ecdc4', '#95e1d3'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const generateUsername = (id: string) => {
    const adjectives = ['Crypto', 'Quantum', 'Cyber', 'Digital', 'Neural', 'Matrix'];
    const nouns = ['Trader', 'Hacker', 'Agent', 'Ghost', 'Phoenix', 'Nexus'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `${adjectives[hash % adjectives.length]}${nouns[(hash * 2) % nouns.length]}${hash % 100}`;
  };

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

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      const userId = getUserId();
      const storedUsername = localStorage.getItem('able_username');
      const storedColor = localStorage.getItem('able_color');
      
      const username = storedUsername || generateUsername(userId);
      const color = storedColor || generateColor(userId);
      
      if (!storedUsername) localStorage.setItem('able_username', username);
      if (!storedColor) localStorage.setItem('able_color', color);

      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          username,
          color,
          status: 'online',
          last_seen: new Date().toISOString(),
        });

      if (error) {
        console.error('Error initializing user:', error);
        toast({ title: 'Connection Error', description: 'Failed to initialize user', variant: 'destructive' });
      } else {
        setCurrentUser({ id: userId, username, color, status: 'online', last_seen: new Date().toISOString() });
        setIsInitialized(true);
      }
    };

    initUser();
  }, []);

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

  // Subscribe to username changes
  useEffect(() => {
    if (!currentUser) return;

    const usersChannel = supabase
      .channel('users-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users'
      }, (payload) => {
        // Reload friends and rooms to show new names
        const loadFriendships = async () => {
          const { data, error } = await supabase
            .from('friendships')
            .select('*, friend:users!friendships_friend_id_fkey(*)')
            .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

          if (!error) {
            setFriends(data as any || []);
          }
        };
        
        const loadRooms = async () => {
          const { data: memberData, error } = await supabase
            .from('room_members')
            .select('room_id, chat_rooms(*)')
            .eq('user_id', currentUser.id);

          if (!error) {
            const roomsData = memberData?.map(m => m.chat_rooms).filter(Boolean) || [];
            setRooms(roomsData as any);
          }
        };

        loadFriendships();
        loadRooms();
      })
      .subscribe();

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
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(scrollToBottom, 100);
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
        
        // ถ้าเป็น webhook room และมี webhook อยู่แล้ว ให้ set URL
        if (data && data.length > 0) {
          setCurrentWebhookUrl(data[0].webhook_url);
          setCurrentWebhookSecret(data[0].webhook_secret);
        }
      }
    };

    loadWebhooks();
  }, [currentRoomId]);

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
      // 1. Update in users table (so everyone sees the new name)
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: newUsername })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // 2. Update local state
      setCurrentUser({ ...currentUser, username: newUsername });
      
      // 3. Update localStorage
      localStorage.setItem('able_username', newUsername);

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
      // 1. สร้างห้องแชทใหม่ (type: 'webhook')
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

      // 2. เพิ่ม user เป็น member
      await supabase.from('room_members').insert({ 
        room_id: newRoom.id, 
        user_id: currentUser.id 
      });

      // 3. สร้าง webhook สำหรับห้องนี้
      const webhookSecret = `whsec_${Math.random().toString(36).substr(2, 24)}`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const projectId = supabaseUrl.split('//')[1].split('.')[0];
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

      // 4. ส่งข้อความต้อนรับพร้อม webhook URL
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

  // Delete webhook room
  const handleDeleteWebhookRoom = async (roomId: string) => {
    if (!roomId || !confirm('ต้องการลบ Webhook Room นี้หรือไม่?')) return;

    try {
      // ลบ webhook ก่อน
      await supabase.from('webhooks').delete().eq('room_id', roomId);
      
      // ลบ messages
      await supabase.from('messages').delete().eq('room_id', roomId);
      
      // ลบ room members
      await supabase.from('room_members').delete().eq('room_id', roomId);
      
      // ลบห้อง
      await supabase.from('chat_rooms').delete().eq('id', roomId);

      toast({ title: 'Deleted', description: 'Webhook room deleted successfully' });
      setCurrentRoomId(null);
      
    } catch (error: any) {
      console.error('Error deleting webhook room:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

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
        // ถ้าไม่มี webhook ให้สร้างใหม่
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
      className="h-full flex font-mono"
      style={{ 
        backgroundColor: colors.background,
        color: colors.foreground 
      }}
    >
      {/* Sidebar */}
      <div 
        className="w-72 flex flex-col"
        style={{ borderRight: `1px solid ${colors.border}` }}
      >
        {/* User Profile */}
        <div 
          className="p-4"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" 
              style={{ backgroundColor: currentUser?.color }}
            >
              {currentUser?.username[0]}
            </div>
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
                    {room.type === 'private' ? '1:1 Chat' : 'Group Chat'}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {currentRoomId ? (
          <>
            {/* Chat Header */}
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
                {/* Show Webhook URL Button */}
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
                
                {/* Delete Webhook Room Button */}
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
                
                {/* Video Call Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowVideoCall(true)}
                  title="Start Video Call"
                  style={{ color: colors.foreground }}
                >
                  <Video className="w-4 h-4" />
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

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-terminal-green/60 py-8">No messages yet. Start the conversation!</div>
              ) : (
                messages.map(message => (
                  <div key={message.id} className="mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: message.color }}>
                        {message.username[0]}
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
                            <img src={message.file_url} alt={message.file_name} className="max-w-sm rounded border border-terminal-green/30 cursor-pointer hover:opacity-80" onClick={() => window.open(message.file_url, '_blank')} />
                          </div>
                        )}
                        
                        {message.message_type === 'file' && (
                          <div className="mt-2 p-3 bg-terminal-green/10 border border-terminal-green/30 rounded inline-block">
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              <div>
                                <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="text-terminal-green hover:underline font-bold">{message.file_name}</a>
                                <div className="text-xs text-terminal-green/60">{formatFileSize(message.file_size)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {message.message_type === 'webhook' && (
                          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                            <pre className="text-sm whitespace-pre-wrap text-blue-300">{message.content}</pre>
                            {message.webhook_data && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">📊 Raw Data</summary>
                                <pre className="text-xs mt-1 overflow-auto bg-black/30 p-2 rounded">
                                  {JSON.stringify(message.webhook_data, null, 2)}
                                </pre>
                              </details>
                            )}
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateWebhookRoom(false)} className="border-terminal-green/30">
                Cancel
              </Button>
              <Button onClick={handleCreateWebhookRoom} disabled={!webhookRoomName.trim()}>
                Create Webhook Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Nickname Dialog */}
      <Dialog open={showEditNickname} onOpenChange={setShowEditNickname}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Set Nickname</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              Give your friend a custom nickname (only you can see it)
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && saveNickname()}
            placeholder="Enter nickname..."
            className="bg-black border-terminal-green/30 text-terminal-green"
            maxLength={50}
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

      {/* Invite to Group Dialog */}
      <Dialog open={showInviteToGroup} onOpenChange={setShowInviteToGroup}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Invite Friend to Group</DialogTitle>
            <DialogDescription className="text-terminal-green/60">
              Select a friend to add to {roomNames[currentRoomId || '']}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-60">
            {friends.length === 0 ? (
              <div className="text-center py-4 text-terminal-green/60">No friends to invite</div>
            ) : (
              friends.map(friendship => {
                const friend = friendship.friend_id === currentUser?.id 
                  ? friendship.friend 
                  : friendship.friend;
                const friendId = friendship.friend_id === currentUser?.id 
                  ? friendship.user_id 
                  : friendship.friend_id;
                
                return (
                  <div
                    key={friendship.id}
                    className="p-2 hover:bg-terminal-green/10 cursor-pointer rounded flex items-center justify-between"
                    onClick={() => {
                      inviteFriendToGroup(friendId, friend?.username || 'Unknown');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: friend?.color }}
                      >
                        {friend?.username[0]}
                      </div>
                      <span>{friend?.username}</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      Invite
                    </Button>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Room Settings Dialog */}
      <Dialog open={showRoomSettings} onOpenChange={setShowRoomSettings}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green max-w-2xl">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-bold mb-2">Webhooks</h4>
              {webhooks.length === 0 ? (
                <div className="text-sm text-terminal-green/60 mb-2">No webhooks configured</div>
              ) : (
                webhooks.map(webhook => (
                  <div key={webhook.id} className="p-4 border border-terminal-green/30 rounded mb-2">
                    <div className="text-xs text-terminal-green/60 mb-1">Webhook URL:</div>
                    <div className="flex items-center gap-2 mb-2">
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
            {/* Webhook URL */}
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
            
            {/* Webhook Secret */}
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
            
            {/* TradingView Instructions */}
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
            
            {/* Test Button */}
            <div className="flex justify-between items-center pt-4 border-t border-terminal-green/30">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch(currentWebhookUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ticker: 'TEST',
                        action: 'BUY',
                        price: '100.00',
                        time: new Date().toISOString(),
                        message: '🧪 Test alert from ABLE Messenger'
                      })
                    });
                    
                    if (response.ok) {
                      toast({ title: '✅ Test Sent!', description: 'Check the chat for the test message' });
                    } else {
                      throw new Error('Failed to send test');
                    }
                  } catch (error) {
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
              <div className="text-sm text-terminal-green/60 mb-1">User ID</div>
              <code className="text-xs bg-terminal-green/10 p-2 rounded block">{currentUser?.id}</code>
            </div>
            <div>
              <div className="text-sm text-terminal-green/60 mb-1">Color</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: currentUser?.color }}></div>
                <span className="text-sm">{currentUser?.color}</span>
              </div>
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
    </div>
  );
};

export default LiveChatReal;
