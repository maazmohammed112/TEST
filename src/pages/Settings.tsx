import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DeleteAccountDialog } from '@/components/user/DeleteAccountDialog';
import { Bell, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Settings() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are already enabled
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Your browser does not support notifications'
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive notifications for new messages and activities'
        });
        
        // Send a test notification
        new Notification('Notifications Enabled', {
          body: 'You will now receive notifications for new messages and activities',
          icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Notifications disabled',
          description: 'You will not receive notifications'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to enable notifications'
      });
    }
  };

  const handleAccountDeleted = () => {
    navigate('/login');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              <CardTitle>Settings</CardTitle>
            </div>
            <CardDescription>
              Manage your account preferences and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notifications Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for new messages and activities
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                />
              </div>
              {notificationsEnabled && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-600">Notifications are enabled</p>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Account Section */}
            <div className="pt-6 border-t">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-destructive flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Delete Account
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <DeleteAccountDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onAccountDeleted={handleAccountDeleted}
        />
      </div>
    </DashboardLayout>
  );
}

export default Settings;