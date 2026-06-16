import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventCardProps {
  title: string;
  subtitle?: React.ReactNode;
  description: string;
  startDate: string;
  endDate?: string;
  location: string;
  isVirtual: boolean;
  maxAttendees?: number;
  currentAttendees?: number;
  category: string;
  gradientColor?: string;
  imageUrl?: string;
  onClick?: () => void;
}

const gradientMap = {
  'gradient-1': 'bg-gradient-to-r from-cyan-400 to-blue-500',
  'gradient-2': 'bg-gradient-to-r from-purple-400 to-pink-400',
  'gradient-3': 'bg-gradient-to-r from-green-400 to-emerald-500',
  'gradient-4': 'bg-gradient-to-r from-orange-400 to-red-500',
  'gradient-5': 'bg-gradient-to-r from-indigo-400 to-purple-600'
};

export function EventCard({
  title,
  subtitle,
  description,
  startDate,
  endDate,
  location,
  isVirtual,
  maxAttendees,
  currentAttendees = 0,
  category,
  gradientColor = 'gradient-1',
  imageUrl,
  onClick
}: EventCardProps) {
  const gradientClass = gradientMap[gradientColor as keyof typeof gradientMap] || gradientMap['gradient-1'];
  
  const formatEventDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`relative rounded-xl p-4 text-white cursor-pointer ${gradientClass} min-h-[140px]`} onClick={onClick}>
      {/* Background pattern/overlay */}
      <div className="absolute inset-0 bg-black/10"></div>
      
      {/* Event image on the right */}
      {imageUrl && (
        <div className="absolute top-4 right-4 w-16 h-16 rounded-lg overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 max-w-[calc(100%-5rem)]">
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        {subtitle && (
          <p className="text-white/90 text-sm mb-2">{subtitle}</p>
        )}
        <p className="text-white/80 text-sm mb-4">{description}</p>
        
        <div className="flex items-center gap-4 text-sm text-white/90 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatEventDate(startDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{isVirtual ? 'Virtual' : location}</span>
          </div>
          {maxAttendees && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{currentAttendees} / {maxAttendees}</span>
            </div>
          )}
        </div>
        
        <Button 
          size="sm" 
          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          Más info
        </Button>
      </div>
    </div>
  );
}