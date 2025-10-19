import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Send, Users, MessageCircle, Clock, UserPlus, Edit2, UserCheck, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  color: string;
}

interface User {
  id: string;
  username: string;
  color: string;
  lastSeen: Date;
  isOnline: boolean;
}

interface Friend {
  userId: string;
  username: string;
  color: string;
  addedAt: Date;
}

// Generate color based on IP/user ID
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

// Generate username from IP
const generateUsername = (ip: string): string => {
  const adjectives = ['Swift', 'Bold', 'Smart', 'Bright', 'Cool', 'Wise', 'Quick', 'Sharp'];
  const nouns = ['Trader', 'Investor', 'Analyst', 'Bull', 'Bear', 'Wolf', 'Hawk', 'Eagle'];
  
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ip.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const adj = adjectives[Math.abs(hash) % adjectives.length];
  const noun = nouns[Math.abs(hash >> 4) % nouns.length];
  const num = (Math.abs(hash) % 999).toString().padStart(3, '0');
  
  return `${adj}${noun}${num}`;
};

// Simulate getting user IP
const getUserId = (): string => {
  let userId = localStorage.getItem('chat-user-id');
  if (!userId) {
    // Generate a unique ID based on browser fingerprint
    userId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chat-user-id', userId);
  }
  return userId;
};

