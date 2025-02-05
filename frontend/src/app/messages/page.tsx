"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { chatApi, userApi } from '@/services/api';
import { 
  Loader2, Search, Send, User, ArrowLeft, 
  Filter, Trash2, Calendar as CalendarIcon, CheckSquare, Paperclip 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import debounce from 'lodash/debounce';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender: any;
  created_at: string;
  is_read: boolean;
  attachment?: string;
  attachment_type?: string;
}

interface ChatRoom {
  id: string;
  participants: any[];
  last_message: Message | null;
  unread_count: number;
  other_participant: any;
}

interface Filters {
  start_date?: string;
  end_date?: string;
  is_read?: boolean;
  sender_id?: string;
  has_attachment?: boolean;
}

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    start_date: undefined,
    end_date: undefined,
    is_read: undefined,
    has_attachment: undefined
  });

  // WebSocket connection
  const { sendMessage, isConnected } = useWebSocket({
    url: selectedRoom ? `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/chat/${selectedRoom.id}/?token=${localStorage.getItem('access_token')}` : '',
    onMessage: (data) => {
      console.log('Received message:', data);
      if (data.type === 'chat_message') {
        setMessages(prev => [...prev, data.message]);
        if (data.message.sender.id !== selectedRoom?.other_participant.id) {
          markMessageAsRead(data.message.id);
        }
      }
    },
    onConnect: () => {
      console.log('Connected to chat room:', selectedRoom?.id);
      if (selectedRoom) {
        loadMessages(selectedRoom.id);
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from chat room:', selectedRoom?.id);
    }
  });

  useEffect(() => {
    loadChatRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      updateRoomReadStatus(selectedRoom.id);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatRooms = async () => {
    try {
      const response = await chatApi.getRooms();
      if (response.success) {
        setChatRooms(response.data);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const response = await chatApi.getMessages(roomId);
      if (response.success) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const updateRoomReadStatus = async (roomId: string) => {
    try {
      const response = await chatApi.markRoomAsRead(roomId);
      if (response.success) {
        setChatRooms(prev =>
          prev.map(room =>
            room.id === roomId ? { ...room, unread_count: 0 } : room
          )
        );
      }
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await chatApi.markMessageAsRead(selectedRoom!.id, messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;
    
    try {
      const formData = new FormData();
      formData.append('content', newMessage.trim());
      
      const response = await chatApi.sendMessage(selectedRoom.id, formData);
      if (response.success) {
        setNewMessage('');
        // Optionally reload messages
        await loadMessages(selectedRoom.id);
      } else {
        toast.error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      setSearching(true);
      const response = await userApi.searchUsers(query);
      if (response.success) {
        // Filter out the current user from search results
        const filteredResults = response.data.filter((user: any) => 
          user.id !== localStorage.getItem('user_id')
        );
        setSearchResults(filteredResults || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, 300);

  const createChatRoom = async (userId: string) => {
    try {
      setLoading(true);
      const response = await chatApi.createRoom(userId);
      if (response.success) {
        setSelectedRoom(response.data);
        setSearchQuery('');
        setSearchResults([]);
        await loadChatRooms();
      } else {
        toast.error(response.message || 'Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast.error('Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteAllMessages = async () => {
    if (!selectedRoom) return;
    
    if (confirm('Are you sure you want to delete all messages? This cannot be undone.')) {
      try {
        const response = await chatApi.deleteAllMessages(selectedRoom.id);
        if (response.success) {
          setMessages([]);
          toast.success('All messages deleted');
        } else {
          toast.error(response.message || 'Failed to delete messages');
        }
      } catch (error) {
        console.error('Error deleting messages:', error);
        toast.error('Failed to delete messages');
      }
    }
  };

  const handleApplyFilters = async () => {
    if (!selectedRoom) return;
    
    // Convert dates to ISO strings if they exist
    const apiFilters: Filters = {
      ...(filters.start_date && { start_date: new Date(filters.start_date).toISOString() }),
      ...(filters.end_date && { end_date: new Date(filters.end_date).toISOString() }),
      ...(filters.is_read !== undefined && { is_read: filters.is_read }),
      ...(filters.has_attachment !== undefined && { has_attachment: filters.has_attachment })
    };
    
    try {
      const response = await chatApi.filterMessages(selectedRoom.id, apiFilters);
      if (response.success) {
        setMessages(response.data);
        setShowFilters(false);
      } else {
        toast.error(response.message || 'Failed to apply filters');
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error('Failed to apply filters');
    }
  };

  const resetFilters = () => {
    setFilters({
      start_date: undefined,
      end_date: undefined,
      is_read: undefined,
      has_attachment: undefined
    });
    loadMessages(selectedRoom!.id);
    setShowFilters(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      {/* Chat List */}
      <div
        className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col
          ${selectedRoom ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Search Results or Chat Rooms */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {searchQuery ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {searching ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => createChatRoom(user.id)}
                      className="w-full p-4 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            ) : (
              chatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="w-full p-4 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {room.other_participant.avatar_url ? (
                    <img src={room.other_participant.avatar_url} alt={room.other_participant.username} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-medium truncate">{room.other_participant.username}</p>
                      {room.unread_count > 0 && (
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                    {room.last_message && (
                      <p className="text-sm text-gray-500 truncate">{room.last_message.content}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col ${
          !selectedRoom ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {selectedRoom.other_participant.avatar_url ? (
                  <img 
                    src={selectedRoom.other_participant.avatar_url} 
                    alt={selectedRoom.other_participant.username} 
                    className="w-10 h-10 rounded-full" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <h2 className="font-medium">{selectedRoom.other_participant.username}</h2>
                  <p className="text-sm text-gray-500">{isConnected ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteAllMessages}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender.id === selectedRoom.other_participant.id ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender.id === selectedRoom.other_participant.id
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'bg-primary text-white'
                    }`}
                  >
                    <p>{message.content}</p>
                    {message.attachment && (
                      <div className="mt-2">
                        <a 
                          href={message.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-sm opacity-70 hover:opacity-100"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>Attachment</span>
                        </a>
                      </div>
                    )}
                    <p className="text-xs mt-1 opacity-70">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Filter Dialog */}
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filter Messages</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Start Date</p>
                        <Calendar
                          mode="single"
                          selected={filters.start_date ? new Date(filters.start_date) : undefined}
                          onSelect={(date) => 
                            setFilters(prev => ({
                              ...prev,
                              start_date: date ? date.toISOString() : undefined
                            }))
                          }
                          initialFocus
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">End Date</p>
                        <Calendar
                          mode="single"
                          selected={filters.end_date ? new Date(filters.end_date) : undefined}
                          onSelect={(date) => 
                            setFilters(prev => ({
                              ...prev,
                              end_date: date ? date.toISOString() : undefined
                            }))
                          }
                          initialFocus
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="read"
                      checked={filters.is_read || false}
                      onCheckedChange={(checked: boolean) => 
                        setFilters(prev => ({ ...prev, is_read: checked }))
                      }
                    />
                    <label htmlFor="read" className="text-sm font-medium">
                      Show only read messages
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="attachments"
                      checked={filters.has_attachment || false}
                      onCheckedChange={(checked: boolean) => 
                        setFilters(prev => ({ ...prev, has_attachment: checked }))
                      }
                    />
                    <label htmlFor="attachments" className="text-sm font-medium">
                      Show only messages with attachments
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={resetFilters}>
                      Reset
                    </Button>
                    <Button onClick={handleApplyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Select a chat</h2>
              <p className="text-gray-500">Choose a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}