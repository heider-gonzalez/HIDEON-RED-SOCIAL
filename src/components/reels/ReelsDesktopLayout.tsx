import React from 'react';
import { ReelsSidebar } from './ReelsSidebar';
import { useMobileDetection } from '@/hooks/use-mobile-detection';

interface ReelsDesktopLayoutProps {
  children: React.ReactNode;
}

export function ReelsDesktopLayout({ children }: ReelsDesktopLayoutProps) {
  const { shouldUseMobileLayout } = useMobileDetection();

  if (shouldUseMobileLayout) {
    // Mobile: Fullscreen sin sidebars
    return <>{children}</>;
  }

  // Desktop: Layout con sidebar
  return (
    <div className="flex w-full min-h-screen bg-background">
      <ReelsSidebar />
      
      <main className="flex-1 flex items-center justify-center bg-black">
        <div className="w-full max-w-[1400px] h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
