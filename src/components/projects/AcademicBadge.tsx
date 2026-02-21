import React from 'react';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';

interface AcademicBadgeProps {
  className?: string;
}

export function AcademicBadge({ className = '' }: AcademicBadgeProps) {
  return (
    <Badge 
      className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm flex items-center gap-1.5 ${className}`}
    >
      <GraduationCap size={12} className="opacity-90" />
      Proyecto Académico
    </Badge>
  );
}
