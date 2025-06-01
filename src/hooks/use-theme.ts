import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'light' | 'dark' | 'win95';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  confirmThemeChange: (theme: Theme) => Promise<boolean>;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: async (theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'win95');
        root.classList.add(theme);
        
        // Save theme to database if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ theme_preference: theme })
            .eq('id', user.id);
        }
        
        set({ theme });
      },
      confirmThemeChange: async (theme) => {
        return new Promise((resolve) => {
          const dialog = document.createElement('div');
          dialog.innerHTML = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div class="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h3 class="text-lg font-medium mb-4 font-pixelated">Change Theme</h3>
                <p class="text-sm text-muted-foreground mb-6 font-pixelated">
                  Are you sure you want to change the theme to ${theme}? This will be saved as your preference.
                </p>
                <div class="flex justify-end gap-3">
                  <button class="px-4 py-2 text-sm font-pixelated bg-muted hover:bg-muted/80 rounded-md" onclick="this.closest('.fixed').remove(); window.resolveTheme(false);">
                    Cancel
                  </button>
                  <button class="px-4 py-2 text-sm font-pixelated bg-primary text-primary-foreground hover:bg-primary/90 rounded-md" onclick="this.closest('.fixed').remove(); window.resolveTheme(true);">
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          `;
          
          document.body.appendChild(dialog);
          
          // Add global resolve function
          (window as any).resolveTheme = (confirmed: boolean) => {
            delete (window as any).resolveTheme;
            resolve(confirmed);
          };
        });
      }
    }),
    {
      name: 'theme-storage',
    }
  )
);