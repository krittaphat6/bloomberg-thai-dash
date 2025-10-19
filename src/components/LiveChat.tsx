import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Users, MessageCircle, Clock } from 'lucide-react';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize current user
  useEffect(() => {
    const userId = getUserId();
    const username = generateUsername(userId);
    const color = generateColor(userId);
    
    const user: User = {
      id: userId,
      username,
      color,
      lastSeen: new Date()
    };
    
    setCurrentUser(user);
    
    // Load saved messages from localStorage
    const savedMessages = localStorage.getItem('chat-messages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      setMessages(parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      })));
    }

    // Add welcome message
    if (!savedMessages || JSON.parse(savedMessages).length === 0) {
      const welcomeMsg: Message = {
        id: 'welcome-' + Date.now(),
        userId: 'system',
        username: 'System',
        message: 'Welcome to ABLE Terminal Live Chat! 🚀',
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

  // Simulate active users
  useEffect(() => {
    if (!currentUser) return;

    const activeUsers = [currentUser];
    
    // Add some mock users
    const mockUserIds = ['192.168.1.1', '10.0.0.5', '172.16.0.3'];
    mockUserIds.forEach(ip => {
      if (Math.random() > 0.3) { // 70% chance to be online
        activeUsers.push({
          id: ip,
          username: generateUsername(ip),
          color: generateColor(ip),
          lastSeen: new Date()
        });
      }
    });

    setUsers(activeUsers);
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

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <CardHeader className="border-b border-gray-700 bg-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-terminal-green" />
            <CardTitle className="text-lg text-white">Live Chat</CardTitle>
            <Badge variant="outline" className="bg-terminal-green/10 text-terminal-green border-terminal-green/30">
              <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse mr-1.5" />
              LIVE
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            <span>{users.length} online</span>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.userId === currentUser?.id ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: msg.color }}
                >
                  {msg.username.charAt(0)}
                </div>

                {/* Message */}
                <div className={`flex-1 max-w-[70%] ${msg.userId === currentUser?.id ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: msg.color }}
                    >
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.userId === currentUser?.id
                        ? 'bg-terminal-green/20 text-white'
                        : msg.userId === 'system'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-gray-800 text-gray-100'
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
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message as ${currentUser?.username || 'User'}...`}
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            maxLength={500}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-terminal-green hover:bg-terminal-green/80 text-gray-900"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Press Enter to send</span>
          <span>{newMessage.length}/500</span>
        </div>
      </div>

      {/* Online Users Sidebar (optional - can be toggled) */}
      <div className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Users className="h-3 w-3" />
          <span>Online:</span>
          <div className="flex gap-1 flex-wrap">
            {users.slice(0, 5).map((user) => (
              <Badge
                key={user.id}
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: user.color,
                  color: user.color
                }}
              >
                {user.username}
              </Badge>
            ))}
            {users.length > 5 && (
              <Badge variant="outline" className="text-xs text-gray-400">
                +{users.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}