import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  className?: string;
}

export function LoadingScreen({ className }: LoadingScreenProps) {
  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center bg-gradient-to-br from-social-light-green/20 to-white dark:from-social-dark-green/20 dark:to-background z-50",
      className
    )}>
      <div className="text-center space-y-4">
        <img 
          src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
          alt="SocialChat Logo" 
          className="h-20 w-auto mx-auto animate-bounce" 
        />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-pixelated social-gradient bg-clip-text text-transparent">
            SocialChat
          </h1>
          <div className="flex items-center justify-center gap-1">
            <div className="h-2 w-2 rounded-full bg-social-green animate-pulse delay-0"></div>
            <div className="h-2 w-2 rounded-full bg-social-green animate-pulse delay-150"></div>
            <div className="h-2 w-2 rounded-full bg-social-green animate-pulse delay-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
}