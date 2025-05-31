import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage?: {
    content: string;
    created_at: string;
    unread: boolean;
  };
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
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
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

      // Get friends with last message and unread count
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          id, 
          sender_id, 
          receiver_id,
          profiles!friends_sender_id_fkey(id, name, username, avatar),
          messages!messages_sender_id_fkey(
            content,
            created_at,
            read
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('created_at', { foreignTable: 'messages', ascending: false });

      if (friendsData) {
        const formattedFriends = friendsData.map(friend => {
          const isSender = friend.sender_id === user.id;
          const friendProfile = isSender ? friend.profiles : friend.profiles;
          const lastMessage = friend.messages?.[0];
          
          return {
            id: friendProfile.id,
            name: friendProfile.name || 'User',
            username: friendProfile.username || 'guest',
            avatar: friendProfile.avatar || '',
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              unread: !lastMessage.read && lastMessage.sender_id !== user.id
            } : undefined
          };
        });

        // Sort friends by last message date
        formattedFriends.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

        setFriends(formattedFriends);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
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

      const formattedMessages = messagesData.map(message => ({
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

      // Mark messages as read
      if (formattedMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('sender_id', friendId)
          .eq('receiver_id', user.id)
          .eq('read', false);
      }
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
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    fetchFriends();
    
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' }, 
        () => {
          fetchFriends();
          if (selectedFriend) {
            fetchMessages(selectedFriend.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedFriend]);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
    }
  }, [selectedFriend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        <div className="flex h-[calc(100vh-60px)]">
          {/* Friends List */}
          <div className={`w-full md:w-1/3 border-r flex flex-col ${selectedFriend ? 'hidden md:flex' : ''}`}>
            <div className="p-3 border-b bg-background sticky top-0 z-10">
              <h2 className="font-pixelated text-sm">Messages</h2>
            </div>
            
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-muted rounded mb-1" />
                        <div className="h-3 w-32 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length > 0 ? (
                <div className="p-2 space-y-1">
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors relative ${
                        selectedFriend?.id === friend.id 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedFriend(friend)}
                    >
                      <Avatar className="h-10 w-10">
                        {friend.avatar ? (
                          <AvatarImage src={friend.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white font-pixelated text-sm">
                            {friend.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-pixelated text-sm font-medium truncate">{friend.name}</p>
                        {friend.lastMessage && (
                          <p className={`text-xs truncate ${friend.lastMessage.unread ? 'font-medium' : 'text-muted-foreground'}`}>
                            {friend.lastMessage.content}
                          </p>
                        )}
                      </div>
                      {friend.lastMessage?.unread && (
                        <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-social-green animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground font-pixelated text-sm mb-3">No messages yet</p>
                  <Button variant="outline" className="font-pixelated text-sm" asChild>
                    <a href="/friends">Find Friends</a>
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedFriend ? 'hidden md:flex' : ''}`}>
            {selectedFriend ? (
              <>
                {/* Chat Header */}
                <div className="border-b flex items-center gap-3 bg-background p-3 sticky top-0 z-10">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedFriend(null)}
                    className="md:hidden h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    {selectedFriend.avatar ? (
                      <AvatarImage src={selectedFriend.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                        {selectedFriend.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-pixelated text-sm font-medium truncate">{selectedFriend.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{selectedFriend.username}</p>
                  </div>
                </div>
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="h-6 w-6 mt-1">
                              {message.sender?.avatar ? (
                                <AvatarImage src={message.sender.avatar} />
                              ) : (
                                <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                                  {message.sender?.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className={`p-3 rounded-lg text-sm font-pixelated ${
                                message.sender_id === currentUser?.id 
                                  ? 'bg-social-green text-white' 
                                  : 'bg-muted'
                              }`}>
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {format(new Date(message.created_at), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-muted-foreground font-pixelated text-sm">Start the conversation!</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message Input */}
                <div className="border-t bg-background p-3">
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      className="flex-1 min-h-[40px] max-h-[120px] font-pixelated text-sm resize-none focus:ring-2 focus:ring-social-green/20 transition-all duration-200"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendingMessage}
                    />
                    <Button 
                      className="bg-social-green hover:bg-social-light-green text-white font-pixelated h-[40px] w-[40px] p-0 flex-shrink-0 hover:scale-105 transition-transform"
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-pixelated">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <h1 className="text-lg font-pixelated font-bold mb-2">Select a chat</h1>
                <p className="text-muted-foreground font-pixelated text-sm">
                  Choose a friend to start messaging
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