// types/chat.ts
import { User } from './user';

export interface Message {
  id: string;
  content: string;
  sender: User;
  is_read: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  participants: User[];
  latest_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatState {
  activeRoom: ChatRoom | null;
  rooms: ChatRoom[];
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
}
