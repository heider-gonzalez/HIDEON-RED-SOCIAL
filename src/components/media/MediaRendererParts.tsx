import { cn } from "@/lib/utils";
import type { KeyboardEvent } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export function inferIsCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(hover: none)").matches
    );
  } catch {
    return false;
  }
}

export function shouldActivateOnKeyDown(e: KeyboardEvent<HTMLElement>): boolean {
  return e.key === "Enter" || e.key === " ";
}

export function VideoErrorFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      <div className="text-center p-4">
        <div className="text-4xl mb-2">🎥</div>
        <div className="text-sm font-medium">Video no disponible</div>
        <div className="text-xs mt-1 opacity-75">El video no pudo cargarse</div>
      </div>
    </div>
  );
}

type VideoControlsOverlayProps = {
  controlsVisible: boolean;
  stopPropagationOnClick: boolean;
  showTapControls: () => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isCoarsePointer: boolean;
  isMutedLocal: boolean;
  volumeLocal: number;
  showVolumeUI: boolean;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onToggleMuted: () => void;
  onShowVolumeUI: (value: boolean) => void;
  onSetVolume: (value: number) => void;
};

export function VideoControlsOverlay({
  controlsVisible,
  stopPropagationOnClick,
  showTapControls,
  isPlaying,
  currentTime,
  duration,
  isCoarsePointer,
  isMutedLocal,
  volumeLocal,
  showVolumeUI,
  onTogglePlay,
  onSeek,
  onToggleMuted,
  onShowVolumeUI,
  onSetVolume,
}: VideoControlsOverlayProps) {
  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 px-3 pb-3 pt-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity",
        controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onPointerDown={(e) => {
        if (stopPropagationOnClick) e.stopPropagation();
        showTapControls();
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center text-white"
          onClick={(e) => {
            if (stopPropagationOnClick) e.stopPropagation();
            showTapControls();
            onTogglePlay();
          }}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="text-xs text-white tabular-nums min-w-[90px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => {
            showTapControls();
            onSeek(Number(e.target.value));
          }}
          className="flex-1 h-1 accent-white"
        />

        {!isCoarsePointer && (
          <div
            className="relative"
            onMouseEnter={() => onShowVolumeUI(true)}
            onMouseLeave={() => onShowVolumeUI(false)}
          >
            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center text-white"
              onClick={(e) => {
                if (stopPropagationOnClick) e.stopPropagation();
                onToggleMuted();
              }}
              aria-label={isMutedLocal ? "Activar sonido" : "Silenciar"}
            >
              {isMutedLocal || volumeLocal === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            {showVolumeUI && (
              <div
                className="absolute bottom-10 right-0 z-30 rounded-lg bg-black/70 p-3 backdrop-blur-sm"
                onPointerDown={(e) => {
                  if (stopPropagationOnClick) e.stopPropagation();
                }}
              >
                <div className="flex flex-col items-center gap-2 h-28">
                  <div className="text-[10px] text-white/80 tabular-nums">
                    {Math.round((isMutedLocal ? 0 : volumeLocal) * 100)}%
                  </div>
                  <div className="h-full flex items-center">
                    <Slider
                      value={[Math.round((isMutedLocal ? 0 : volumeLocal) * 100)]}
                      onValueChange={(v) => onSetVolume((v[0] ?? 0) / 100)}
                      max={100}
                      step={1}
                      orientation="vertical"
                      className="h-24"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
