
import * as React from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "hsocial.theme";
const THEME_CHANGE_EVENT = "hsocial:theme-change";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
    return "system";
  } catch {
    return "system";
  }
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return getSystemTheme();
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark");
  if (resolved === "dark") root.classList.add("dark");
}

export function setTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  try {
    if (mode === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }

  try {
    const resolved = resolveTheme(mode);
    applyThemeClass(resolved);
  } catch {
    // ignore
  }

  try {
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  } catch {
    // ignore
  }
}

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = React.useState<ThemeMode>(() => readStoredTheme());

  const resolved = React.useMemo(() => resolveTheme(themeMode), [themeMode]);

  React.useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  React.useEffect(() => {
    const onExternalChange = () => {
      setThemeMode(readStoredTheme());
    };

    window.addEventListener("storage", onExternalChange);
    window.addEventListener(THEME_CHANGE_EVENT, onExternalChange);

    return () => {
      window.removeEventListener("storage", onExternalChange);
      window.removeEventListener(THEME_CHANGE_EVENT, onExternalChange);
    };
  }, []);

  React.useEffect(() => {
    if (themeMode !== "system") return;

    let mql: MediaQueryList | null = null;
    const onChange = () => {
      setThemeMode("system");
    };

    try {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", onChange);
      } else {
        (mql as any).addListener?.(onChange);
      }
    } catch {
      // ignore
    }

    return () => {
      if (!mql) return;
      try {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", onChange);
        } else {
          (mql as any).removeListener?.(onChange);
        }
      } catch {
        // ignore
      }
    };
  }, [themeMode]);

  const setThemeModeAndPersist = React.useCallback((mode: ThemeMode) => {
    setTheme(mode);
    setThemeMode(readStoredTheme());
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: themeMode,
      resolvedTheme: resolved,
      setTheme: setThemeModeAndPersist,
    }),
    [resolved, setThemeModeAndPersist, themeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
