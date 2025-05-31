```typescript
const clickSound = new Audio('/sounds/click.mp3');
clickSound.volume = 0.3;

let isSoundEnabled = true;

export const playClickSound = () => {
  if (!isSoundEnabled) return;
  
  try {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {
      // Ignore errors - some browsers block autoplay
    });
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

export const toggleSound = (enabled: boolean) => {
  isSoundEnabled = enabled;
};
```