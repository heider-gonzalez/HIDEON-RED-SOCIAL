const STORAGE_PATTERNS: Array<RegExp> = [
  /\/storage\/v1\/object\/public\//i,
  /\/storage\/v1\/render\/image/i,
  /supabase\.co\/storage/i,
];

export function isSupabaseStorageUrl(url: string): boolean {
  const s = String(url || '');
  if (!s) return false;
  return STORAGE_PATTERNS.some((re) => re.test(s));
}

export function installSupabaseStorageBlocker(): void {
  if (typeof window === 'undefined') return;

  const allowSupabase = String((import.meta as any)?.env?.VITE_ALLOW_SUPABASE_STORAGE || '').toLowerCase() === 'true';
  if (allowSupabase) return;

  const w = window as any;
  if (w.__hsocialSupabaseStorageBlockerInstalled) return;
  w.__hsocialSupabaseStorageBlockerInstalled = true;

  const sanitizeAttr = (el: Element, attr: string) => {
    const value = el.getAttribute(attr);
    if (!value) return;
    if (isSupabaseStorageUrl(value)) {
      el.setAttribute('data-blocked-supabase-storage', 'true');
      el.removeAttribute(attr);
    }
  };

  const sanitizeElement = (el: Element) => {
    sanitizeAttr(el, 'src');
    sanitizeAttr(el, 'srcset');
    sanitizeAttr(el, 'href');
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (isSupabaseStorageUrl(url)) {
      return Promise.reject(new Error('Blocked request to Supabase Storage URL'));
    }
    return originalFetch(input as any, init);
  };

  const OriginalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, isAsync?: boolean, user?: string | null, password?: string | null) {
    const u = typeof url === 'string' ? url : url.toString();
    if (isSupabaseStorageUrl(u)) {
      throw new Error('Blocked XHR to Supabase Storage URL');
    }
    return (OriginalXhrOpen as any).apply(this, [method, url as any, isAsync, user, password]);
  };

  try {
    document.querySelectorAll('[src],[srcset],[href]').forEach((node) => sanitizeElement(node as Element));

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target && m.attributeName) {
          if (m.attributeName === 'src' || m.attributeName === 'srcset' || m.attributeName === 'href') {
            sanitizeAttr(m.target as Element, m.attributeName);
          }
        }
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            if (!(n instanceof Element)) return;
            sanitizeElement(n);
            n.querySelectorAll?.('[src],[srcset],[href]').forEach((child) => sanitizeElement(child as Element));
          });
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['src', 'srcset', 'href'],
      subtree: true,
      childList: true,
    });
  } catch {
    // ignore
  }
}
