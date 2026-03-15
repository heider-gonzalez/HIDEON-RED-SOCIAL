import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VolumeSliderProps {
  volume: number;
  isMuted: boolean;
  show: boolean;
  onChange: (value: number) => void;
  onMuteToggle: () => void;
}

export function VolumeSlider({ volume, isMuted, show, onChange, onMuteToggle }: VolumeSliderProps) {
  const handleVolumeUp = () => {
    const newVolume = Math.min(100, volume + 10);
    onChange(newVolume);
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume - 10);
    onChange(newVolume);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-4 py-3 flex items-center gap-3 shadow-lg z-50"
        >
          <button
            onClick={onMuteToggle}
            className="text-white hover:text-gray-300 transition-colors p-2"
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          
          {/* Vertical Volume Bar */}
          <div className="flex flex-col items-center gap-2 h-24">
            <button
              onClick={handleVolumeDown}
              className="text-white hover:text-gray-300 transition-colors p-1"
              aria-label="Bajar volumen"
            >
              <Minus className="h-3 w-3" />
            </button>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-32">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={(value) => onChange(value[0])}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                  orientation="vertical"
                />
              </div>
            </div>
            
            <button
              onClick={handleVolumeUp}
              className="text-white hover:text-gray-300 transition-colors p-1"
              aria-label="Subir volumen"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          
          <span className="text-white text-sm font-medium min-w-[3ch] text-right">
            {isMuted ? 0 : volume}%
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
