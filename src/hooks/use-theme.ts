import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'win95';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'win95');
        root.classList.add(theme);
        set({ theme });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);