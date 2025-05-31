import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { StoriesContainer } from '@/components/stories/StoriesContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const handlePost = async () => {
    if (!postContent.trim() || isPosting) return;

    try {
      setIsPosting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to post'
        });
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          content: postContent.trim(),
          user_id: user.id
        });

      if (error) throw error;

      setPostContent('');
      toast({
        title: 'Success',
        description: 'Your post has been shared!'
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create post'
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        {/* Stories Container */}
        <StoriesContainer />
        
        {/* Post Box */}
        <Card className="mx-2 mb-3 card-gradient animate-fade-in">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="What's on your mind?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[48px] max-h-[120px] font-pixelated text-sm resize-none"
                disabled={isPosting}
              />
              <Button
                onClick={handlePost}
                disabled={!postContent.trim() || isPosting}
                className="bg-social-green hover:bg-social-light-green text-white font-pixelated h-[48px] w-[48px] p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-pixelated">
              Press Enter to post, Shift+Enter for new line
            </p>
          </CardContent>
        </Card>
        
        {/* Content */}
        <div className="h-[calc(100vh-180px)] overflow-y-auto p-2">
          <CommunityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;