import React from "react";
import { Check } from "lucide-react";

interface ColorGradientPickerProps {
  selectedGradient: string;
  onGradientChange: (gradient: string) => void;
}

const gradientOptions = [
  {
    id: 'gradient-1',
    name: 'Sunset Orange',
    class: 'bg-gradient-to-br from-orange-400 to-pink-400'
  },
  {
    id: 'gradient-2', 
    name: 'Ocean Blue',
    class: 'bg-gradient-to-br from-blue-400 to-cyan-400'
  },
  {
    id: 'gradient-3',
    name: 'Forest Green',
    class: 'bg-gradient-to-br from-green-400 to-emerald-400'
  },
  {
    id: 'gradient-4',
    name: 'Purple Dream',
    class: 'bg-gradient-to-br from-blue-400 to-blue-500'
  },
  {
    id: 'gradient-5',
    name: 'Golden Hour',
    class: 'bg-gradient-to-br from-yellow-400 to-orange-400'
  },
  {
    id: 'gradient-6',
    name: 'Rose Garden',
    class: 'bg-gradient-to-br from-pink-400 to-rose-400'
  },
  {
    id: 'gradient-7',
    name: 'Midnight Blue',
    class: 'bg-gradient-to-br from-slate-400 to-blue-400'
  },
  {
    id: 'gradient-8',
    name: 'Tropical',
    class: 'bg-gradient-to-br from-teal-400 to-green-400'
  }
];

export function ColorGradientPicker({ selectedGradient, onGradientChange }: ColorGradientPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Color del evento
      </label>
      <div className="grid grid-cols-4 gap-3">
        {gradientOptions.map((gradient) => (
          <button
            key={gradient.id}
            type="button"
            onClick={() => onGradientChange(gradient.id)}
            className={`
              relative h-12 w-full rounded-lg border-2 transition-all duration-200
              ${gradient.class}
              ${selectedGradient === gradient.id 
                ? 'border-primary scale-105 shadow-lg' 
                : 'border-border hover:border-muted-foreground hover:scale-102'
              }
            `}
            title={gradient.name}
          >
            {selectedGradient === gradient.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="h-5 w-5 text-white drop-shadow-lg" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}