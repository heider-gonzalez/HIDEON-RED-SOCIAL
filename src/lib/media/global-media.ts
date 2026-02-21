type Listener<T> = (value: T) => void;

const SOUND_ENABLED_KEY = "hsocial_sound_enabled";

function readInitialSoundEnabled() {
  try {
    const v = localStorage.getItem(SOUND_ENABLED_KEY);
    if (v === null) return false;
    return v === "true";
  } catch {
    return false;
  }
}

let soundEnabled = readInitialSoundEnabled();
const soundListeners = new Set<Listener<boolean>>();

export function getSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(next: boolean) {
  soundEnabled = next;
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(next));
  } catch {
    // ignore
  }
  soundListeners.forEach((l) => l(soundEnabled));
}

export function subscribeSoundEnabled(listener: Listener<boolean>) {
  soundListeners.add(listener);
  return () => {
    soundListeners.delete(listener);
  };
}

// Ensures only one video plays at a time across the app
let nowPlayingVideoId: string | null = null;
const nowPlayingVideoListeners = new Set<Listener<string | null>>();

export function getNowPlayingVideoId() {
  return nowPlayingVideoId;
}

export function setNowPlayingVideoId(id: string | null) {
  nowPlayingVideoId = id;
  nowPlayingVideoListeners.forEach((l) => l(nowPlayingVideoId));
}

export function subscribeNowPlayingVideoId(listener: Listener<string | null>) {
  nowPlayingVideoListeners.add(listener);
  return () => {
    nowPlayingVideoListeners.delete(listener);
  };
}
