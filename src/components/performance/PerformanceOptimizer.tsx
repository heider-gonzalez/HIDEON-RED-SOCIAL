import { useEffect, useRef, useState } from 'react';
import { usePreloadData, useNavigationPreload } from '@/hooks/use-preload-data';
import { usePreloadMessages } from '@/hooks/use-messages-optimized';
import { usePreloadNotifications as preloadNotifications } from '@/hooks/use-notifications-optimized';
import { useAuth } from '@/hooks/use-auth';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
}

export const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({ children }) => {
  const { user } = useAuth();
  const [isOptimized, setIsOptimized] = useState(false);
  const hasOptimized = useRef(false);
  const { preloadRoute } = useNavigationPreload();

  // Preload critical data for authenticated users
  const { isPreloaded } = usePreloadData(user?.id || null, {
    enabled: !!user?.id,
    priority: 'high',
    delay: 50 // Very fast preload
  });

  // Preload messages and notifications
  usePreloadMessages(user?.id || null);
  preloadNotifications(user?.id || null);

  // Optimize images and media
  useEffect(() => {
    if (!user?.id || hasOptimized.current) return;

    const optimizeImages = () => {
      // Add loading="lazy" to all images below the fold
      const images = document.querySelectorAll('img:not([loading])');
      images.forEach((img, index) => {
        if (index > 3) { // Only lazy load images after the first 3
          img.setAttribute('loading', 'lazy');
        }
      });
    };

    // Preload critical images
    const preloadCriticalImages = () => {
      const criticalImages = [
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ];

      criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      });
    };

    // Optimize fonts
    const optimizeFonts = () => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = 'https://fonts.googleapis.com';
      document.head.appendChild(link);

      const link2 = document.createElement('link');
      link2.rel = 'preconnect';
      link2.href = 'https://fonts.gstatic.com';
      link2.crossOrigin = 'anonymous';
      document.head.appendChild(link2);
    };

    // Run optimizations
    const timer = setTimeout(() => {
      optimizeImages();
      preloadCriticalImages();
      optimizeFonts();
      setIsOptimized(true);
      hasOptimized.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [user?.id]);

  // Preload routes on hover
  useEffect(() => {
    const handleLinkHover = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        const url = new URL(link.href);
        const route = url.pathname;
        
        // Preload common routes
        if (['/messages', '/notifications', '/explore'].includes(route)) {
          preloadRoute(route);
        }
      }
    };

    document.addEventListener('mouseover', handleLinkHover);
    return () => document.removeEventListener('mouseover', handleLinkHover);
  }, [preloadRoute]);

  // Service Worker for caching
  useEffect(() => {
    if ('serviceWorker' in navigator && !hasOptimized.current) {
      navigator.serviceWorker.ready.then((registration) => {
        // Precache critical routes
        registration.active?.postMessage({
          type: 'PRECACHE',
          urls: [
            '/',
            '/messages',
            '/notifications',
            '/explore',
            '/api/user'
          ]
        });
      });
    }
  }, []);

  // Memory optimization
  useEffect(() => {
    const cleanup = () => {
      // Clear unused caches periodically
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('old-') || cacheName.includes('temp-')) {
              caches.delete(cacheName);
            }
          });
        });
      }
    };

    const interval = setInterval(cleanup, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {children}
    </>
  );
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fcp: 0, // First Contentful Paint
    lcp: 0, // Largest Contentful Paint
    fid: 0, // First Input Delay
    cls: 0, // Cumulative Layout Shift
  });

  useEffect(() => {
    if ('PerformanceObserver' in window) {
      // Measure First Contentful Paint
      const observerFCP = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, fcp: fcp.startTime }));
      });
      observerFCP.observe({ entryTypes: ['paint'] });

      // Measure Largest Contentful Paint
      const observerLCP = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, lcp: lcp.startTime }));
      });
      observerLCP.observe({ entryTypes: ['largest-contentful-paint'] });

      // Measure First Input Delay
      const observerFID = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fid = entries[0];
        if (fid && 'startTime' in fid && 'processingStart' in fid) {
          setMetrics(prev => ({ ...prev, fid: (fid as any).processingStart - (fid as any).startTime }));
        }
      });
      observerFID.observe({ entryTypes: ['first-input'] });

      // Measure Cumulative Layout Shift
      const observerCLS = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        setMetrics(prev => ({ ...prev, cls: prev.cls + clsValue }));
      });
      observerCLS.observe({ entryTypes: ['layout-shift'] });

      return () => {
        observerFCP.disconnect();
        observerLCP.disconnect();
        observerFID.disconnect();
        observerCLS.disconnect();
      };
    }
  }, []);

  return metrics;
};

// Component for lazy loading heavy components
export const LazyLoader: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}> = ({ children, fallback = <div>Loading...</div>, rootMargin = '50px' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={elementRef}>
      {isVisible ? children : fallback}
    </div>
  );
};
