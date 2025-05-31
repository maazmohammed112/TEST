// Click sound utility
let isSoundEnabled = true;
let clickSound: HTMLAudioElement | null = null;

// Initialize sound
const initializeSound = () => {
  if (!clickSound) {
    clickSound = new Audio('/sounds/click.mp3');
    clickSound.volume = 0.2;
  }
};

export const playClickSound = () => {
  if (!isSoundEnabled) return;
  
  try {
    if (!clickSound) {
      initializeSound();
    }
    
    // Clone the audio to allow multiple rapid clicks
    const soundClone = clickSound?.cloneNode() as HTMLAudioElement;
    if (soundClone) {
      soundClone.volume = 0.2;
      soundClone.play().catch(() => {
        // Ignore errors - some browsers block autoplay
      });
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

export const toggleSound = (enabled: boolean) => {
  isSoundEnabled = enabled;
};