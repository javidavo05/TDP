// Audio feedback utilities
let successAudio: HTMLAudioElement | null = null;
let errorAudio: HTMLAudioElement | null = null;

// Initialize audio elements
function initAudio() {
  if (typeof window === "undefined") return;

  // Try to load audio files, fallback to Web Audio API if not available
  try {
    successAudio = new Audio("/sounds/success.mp3");
    successAudio.preload = "auto";
    successAudio.volume = 0.7;
  } catch (e) {
    console.warn("Could not load success audio file, will use synthetic sound");
  }

  try {
    errorAudio = new Audio("/sounds/error.mp3");
    errorAudio.preload = "auto";
    errorAudio.volume = 0.7;
  } catch (e) {
    console.warn("Could not load error audio file, will use synthetic sound");
  }
}

// Generate synthetic success sound using Web Audio API
function playSyntheticSuccess() {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn("Could not play synthetic success sound:", e);
  }
}

// Generate synthetic error sound using Web Audio API
function playSyntheticError() {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 300;
    oscillator.type = "sawtooth";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.warn("Could not play synthetic error sound:", e);
  }
}

// Play success sound
export function playSuccessSound(): void {
  if (typeof window === "undefined") return;

  if (!successAudio) {
    initAudio();
  }

  if (successAudio) {
    successAudio.currentTime = 0;
    successAudio.play().catch((e) => {
      console.warn("Could not play success audio:", e);
      playSyntheticSuccess();
    });
  } else {
    playSyntheticSuccess();
  }
}

// Play error sound
export function playErrorSound(): void {
  if (typeof window === "undefined") return;

  if (!errorAudio) {
    initAudio();
  }

  if (errorAudio) {
    errorAudio.currentTime = 0;
    errorAudio.play().catch((e) => {
      console.warn("Could not play error audio:", e);
      playSyntheticError();
    });
  } else {
    playSyntheticError();
  }
}

// Vibrate device
export function vibrate(pattern: number | number[]): void {
  if (typeof window === "undefined" || !navigator.vibrate) return;

  try {
    navigator.vibrate(pattern);
  } catch (e) {
    console.warn("Could not vibrate device:", e);
  }
}

// Trigger success feedback (audio + vibration)
export function triggerSuccessFeedback(): void {
  playSuccessSound();
  vibrate([100, 50, 100]); // Short double vibration
}

// Trigger error feedback (audio + vibration)
export function triggerErrorFeedback(): void {
  playErrorSound();
  vibrate([200, 100, 200]); // Longer vibration pattern
}

// Initialize on module load
if (typeof window !== "undefined") {
  initAudio();
}

