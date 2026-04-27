import React from 'react';
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

  // Desktop: escenario centrado (la app ya tiene sidebar global)
  return (
    <main className="w-full h-[calc(100vh-64px)] bg-gray-950">
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full h-full max-w-[1400px] flex items-center justify-center">
          {children}
        </div>
      </div>
    </main>
  );
}
