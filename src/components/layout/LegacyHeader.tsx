import React from "react";

export function LegacyHeader({ children }: { children: React.ReactNode }) {
  return <header className="w-full">{children}</header>;
}
