import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const { theme, setTheme, confirmThemeChange } = useTheme();

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'win95') => {
    if (newTheme !== theme) {
      const confirmed = await confirmThemeChange(newTheme);
      if (confirmed) {
        await setTheme(newTheme);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleThemeChange('light')}
        className={`${theme === 'light' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light Mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleThemeChange('dark')}
        className={`${theme === 'dark' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark Mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleThemeChange('win95')}
        className={`${theme === 'win95' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Monitor className="h-4 w-4" />
        <span className="sr-only">Windows 95 Mode</span>
      </Button>
    </div>
  );
}