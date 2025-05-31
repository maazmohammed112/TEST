import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, User, ArrowLeft, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    avatar: string;
  };
}

export function Messages() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, avatar')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        setCurrentUser({
          id: user.id,
          name: userProfile.name || 'User',
          avatar: userProfile.avatar || ''
        });
      }

      const { data: friendsData, error } = await supabase
        .from('friends')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (error) throw error;
      
      const formattedFriends: Friend[] = [];
      
      if (friendsData) {
        for (const friend of friendsData) {
          const isSender = friend.sender_id === user.id;
          const friendId = isSender ? friend.receiver_id : friend.sender_id;
          
          const { data: friendProfile } = await supabase
            .from('profiles')
            .select('id, name, username, avatar')
            .eq('id', friendId)
            .single();
          
          if (friendProfile && friendProfile.id) {
            formattedFriends.push({
              id: friendProfile.id,
              name: friendProfile.name || 'User',
              username: friendProfile.username || 'guest',
              avatar: friendProfile.avatar || ''
            });
          }
        }
      }

      setFriends(formattedFriends);
      setFilteredFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends for messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          profiles!messages_sender_id_fkey(name, avatar)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at');
        
      if (error) throw error;

      const formattedMessages: Message[] = messagesData.map((message: any) => ({
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        created_at: message.created_at,
        sender: {
          name: message.profiles?.name || 'Unknown',
          avatar: message.profiles?.avatar || ''
        }
      }));

      setMessages(formattedMessages);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !currentUser || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        sender_id: currentUser.id,
        receiver_id: selectedFriend.id,
        content: newMessage.trim(),
        read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
        
      if (error) throw error;

      setNewMessage('');
      
      if (data) {
        const newMessageWithSender = {
          ...data,
          sender: {
            name: currentUser.name,
            avatar: currentUser.avatar
          }
        };
        
        setMessages(prevMessages => {
          const exists = prevMessages.some(msg => msg.id === data.id);
          if (exists) return prevMessages;
          return [...prevMessages, newMessageWithSender];
        });
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    fetchFriends();
    
    const friendsInterval = setInterval(() => {
      fetchFriends();
    }, 30000);

    return () => clearInterval(friendsInterval);
  }, []);

  useEffect(() => {
    if (selectedFriend && currentUser) {
      fetchMessages(selectedFriend.id);
      
      const channel = supabase
        .channel(`messages-${selectedFriend.id}-${currentUser.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${currentUser.id}))`
          }, 
          async (payload) => {
            console.log('Real-time message update:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as Message;
              
              if (newMessage.sender_id !== currentUser.id) {
                const { data } = await supabase
                  .from('profiles')
                  .select('name, avatar')
                  .eq('id', newMessage.sender_id)
                  .single();
                  
                if (data) {
                  setMessages(prevMessages => {
                    const exists = prevMessages.some(msg => msg.id === newMessage.id);
                    if (exists) return prevMessages;
                    
                    const messageWithSender = {
                      ...newMessage,
                      sender: {
                        name: data.name || 'Unknown',
                        avatar: data.avatar || ''
                      }
                    };
                    
                    const updated = [...prevMessages, messageWithSender];
                    setTimeout(scrollToBottom, 100);
                    return updated;
                  });
                }
              }
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              fetchMessages(selectedFriend.id);
            }
          }
        )
        .subscribe();

      const messageInterval = setInterval(() => {
        fetchMessages(selectedFriend.id);
      }, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(messageInterval);
      };
    }
  }, [selectedFriend, currentUser]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }

    const filtered = friends.filter(friend => 
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredFriends(filtered);
  }, [searchQuery, friends]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar - Friends List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedFriend ? 'hidden md:flex' : ''}`}>
            {/* Search Header */}
            <div className="p-4 border-b bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 font-pixelated text-sm"
                />
              </div>
            </div>

            {/* Friends List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-muted rounded mb-2" />
                        <div className="h-3 w-32 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredFriends.length > 0 ? (
                <div className="p-2">
                  {filteredFriends.map(friend => (
                    <div
                      key={friend.id}
                      onClick={() => {
                        setSelectedFriend(friend);
                        fetchMessages(friend.id);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                        selectedFriend?.id === friend.id 
                          ? 'bg-accent shadow-md' 
                          : ''
                      }`}
                    >
                      <Avatar className="h-12 w-12 border-2 border-background">
                        {friend.avatar ? (
                          <AvatarImage src={friend.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {friend.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  {friends.length === 0 ? (
                    <>
                      <p className="text-muted-foreground mb-4">No friends yet</p>
                      <Button variant="outline" asChild>
                        <a href="/friends">Find Friends</a>
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No matching friends found</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col h-full ${!selectedFriend ? 'hidden md:flex' : ''}`}>
            {selectedFriend ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedFriend(null)}
                    className="md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    {selectedFriend.avatar ? (
                      <AvatarImage src={selectedFriend.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {selectedFriend.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFriend.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{selectedFriend.username}
                    </p>
                  </div>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[80%] ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-8 w-8 mt-1">
                            {message.sender?.avatar ? (
                              <AvatarImage src={message.sender.avatar} />
                            ) : (
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {message.sender?.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div 
                            className={`p-3 rounded-lg ${
                              message.sender_id === currentUser?.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t bg-background">
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="min-h-[45px] max-h-[120px] resize-none"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift + Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
                <p className="text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Messages;