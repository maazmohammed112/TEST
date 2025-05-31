import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme('light')}
        className={`${theme === 'light' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light Mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme('dark')}
        className={`${theme === 'dark' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark Mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme('win95')}
        className={`${theme === 'win95' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Monitor className="h-4 w-4" />
        <span className="sr-only">Windows 95 Mode</span>
      </Button>
    </div>
  );
}