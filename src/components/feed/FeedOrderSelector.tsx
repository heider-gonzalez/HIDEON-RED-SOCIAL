import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedOrder = 'relevant' | 'recent';

interface FeedOrderSelectorProps {
  currentOrder: FeedOrder;
  onOrderChange: (order: FeedOrder) => void;
}

export function FeedOrderSelector({ currentOrder, onOrderChange }: FeedOrderSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 h-9 px-3 text-sm font-medium"
        >
          {currentOrder === 'relevant' ? (
            <>
              <TrendingUp className="h-4 w-4" />
              Más Relevante
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" />
              Más Reciente
            </>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onOrderChange('relevant')}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            currentOrder === 'relevant' && "bg-muted"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Más Relevante
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onOrderChange('recent')}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            currentOrder === 'recent' && "bg-muted"
          )}
        >
          <Clock className="h-4 w-4" />
          Más Reciente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
