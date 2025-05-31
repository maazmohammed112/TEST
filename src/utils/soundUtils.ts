import clickSound from '/sounds/click.mp3';

let isSoundEnabled = true;

export const playClickSound = () => {
  if (!isSoundEnabled) return;
  
  const audio = new Audio(clickSound);
  audio.volume = 0.3;
  audio.play().catch(() => {
    // Ignore errors - some browsers block autoplay
  });
};

export const toggleSound = (enabled: boolean) => {
  isSoundEnabled = enabled;
};