import { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

export function LegacySidebar({ children }: SidebarProps) {
  return (
    <div className="hidden md:flex w-64 bg-card border-r border-border h-full flex-col">
      {children}
    </div>
  );
}
