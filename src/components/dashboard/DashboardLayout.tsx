import React, { useEffect, useRef } from 'react';
import { MobileHeader } from './MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Bell, MessageSquare, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger navigation
const ROUTES = ['/dashboard', '/friends', '/messages', '/notifications', '/profile'];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const currentPath = location.pathname;

  const getRouteFromPath = (path: string) => {
    if (path === '/') return 'dashboard';
    if (path.startsWith('/profile/')) return 'profile';
    return path.split('/')[1];
  };

  const currentRoute = getRouteFromPath(currentPath);

  // Handle touch events for swipe navigation
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      const swipeDistance = touchEndX.current - touchStartX.current;
      const currentIndex = ROUTES.indexOf(currentPath);

      // Only handle horizontal swipes that exceed the threshold
      if (Math.abs(swipeDistance) > SWIPE_THRESHOLD && currentIndex !== -1) {
        if (swipeDistance > 0 && currentIndex > 0) {
          // Swipe right - go to previous route
          navigate(ROUTES[currentIndex - 1]);
        } else if (swipeDistance < 0 && currentIndex < ROUTES.length - 1) {
          // Swipe left - go to next route
          navigate(ROUTES[currentIndex + 1]);
        }
      }
    };

    // Only add touch event listeners on mobile
    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile, currentPath, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <div className="dev-banner text-xs font-pixelated">
        This project is still under development by Mohammed Maaz A. Please share your feedback!
      </div>
      <MobileHeader />
      <div className="flex flex-1 w-full">
        <div className="flex-1 w-full">
          {!isMobile && (
            <div className="border-b sticky top-0 bg-background z-10 px-2 pt-2">
              <Tabs value={currentRoute} className="w-full mb-2">
                <TabsList className="nav-tabs w-fit overflow-x-auto">
                  <TabsTrigger 
                    value="dashboard" 
                    onClick={() => navigate('/dashboard')}
                    className={`nav-tab ${currentRoute === 'dashboard' ? 'active' : ''} font-pixelated p-2`}
                  >
                    <Home className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    onClick={() => navigate('/friends')}
                    className={`nav-tab ${currentRoute === 'friends' ? 'active' : ''} font-pixelated p-2`}
                  >
                    <Users className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="messages" 
                    onClick={() => navigate('/messages')}
                    className={`nav-tab ${currentRoute === 'messages' ? 'active' : ''} font-pixelated p-2`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    onClick={() => navigate('/notifications')}
                    className={`nav-tab ${currentRoute === 'notifications' ? 'active' : ''} font-pixelated p-2`}
                  >
                    <Bell className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="profile" 
                    onClick={() => navigate('/profile')}
                    className={`nav-tab ${currentRoute === 'profile' ? 'active' : ''} font-pixelated p-2`}
                  >
                    <User className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          <main 
            className={`w-full ${isMobile ? 'pt-16 pb-16' : 'p-2'} overflow-x-hidden`}
            style={{ 
              touchAction: 'pan-y pinch-zoom', // Allow vertical scrolling but handle horizontal swipes
            }}
          >
            <div className="w-full max-w-full overflow-hidden h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}