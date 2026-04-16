import { useEffect, useMemo, useReducer, useRef, useCallback } from "react";

export type VideoUiState = {
  hovered: boolean;
  tapControlsVisible: boolean;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  isMutedLocal: boolean;
  volumeLocal: number;
  showVolumeUI: boolean;
  videoErrorUrl: string | null;
};

type VideoUiAction =
  | { type: "setHovered"; value: boolean }
  | { type: "setTapControlsVisible"; value: boolean }
  | { type: "setShowVolumeUI"; value: boolean }
  | {
      type: "syncFromVideo";
      duration: number;
      currentTime: number;
      isMutedLocal: boolean;
      volumeLocal: number;
    }
  | { type: "setIsPlaying"; value: boolean }
  | { type: "setCurrentTime"; value: number }
  | { type: "setMutedAndVolume"; isMutedLocal: boolean; volumeLocal: number }
  | { type: "markVideoError"; url: string };

function videoUiReducer(state: VideoUiState, action: VideoUiAction): VideoUiState {
  switch (action.type) {
    case "setHovered":
      return { ...state, hovered: action.value };
    case "setTapControlsVisible":
      return { ...state, tapControlsVisible: action.value };
    case "setShowVolumeUI":
      return { ...state, showVolumeUI: action.value };
    case "syncFromVideo":
      return {
        ...state,
        duration: action.duration,
        currentTime: action.currentTime,
        isMutedLocal: action.isMutedLocal,
        volumeLocal: action.volumeLocal,
      };
    case "setIsPlaying":
      return { ...state, isPlaying: action.value };
    case "setCurrentTime":
      return { ...state, currentTime: action.value };
    case "setMutedAndVolume":
      return {
        ...state,
        isMutedLocal: action.isMutedLocal,
        volumeLocal: action.volumeLocal,
      };
    case "markVideoError":
      return state.videoErrorUrl === action.url
        ? state
        : { ...state, videoErrorUrl: action.url };
    default:
      return state;
  }
}

export type UseMediaRendererVideoParams = {
  isVideo: boolean;
  safeHybridUrl: string;
  effectiveMuted: boolean;
  autoPlay: boolean;
  autoPlayOnView: boolean;
  pauseOnOutOfView: boolean;
  resetOnPause: boolean;
};

