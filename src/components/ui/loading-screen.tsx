import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  className?: string;
}

export function LoadingScreen({ className }: LoadingScreenProps) {
  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center bg-gradient-to-br from-social-light-green/10 via-white to-white dark:from-social-dark-green/20 dark:via-background dark:to-background transition-all duration-500",
      className
    )}>
      <div className="text-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-social-light-green/20 blur-3xl rounded-full animate-pulse"></div>
          <img 
            src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
            alt="SocialChat Logo" 
            className="h-24 w-auto mx-auto relative animate-bounce" 
          />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold font-pixelated social-gradient bg-clip-text text-transparent animate-fade-in">
            SocialChat
          </h1>
          <p className="text-sm text-muted-foreground font-pixelated animate-fade-in">
            Loading your experience...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-social-green animate-pulse delay-0"></div>
            <div className="h-2 w-2 rounded-full bg-social-green animate-pulse delay-150"></div>
            <div className="h-2 w-2 rounded-full bg-social-green animate-pulse delay-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
}