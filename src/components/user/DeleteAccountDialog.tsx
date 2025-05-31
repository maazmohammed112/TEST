import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountDeleted: () => void;
}

export function DeleteAccountDialog({ open, onOpenChange, onAccountDeleted }: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    if (confirmation !== 'DELETE') return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user found');
      }

      // Delete user's posts
      await supabase
        .from('posts')
        .delete()
        .eq('user_id', user.id);

      // Delete user's comments
      await supabase
        .from('comments')
        .delete()
        .eq('user_id', user.id);

      // Delete user's likes
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id);

      // Delete user's friend connections
      await supabase
        .from('friends')
        .delete()
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Delete user's messages
      await supabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Delete user's profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      // Finally, delete the user's auth account
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      onAccountDeleted();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
      });
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-3 rounded-md">
            <p className="text-sm font-medium">Warning: This action cannot be undone</p>
            <ul className="mt-2 text-sm space-y-1">
              <li>• All your posts will be deleted</li>
              <li>• All your messages will be deleted</li>
              <li>• All your friend connections will be removed</li>
              <li>• Your profile will be permanently deleted</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Type DELETE to confirm</Label>
            <Input
              id="confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmation !== 'DELETE' || loading}
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}