export default function LiveChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize current user
  useEffect(() => {
    const userId = getUserId();
    
    // Check if user has saved username
    const savedUsername = localStorage.getItem('chat-username');
    const username = savedUsername || generateUsername(userId);
    const color = generateColor(userId);
    
    const user: User = {
      id: userId,
      username,
      color,
      lastSeen: new Date(),
      isOnline: true
    };
    
    setCurrentUser(user);
    
    // Show name dialog if no saved username
    if (!savedUsername) {
      setTempUsername(username);
      setShowNameDialog(true);
    }
    
    // Load saved messages from localStorage
    const savedMessages = localStorage.getItem('chat-messages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      setMessages(parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      })));
    }

    // Load friends from localStorage
    const savedFriends = localStorage.getItem('chat-friends');
    if (savedFriends) {
      const parsed = JSON.parse(savedFriends);
      setFriends(parsed.map((f: any) => ({
        ...f,
        addedAt: new Date(f.addedAt)
      })));
    }

    // Add welcome message
    if (!savedMessages || JSON.parse(savedMessages).length === 0) {
      const welcomeMsg: Message = {
        id: 'welcome-' + Date.now(),
        userId: 'system',
        username: 'ABLE SYSTEM',
        message: '🚀 Welcome to ABLE Terminal Live Chat! Connect with traders worldwide.',
        timestamp: new Date(),
        color: '#10B981'
      };
      setMessages([welcomeMsg]);
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save friends to localStorage
  useEffect(() => {
    if (friends.length > 0) {
      localStorage.setItem('chat-friends', JSON.stringify(friends));
    }
  }, [friends]);

  // Simulate active users
  useEffect(() => {
    if (!currentUser) return;

    const updateUsers = () => {
      const activeUsers = [currentUser];
      
      // Add some mock users
      const mockUserIds = ['trader-alpha', 'trader-beta', 'trader-gamma', 'trader-delta', 'trader-epsilon'];
      mockUserIds.forEach((ip, idx) => {
        if (Math.random() > 0.2) { // 80% chance to be online
          activeUsers.push({
            id: ip,
            username: generateUsername(ip),
            color: generateColor(ip),
            lastSeen: new Date(),
            isOnline: Math.random() > 0.1 // 90% online
          });
        }
      });

      setUsers(activeUsers);
    };

    updateUsers();
    const interval = setInterval(updateUsers, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      username: currentUser.username,
      message: newMessage.trim(),
      timestamp: new Date(),
      color: currentUser.color
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSaveUsername = () => {
    if (!tempUsername.trim() || !currentUser) return;

    const newUsername = tempUsername.trim();
    localStorage.setItem('chat-username', newUsername);
    
    setCurrentUser({
      ...currentUser,
      username: newUsername
    });

    setShowNameDialog(false);
    
    toast({
      title: "Username Updated!",
      description: `Your username is now: ${newUsername}`,
    });

    // Send system message
    const msg: Message = {
      id: Date.now().toString(),
      userId: 'system',
      username: 'ABLE SYSTEM',
      message: `${newUsername} has joined the chat`,
      timestamp: new Date(),
      color: '#10B981'
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleAddFriend = (user: User) => {
    if (friends.some(f => f.userId === user.id)) {
      toast({
        title: "Already Friends",
        description: `${user.username} is already in your friends list`,
        variant: "destructive"
      });
      return;
    }

    const newFriend: Friend = {
      userId: user.id,
      username: user.username,
      color: user.color,
      addedAt: new Date()
    };

    setFriends(prev => [...prev, newFriend]);
    
    toast({
      title: "Friend Added!",
      description: `${user.username} added to friends list`,
    });
  };

  const isFriend = (userId: string): boolean => {
    return friends.some(f => f.userId === userId);
  };

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <CardHeader className="border-b border-terminal-green/30 bg-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <MessageCircle className="h-6 w-6 text-terminal-green" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-terminal-green rounded-full animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-terminal-green">ABLE LIVE CHAT</CardTitle>
                <p className="text-xs text-gray-400 font-mono">GLOBAL TRADING NETWORK</p>
              </div>
              <Badge variant="outline" className="bg-terminal-green/10 text-terminal-green border-terminal-green/30 font-mono">
                <Wifi className="h-3 w-3 mr-1 animate-pulse" />
                LIVE
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNameDialog(true)}
                className="border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                {currentUser?.username}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUsersPanel(!showUsersPanel)}
                className="border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10"
              >
                <Users className="h-4 w-4 mr-1" />
                {users.filter(u => u.isOnline).length} ONLINE
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 p-0 overflow-hidden bg-gray-950">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.userId === currentUser?.id ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 border-2"
                    style={{ 
                      backgroundColor: msg.color,
                      borderColor: msg.color,
                      boxShadow: `0 0 10px ${msg.color}40`
                    }}
                  >
                    {msg.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Message */}
                  <div className={`flex-1 max-w-[70%] ${msg.userId === currentUser?.id ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-bold text-sm font-mono"
                        style={{ color: msg.color }}
                      >
                        {msg.username}
                      </span>
                      {isFriend(msg.userId) && (
                        <Badge variant="outline" className="text-xs border-terminal-green/30 text-terminal-green">
                          <UserCheck className="h-2 w-2 mr-1" />
                          FRIEND
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 border ${
                        msg.userId === currentUser?.id
                          ? 'bg-terminal-green/10 text-white border-terminal-green/30'
                          : msg.userId === 'system'
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          : 'bg-gray-800/50 text-gray-100 border-gray-700'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input Area */}
        <div className="border-t border-terminal-green/30 p-4 bg-gray-800">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`[${currentUser?.username || 'USER'}] > TYPE MESSAGE...`}
              className="flex-1 bg-gray-950 border-terminal-green/30 text-white placeholder:text-gray-500 font-mono focus:border-terminal-green"
              maxLength={500}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="bg-terminal-green hover:bg-terminal-green/80 text-gray-900 font-bold"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>PRESS ENTER TO SEND</span>
            <span>{newMessage.length}/500</span>
          </div>
        </div>
      </div>

      {/* Users Panel */}
      {showUsersPanel && (
        <div className="w-80 border-l border-terminal-green/30 bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-terminal-green/30">
            <h3 className="text-lg font-bold text-terminal-green font-mono">ACTIVE USERS</h3>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {users.filter(u => u.isOnline).length} ONLINE / {users.length} TOTAL
            </p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-terminal-green/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm border-2"
                      style={{ 
                        backgroundColor: user.color,
                        borderColor: user.color,
                        boxShadow: `0 0 10px ${user.color}40`
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white font-mono">{user.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            user.isOnline
                              ? 'border-terminal-green text-terminal-green'
                              : 'border-gray-500 text-gray-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                            user.isOnline ? 'bg-terminal-green animate-pulse' : 'bg-gray-500'
                          }`} />
                          {user.isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Badge>
                        {isFriend(user.id) && (
                          <Badge variant="outline" className="text-xs border-terminal-green/30 text-terminal-green">
                            <UserCheck className="h-2 w-2 mr-1" />
                            FRIEND
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {user.id !== currentUser?.id && !isFriend(user.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddFriend(user)}
                      className="border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10"
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Friends List */}
          {friends.length > 0 && (
            <>
              <div className="p-4 border-t border-terminal-green/30">
                <h3 className="text-sm font-bold text-terminal-green font-mono">FRIENDS ({friends.length})</h3>
              </div>
              <ScrollArea className="max-h-48">
                <div className="px-4 pb-4 space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.userId}
                      className="flex items-center gap-3 p-2 rounded bg-gray-800/30 border border-terminal-green/20"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: friend.color }}
                      >
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-white font-mono truncate">{friend.username}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {users.find(u => u.id === friend.userId)?.isOnline ? 'ONLINE' : 'OFFLINE'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      )}

      {/* Username Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="bg-gray-800 border-terminal-green/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-terminal-green font-mono">
              SET USERNAME
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono">
              Choose your display name for ABLE Terminal Chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-bold text-terminal-green font-mono">
                USERNAME
              </Label>
              <Input
                id="username"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Enter username..."
                className="bg-gray-950 border-terminal-green/30 text-white font-mono focus:border-terminal-green"
                maxLength={20}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveUsername();
                  }
                }}
              />
              <p className="text-xs text-gray-500 font-mono">
                {tempUsername.length}/20 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveUsername}
              disabled={!tempUsername.trim()}
              className="bg-terminal-green hover:bg-terminal-green/80 text-gray-900 font-bold"
            >
              CONFIRM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}