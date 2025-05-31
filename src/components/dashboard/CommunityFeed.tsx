import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, MoreHorizontal, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserProfileDialog } from '@/components/user/UserProfileDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    email?: string;
    created_at?: string;
  };
  likes: Array<{
    id: string;
    user_id: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
      name: string;
      username: string;
      avatar: string | null;
    };
  }>;
}

function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
    fetchPosts();

    // Set up real-time subscription for posts
    const channel = supabase
      .channel('posts-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts'
        }, 
        () => {
          fetchPosts();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          fetchPosts();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar,
            email,
            created_at
          ),
          likes (
            id,
            user_id
          ),
          comments (
            id,
            content,
            created_at,
            user_id,
            profiles:user_id (
              name,
              username,
              avatar
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load posts'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    const isLiked = posts.find(p => p.id === postId)?.likes.some(like => like.user_id === currentUser.id);

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: currentUser.id });
      }
    } catch (error) {
      console.error('Error handling like:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process like'
      });
    }
  };

  const handleComment = async (postId: string) => {
    if (!currentUser || !commentInputs[postId]?.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: commentInputs[postId].trim()
        });

      if (error) throw error;

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to post comment'
      });
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', deletePostId);

      if (error) throw error;

      setDeletePostId(null);
      toast({
        title: 'Success',
        description: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete post'
      });
    }
  };

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const timeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => {
          const isLiked = post.likes.some(like => like.user_id === currentUser?.id);
          const likesCount = post.likes.length;
          const commentsCount = post.comments.length;

          return (
            <Card key={post.id} className="w-full border-border">
              <CardContent className="p-4">
                {/* Post Header */}
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleUserClick(post.profiles)}
                  >
                    <Avatar className="w-10 h-10">
                      {post.profiles.avatar ? (
                        <AvatarImage src={post.profiles.avatar} alt={post.profiles.name} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-sm">
                          {post.profiles.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-pixelated text-sm text-foreground hover:underline">
                        {post.profiles.name}
                      </h3>
                      <p className="font-pixelated text-xs text-muted-foreground">
                        @{post.profiles.username} • {timeAgo(post.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleUserClick(post.profiles)}
                        className="font-pixelated"
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      {currentUser?.id === post.user_id && (
                        <DropdownMenuItem
                          onClick={() => setDeletePostId(post.id)}
                          className="font-pixelated text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Post
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Post Content */}
                <div className="mb-3">
                  <p className="font-pixelated text-sm text-foreground whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                {/* Post Image */}
                {post.image_url && (
                  <div className="mb-3">
                    <img
                      src={post.image_url}
                      alt="Post image"
                      className="w-full rounded-lg object-cover max-h-96"
                    />
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`font-pixelated text-xs ${isLiked ? 'text-red-500' : ''}`}
                    onClick={() => handleLike(post.id)}
                  >
                    <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                    {likesCount > 0 && <span>{likesCount}</span>}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="font-pixelated text-xs"
                    onClick={() => toggleComments(post.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {commentsCount > 0 && <span>{commentsCount}</span>}
                  </Button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="mt-4 space-y-3">
                    {/* Existing Comments */}
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-6 h-6">
                          {comment.profiles.avatar ? (
                            <AvatarImage src={comment.profiles.avatar} alt={comment.profiles.name} />
                          ) : (
                            <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                              {comment.profiles.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-2">
                            <p className="font-pixelated text-xs font-medium">
                              {comment.profiles.name}
                            </p>
                            <p className="font-pixelated text-xs text-foreground">
                              {comment.content}
                            </p>
                          </div>
                          <p className="font-pixelated text-xs text-muted-foreground mt-1">
                            {timeAgo(comment.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <Avatar className="w-6 h-6">
                        {currentUser?.avatar ? (
                          <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        ) : (
                          <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                            {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ 
                            ...prev, 
                            [post.id]: e.target.value 
                          }))}
                          className="font-pixelated text-xs resize-none"
                          rows={1}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="font-pixelated text-xs"
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={showUserProfile}
        onOpenChange={setShowUserProfile}
        user={selectedUser}
      />

      {/* Delete Post Confirmation */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CommunityFeed;