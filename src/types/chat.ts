export interface User {
  id: string;
  username: string;
  color: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend?: User;
}

export interface ChatRoom {
  id: string;
  name?: string;
  type: 'private' | 'group';
  created_by: string;
  created_at: string;
  members?: User[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  color: string;
  content?: string;
  message_type: 'text' | 'image' | 'file' | 'webhook';
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  webhook_data?: any;
  created_at: string;
}

export interface Webhook {
  id: string;
  room_id: string;
  webhook_url: string;
  webhook_secret: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}
