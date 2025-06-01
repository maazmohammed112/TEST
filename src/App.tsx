import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useNotifications } from "@/hooks/use-notifications";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useTheme } from "@/hooks/use-theme";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Friends from "./pages/Friends";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Components
import { AuthGuard } from "./components/common/AuthGuard";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { setupAllNotifications } = useNotifications();
  const { setTheme } = useTheme();
  
  useEffect(() => {
    const faviconLink = document.querySelector("link[rel*='icon']") || document.createElement('link');
    faviconLink.setAttribute('rel', 'shortcut icon');
    faviconLink.setAttribute('href', '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png');
    document.head.appendChild(faviconLink);
    
    document.title = "SocialChat - Connect with Friends";
    
    let cleanupNotifications: (() => void) | undefined;
    
    if (session) {
      cleanupNotifications = setupAllNotifications(session.user.id);
      
      // Load user's theme preference from database
      supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.theme_preference) {
            setTheme(data.theme_preference);
          }
        });
    }
    
    return () => {
      if (cleanupNotifications) {
        cleanupNotifications();
      }
    };
  }, [session, setupAllNotifications, setTheme]);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setLoading(false);
          localStorage.clear();
          sessionStorage.clear();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          setSession(session);
          setLoading(false);
        } else {
          setSession(session);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      // Add a small delay to show the loading animation
      setTimeout(() => setLoading(false), 1500);
    });

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={session ? <Navigate to="/dashboard" replace /> : <Index />} 
            />
            <Route 
              path="/login" 
              element={session ? <Navigate to="/dashboard" replace /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={session ? <Navigate to="/dashboard" replace /> : <Register />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              } 
            />
            <Route 
              path="/friends" 
              element={
                <AuthGuard>
                  <Friends />
                </AuthGuard>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <AuthGuard>
                  <Messages />
                </AuthGuard>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <AuthGuard>
                  <Notifications />
                </AuthGuard>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <AuthGuard>
                  <Settings />
                </AuthGuard>
              } 
            />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;