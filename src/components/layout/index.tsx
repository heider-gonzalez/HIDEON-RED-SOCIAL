
import React, { useEffect } from "react";
import { LegacySidebar } from "./LegacySidebar";
import { LegacyHeader } from "./LegacyHeader";

export function LegacyLayout({ children }: { children: React.ReactNode }) {
  const isDesktop =
    typeof window !== "undefined" &&
    typeof window.matchMedia !== "undefined" &&
    window.matchMedia("(min-width: 1024px)").matches;

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          caches.delete(key);
        });
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Sidebar */}
      <LegacySidebar>
        <div></div>
      </LegacySidebar>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <LegacyHeader>
          <div></div>
        </LegacyHeader>
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Right Sidebar - Friends and Engagement */}
      {isDesktop && (
        <div className="hidden lg:block lg:w-80 border-l border-border p-4 space-y-6" />
      )}
    </div>
  );
}
