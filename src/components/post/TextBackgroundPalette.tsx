import { Button } from "@/components/ui/button";

export interface ContentStyle {
  backgroundKey: string;
  textColor: string;
  isTextOnly: boolean;
}

export const backgroundPresets = [
  { key: 'none', gradient: '', textColor: 'text-foreground', label: 'Sin fondo' },
  { key: 'gradient-1', gradient: 'bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/30 p-6 rounded-2xl', textColor: 'text-white', label: 'Púrpura-Rosa' },
  { key: 'gradient-2', gradient: 'bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 shadow-xl shadow-blue-600/40 p-6 rounded-2xl border border-blue-400/20', textColor: 'text-white', label: 'Azul Elegante' },
  { key: 'gradient-3', gradient: 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 shadow-xl shadow-orange-500/30 p-6 rounded-2xl', textColor: 'text-white', label: 'Atardecer' },
  { key: 'gradient-4', gradient: 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 shadow-xl shadow-emerald-500/30 p-6 rounded-2xl', textColor: 'text-white', label: 'Esmeralda' },
  { key: 'gradient-5', gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-500 shadow-xl shadow-indigo-500/30 p-6 rounded-2xl', textColor: 'text-white', label: 'Índigo-Púrpura' },
  { key: 'gradient-6', gradient: 'bg-gradient-to-br from-pink-600 via-pink-500 to-rose-400 shadow-xl shadow-pink-500/30 p-6 rounded-2xl', textColor: 'text-white', label: 'Rosa Premium' },
  { key: 'gradient-7', gradient: 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 shadow-xl shadow-slate-700/40 p-6 rounded-2xl', textColor: 'text-white', label: 'Elegante Oscuro' },
  { key: 'gradient-8', gradient: 'bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 shadow-xl shadow-blue-500/30 p-6 rounded-2xl', textColor: 'text-white', label: 'Galaxia' },
  { key: 'solid-primary', gradient: 'bg-primary shadow-lg shadow-primary/25 p-6 rounded-2xl', textColor: 'text-primary-foreground', label: 'Principal' },
];

interface TextBackgroundPaletteProps {
  selectedBackground: string;
  onBackgroundChange: (style: ContentStyle) => void;
  disabled?: boolean;
}

export function TextBackgroundPalette({ 
  selectedBackground, 
  onBackgroundChange, 
  disabled = false 
}: TextBackgroundPaletteProps) {
  const handleBackgroundSelect = (preset: typeof backgroundPresets[0]) => {
    onBackgroundChange({
      backgroundKey: preset.key,
      textColor: preset.textColor,
      isTextOnly: preset.key !== 'none'
    });
  };

  if (disabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Fondo del texto</label>
      <div className="grid grid-cols-3 gap-2">
        {backgroundPresets.map((preset) => (
          <Button
            key={preset.key}
            variant={selectedBackground === preset.key ? "default" : "outline"}
            size="sm"
            className={`h-12 w-full ${preset.gradient} ${preset.textColor} hover:opacity-80`}
            onClick={() => handleBackgroundSelect(preset)}
            type="button"
          >
            <span className="text-xs font-medium truncate">
              {preset.key === 'none' ? 'Normal' : 'Aa'}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}