export function useMediaRendererVideo({
  isVideo,
  safeHybridUrl,
  effectiveMuted,
  autoPlay,
  autoPlayOnView,
  pauseOnOutOfView,
  resetOnPause,
}: UseMediaRendererVideoParams) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const tapHideTimerRef = useRef<number | null>(null);

  const initialVolumeLocal = useMemo(() => {
    try {
      const saved = localStorage.getItem("feed_video_volume");
      const n = saved ? Number(saved) : 0.5;
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
    } catch {
      return 0.5;
    }
  }, []);

  const [videoUi, dispatchVideoUi] = useReducer(videoUiReducer, {
    hovered: false,
    tapControlsVisible: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    isMutedLocal: effectiveMuted,
    volumeLocal: initialVolumeLocal,
    showVolumeUI: false,
    videoErrorUrl: null,
  });

  const videoError = videoUi.videoErrorUrl === safeHybridUrl;

  const showTapControls = useCallback(() => {
    dispatchVideoUi({ type: "setTapControlsVisible", value: true });
    if (tapHideTimerRef.current) window.clearTimeout(tapHideTimerRef.current);
    tapHideTimerRef.current = window.setTimeout(() => {
      dispatchVideoUi({ type: "setTapControlsVisible", value: false });
      tapHideTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (tapHideTimerRef.current) {
        window.clearTimeout(tapHideTimerRef.current);
        tapHideTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (!isVideo) return;
    if (!autoPlayOnView && !autoPlay) return;

    let didPlay = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const inView = Boolean(entry?.isIntersecting);
        if (inView) {
          if (didPlay) return;
          didPlay = true;
          try {
            el.muted = true;
            el.play().catch(() => {});
          } catch {
            // ignore
          }
          return;
        }

        didPlay = false;
        if (!pauseOnOutOfView) return;
        try {
          el.pause();
          if (resetOnPause) el.currentTime = 0;
        } catch {
          // ignore
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlay, autoPlayOnView, isVideo, pauseOnOutOfView, resetOnPause]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (!isVideo) return;

    const onLoaded = () => {
      dispatchVideoUi({
        type: "syncFromVideo",
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        currentTime: Number.isFinite(el.currentTime) ? el.currentTime : 0,
        isMutedLocal: Boolean(el.muted),
        volumeLocal: typeof el.volume === "number" ? el.volume : 1,
      });
    };
    const onTime = () =>
      dispatchVideoUi({
        type: "setCurrentTime",
        value: Number.isFinite(el.currentTime) ? el.currentTime : 0,
      });
    const onPlay = () => dispatchVideoUi({ type: "setIsPlaying", value: true });
    const onPause = () => dispatchVideoUi({ type: "setIsPlaying", value: false });
    const onVolume = () => {
      dispatchVideoUi({
        type: "setMutedAndVolume",
        isMutedLocal: Boolean(el.muted),
        volumeLocal: typeof el.volume === "number" ? el.volume : 1,
      });
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("volumechange", onVolume);

    onLoaded();
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("volumechange", onVolume);
    };
  }, [isVideo, safeHybridUrl]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (!isVideo) return;
    try {
      el.volume = videoUi.volumeLocal;
      if (videoUi.volumeLocal > 0 && el.muted && !effectiveMuted) {
        el.muted = false;
      }
    } catch {
      // ignore
    }
  }, [effectiveMuted, isVideo, videoUi.volumeLocal]);

  const setVolume = useCallback((next: number) => {
    const el = localVideoRef.current;
    if (!el) return;
    const clamped = Math.min(1, Math.max(0, next));
    try {
      el.volume = clamped;
      if (clamped > 0) {
        el.muted = false;
        dispatchVideoUi({
          type: "setMutedAndVolume",
          isMutedLocal: false,
          volumeLocal: clamped,
        });
      } else {
        el.muted = true;
        dispatchVideoUi({
          type: "setMutedAndVolume",
          isMutedLocal: true,
          volumeLocal: clamped,
        });
      }
      try {
        localStorage.setItem("feed_video_volume", String(clamped));
        localStorage.setItem("feed_video_muted", String(el.muted));
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }, []);

  const togglePlay = useCallback(() => {
    const v = localVideoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekTo = useCallback((t: number) => {
    const v = localVideoRef.current;
    if (!v) return;
    try {
      v.currentTime = t;
      dispatchVideoUi({ type: "setCurrentTime", value: t });
    } catch {
      // ignore
    }
  }, []);

  const toggleMuted = useCallback(() => {
    const v = localVideoRef.current;
    if (!v) return;
    try {
      v.muted = !v.muted;
      dispatchVideoUi({
        type: "setMutedAndVolume",
        isMutedLocal: Boolean(v.muted),
        volumeLocal: typeof v.volume === "number" ? v.volume : 1,
      });
      try {
        localStorage.setItem("feed_video_muted", String(v.muted));
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }, []);

  const setShowVolumeUI = useCallback((value: boolean) => {
    dispatchVideoUi({ type: "setShowVolumeUI", value });
  }, []);

  const setHovered = useCallback((value: boolean) => {
    dispatchVideoUi({ type: "setHovered", value });
  }, []);

  const markVideoError = useCallback((url: string) => {
    dispatchVideoUi({ type: "markVideoError", url });
  }, []);

  return {
    localVideoRef,
    videoUi,
    videoError,
    showTapControls,
    setVolume,
    togglePlay,
    seekTo,
    toggleMuted,
    setShowVolumeUI,
    setHovered,
    markVideoError,
  };
}
