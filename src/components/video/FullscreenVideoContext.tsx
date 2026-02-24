import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type FullscreenVideoOpenParams = {
  initialPostId?: string;
  initialUrl?: string;
  initialTime?: number;
  muted?: boolean;
};

type FullscreenVideoState = {
  isOpen: boolean;
  params: FullscreenVideoOpenParams | null;
};

type FullscreenVideoContextValue = {
  isOpen: boolean;
  params: FullscreenVideoOpenParams | null;
  open: (params: FullscreenVideoOpenParams) => void;
  close: () => void;
};

const FullscreenVideoContext = createContext<FullscreenVideoContextValue | null>(null);

export function FullscreenVideoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FullscreenVideoState>({ isOpen: false, params: null });

  const open = useCallback((params: FullscreenVideoOpenParams) => {
    setState({ isOpen: true, params });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, params: null });
  }, []);

  const value = useMemo(
    () => ({
      isOpen: state.isOpen,
      params: state.params,
      open,
      close,
    }),
    [state.isOpen, state.params, open, close]
  );

  return <FullscreenVideoContext.Provider value={value}>{children}</FullscreenVideoContext.Provider>;
}

export function useFullscreenVideo() {
  const ctx = useContext(FullscreenVideoContext);
  if (!ctx) {
    throw new Error("useFullscreenVideo must be used within FullscreenVideoProvider");
  }
  return ctx;
}
