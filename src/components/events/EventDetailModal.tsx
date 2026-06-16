import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
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
    imageUrl?: string;
    organizer?: string;
  };
}

export function EventDetailModal({ isOpen, onClose, event }: EventDetailModalProps) {
  const formatEventDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatEventTime = (startDate: string, endDate?: string) => {
    try {
      const start = parseISO(startDate);
      const startTime = format(start, "HH:mm");
      
      if (endDate) {
        const end = parseISO(endDate);
        const endTime = format(end, "HH:mm");
        return `${startTime} - ${endTime}`;
      }
      
      return startTime;
    } catch {
      return 'Hora por confirmar';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">{event.title}</DialogTitle>
              {event.organizer && (
                <DialogDescription className="text-muted-foreground">
                  {event.organizer}
                </DialogDescription>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Image */}
          {event.imageUrl && (
            <div className="w-full h-40 rounded-lg overflow-hidden bg-gradient-to-r from-cyan-400 to-blue-500">
              <img 
                src={event.imageUrl} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Category Badge */}
          <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {event.category}
          </div>

          {/* Organizer */}
          {event.organizer && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                {event.organizer}
              </h4>
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Event Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatEventDate(event.startDate)}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatEventTime(event.startDate, event.endDate)}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.isVirtual ? 'Evento Virtual' : event.location}</span>
            </div>
            
            {event.maxAttendees && (
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{event.currentAttendees || 0} / {event.maxAttendees} inscritos</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1">
              Inscribirse
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}