/**
 * Tokens de diseño para HIDEON 2 (Tech-Academy)
 * Foco: modo oscuro, minimalista, estilo Stripe/Vercel
 */

export const COLORS = {
  // Fondo principal (Slate-950)
  background: '#020617',
  // Fondos secundarios
  backgroundSecondary: '#0f172a', // slate-900
  backgroundTertiary: '#1e293b', // slate-800
  // Acentos
  primary: '#3b82f6', // blue-500
  primaryHover: '#2563eb', // blue-600
  accent: '#06b6d4', // cyan-500
  accentHover: '#0891b2', // cyan-600
  // Textos
  textPrimary: '#f8fafc', // slate-50
  textSecondary: '#cbd5e1', // slate-300
  textMuted: '#64748b', // slate-500
  // Bordes y divisores
  border: '#334155', // slate-700
  borderLight: '#475569', // slate-600
  // Estados
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  // Universidad badges (sutil)
  university: {
    uninorte: '#3b82f6', // blue
    cuc: '#06b6d4', // cyan
    simon: '#8b5cf6', // violet
    autónoma: '#f59e0b', // amber
    reformada: '#ec4899', // pink
    sena: '#10b981', // emerald
  },
} as const;

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  accent: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  // Efectos de fondo (blur)
  backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
  accentGlow: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  // Con brillo (efecto glass)
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  glassSm: '0 4px 16px 0 rgba(31, 38, 135, 0.37)',
} as const;

export const BACKDROP_BLUR = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
} as const;

export const BORDER_RADIUS = {
  sm: '0.375rem', // 6px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem', // 32px
  full: '9999px',
} as const;

export const SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
    base: ['1rem', { lineHeight: '1.5rem' }], // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }], // 48px
  },
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

// Helper para generar clases de Tailwind dinámicas
export const cn = (...inputs: (string | undefined | null | false)[]) => {
  return inputs.filter(Boolean).join(' ');
};

// Helper para colores de universidad
export function getUniversityColor(uni?: string): string {
  if (!uni) return COLORS.border;
  const key = uni.toLowerCase();
  if (key.includes('norte')) return COLORS.university.uninorte;
  if (key.includes('cuc') || key.includes('costa')) return COLORS.university.cuc;
  if (key.includes('simon')) return COLORS.university.simon;
  if (key.includes('autónoma') || key.includes('autonoma')) return COLORS.university.autónoma;
  if (key.includes('reformada')) return COLORS.university.reformada;
  if (key.includes('sena')) return COLORS.university.sena;
  return COLORS.border;
}
