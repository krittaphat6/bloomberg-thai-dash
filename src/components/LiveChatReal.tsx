import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { User, Friendship, ChatRoom, Message, Webhook } from '@/types/chat';
import { UserPlus, Users, Settings, Paperclip, Image as ImageIcon, Send, X, Copy, Check } from 'lucide-react';

const LiveChatReal = () => {
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Friends & Rooms
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  
  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Webhooks
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  
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

      // Upsert user in database
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

    // Subscribe to friendship changes
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

    // Subscribe to new messages
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

  // Load webhooks for current room
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
      }
    };

    loadWebhooks();
  }, [currentRoomId]);

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
          status: 'accepted', // Auto-accept for simplicity
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
        
        // Auto-create private room
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
      // Check if private room exists
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

      // Create new private room
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'private',
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add both members
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
    if (!currentUser || !groupName.trim()) return;

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
        .insert({ room_id: newRoom.id, user_id: currentUser.id });

      if (memberError) throw memberError;

      toast({ title: 'Group Created!', description: `"${groupName}" is ready` });
      setGroupName('');
      setShowCreateGroup(false);
      setCurrentRoomId(newRoom.id);
    } catch (error: any) {
      console.error('Error creating group:', error);
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

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: 'File Too Large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

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
      setUploadProgress(0);
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

  const currentRoom = rooms.find(r => r.id === currentRoomId);
  const roomName = currentRoom?.name || (currentRoom?.type === 'private' ? 'Private Chat' : 'Chat Room');

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-terminal-green animate-pulse">Initializing ABLE Messenger...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-black text-terminal-green font-mono">
      {/* Sidebar */}
      <div className="w-72 border-r border-terminal-green/30 flex flex-col">
        {/* User Profile */}
        <div className="p-4 border-b border-terminal-green/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: currentUser?.color }}>
              {currentUser?.username[0]}
            </div>
            <div className="flex-1">
              <div className="font-bold">{currentUser?.username}</div>
              <div className="text-xs text-terminal-green/60">● Online</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Friends List */}
        <div className="p-4 border-b border-terminal-green/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">FRIENDS</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowAddFriend(true)}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-40">
            {friends.length === 0 ? (
              <div className="text-xs text-terminal-green/60 text-center py-4">No friends yet</div>
            ) : (
              friends.map(friendship => {
                const friend = friendship.friend_id === currentUser?.id 
                  ? friendship.friend
                  : friendship.friend;
                const friendId = friendship.friend_id === currentUser?.id ? friendship.user_id : friendship.friend_id;
                
                return (
                  <div
                    key={friendship.id}
                    className="flex items-center gap-2 p-2 hover:bg-terminal-green/10 cursor-pointer rounded"
                    onClick={() => {
                      const friendData = friendship.friend_id === currentUser?.id 
                        ? { id: friendship.user_id, username: friend?.username || 'Unknown' }
                        : { id: friendship.friend_id, username: friend?.username || 'Unknown' };
                      startPrivateChat(friendData.id, friendData.username);
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-terminal-green"></div>
                    <span className="text-sm">{friend?.username || 'Unknown'}</span>
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
            <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(true)}>
              <Users className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {rooms.length === 0 ? (
              <div className="text-xs text-terminal-green/60 text-center py-4">No rooms yet</div>
            ) : (
              rooms.map(room => (
                <div
                  key={room.id}
                  className={`p-2 mb-1 rounded cursor-pointer ${currentRoomId === room.id ? 'bg-terminal-green/20' : 'hover:bg-terminal-green/10'}`}
                  onClick={() => setCurrentRoomId(room.id)}
                >
                  <div className="text-sm font-bold">{room.name || (room.type === 'private' ? 'Private Chat' : 'Room')}</div>
                  <div className="text-xs text-terminal-green/60">{room.type}</div>
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
            <div className="p-4 border-b border-terminal-green/30 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">{roomName}</h2>
                <div className="text-xs text-terminal-green/60">{currentRoom?.type === 'group' ? 'Group Chat' : '1:1 Chat'}</div>
              </div>
              {currentRoom?.type === 'group' && (
                <Button variant="ghost" size="icon" onClick={() => setShowRoomSettings(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-terminal-green/60 py-8">No messages yet. Start the conversation!</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: msg.color }}>
                        {msg.username[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-sm" style={{ color: msg.color }}>{msg.username}</span>
                          <span className="text-xs text-terminal-green/60">{formatTime(msg.created_at)}</span>
                        </div>
                        
                        {msg.message_type === 'text' && (
                          <div className="text-sm break-words">{msg.content}</div>
                        )}
                        
                        {msg.message_type === 'image' && (
                          <div className="mt-2">
                            <img src={msg.file_url} alt={msg.file_name} className="max-w-md rounded border border-terminal-green/30 cursor-pointer hover:opacity-80" onClick={() => window.open(msg.file_url, '_blank')} />
                          </div>
                        )}
                        
                        {msg.message_type === 'file' && (
                          <div className="mt-2 p-3 border border-terminal-green/30 rounded inline-flex items-center gap-2 hover:bg-terminal-green/10 cursor-pointer" onClick={() => window.open(msg.file_url, '_blank')}>
                            <Paperclip className="w-4 h-4" />
                            <div>
                              <div className="text-sm">{msg.file_name}</div>
                              <div className="text-xs text-terminal-green/60">{formatFileSize(msg.file_size)}</div>
                            </div>
                          </div>
                        )}
                        
                        {msg.message_type === 'webhook' && (
                          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                            <div className="text-blue-400 text-xs font-bold mb-2">🔗 WEBHOOK MESSAGE</div>
                            <pre className="text-xs text-blue-300 overflow-auto">{JSON.stringify(msg.webhook_data, null, 2)}</pre>
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
                <div className="mb-2 text-xs text-terminal-green/60">
                  Uploading... {uploadProgress}%
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'file');
                    e.target.value = '';
                  }}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'image');
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-black border-terminal-green/30 text-terminal-green"
                  disabled={isUploading}
                />
                <Button onClick={handleSendMessage} disabled={isSending || isUploading || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-terminal-green/60">
            Select a friend or create a room to start chatting
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
            <DialogDescription className="text-terminal-green/60">Enter username to add as friend</DialogDescription>
          </DialogHeader>
          <Input
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
            placeholder="Username..."
            className="bg-black border-terminal-green/30 text-terminal-green"
          />
          <Button onClick={handleAddFriend} disabled={!friendUsername.trim()}>Add Friend</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription className="text-terminal-green/60">Enter group name</DialogDescription>
          </DialogHeader>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            placeholder="Group name..."
            className="bg-black border-terminal-green/30 text-terminal-green"
          />
          <Button onClick={handleCreateGroup} disabled={!groupName.trim()}>Create Group</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showRoomSettings} onOpenChange={setShowRoomSettings}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
            <DialogDescription className="text-terminal-green/60">Manage webhooks and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold mb-2">Webhooks</h4>
              {webhooks.length === 0 ? (
                <div className="text-xs text-terminal-green/60 mb-2">No webhooks yet</div>
              ) : (
                webhooks.map(webhook => (
                  <div key={webhook.id} className="p-3 border border-terminal-green/30 rounded mb-2">
                    <div className="text-xs text-terminal-green/60 mb-1">URL:</div>
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xs bg-black/50 p-1 rounded flex-1 overflow-auto">{webhook.webhook_url}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(webhook.webhook_url, webhook.id)}
                      >
                        {copiedWebhook === webhook.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="text-xs text-terminal-green/60 mb-1">Secret:</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-black/50 p-1 rounded flex-1 overflow-auto">{webhook.webhook_secret}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(webhook.webhook_secret, `${webhook.id}-secret`)}
                      >
                        {copiedWebhook === `${webhook.id}-secret` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button onClick={handleCreateWebhook} className="w-full">Create Webhook</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-black border-terminal-green text-terminal-green">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
            <DialogDescription className="text-terminal-green/60">Update your profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-terminal-green/60 mb-1 block">Username</label>
              <div className="text-sm">{currentUser?.username}</div>
            </div>
            <div>
              <label className="text-xs text-terminal-green/60 mb-1 block">User ID</label>
              <code className="text-xs bg-black/50 p-2 rounded block">{currentUser?.id}</code>
            </div>
            <div>
              <label className="text-xs text-terminal-green/60 mb-1 block">Color</label>
              <div className="w-8 h-8 rounded" style={{ backgroundColor: currentUser?.color }}></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveChatReal;
