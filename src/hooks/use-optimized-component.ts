import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { isEqual } from 'lodash-es';

// Optimized memo component with deep comparison
export const createMemoComponent = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, areEqual || ((prevProps, nextProps) => {
    return isEqual(prevProps, nextProps);
  }));
};

// Hook for optimized callbacks
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  return useCallback(((...args: any[]) => callbackRef.current(...args)) as T, deps);
};

// Hook for optimized memoized values
export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const prevDeps = useRef<React.DependencyList>();
  const prevValue = useRef<T>();

  // Deep comparison of dependencies
  const depsChanged = !prevDeps.current || !isEqual(deps, prevDeps.current);

  if (depsChanged) {
    prevDeps.current = deps;
    prevValue.current = factory();
  }

  return prevValue.current as T;
};

// Hook for virtual scrolling
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  const offsetY = useMemo(() => {
    return visibleRange.startIndex * itemHeight;
  }, [visibleRange.startIndex, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
};

// Hook for intersection observer (lazy loading)
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([]);
  const observer = useRef<IntersectionObserver>();

  const observe = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.observe(element);
    }
  }, []);

  const unobserve = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.unobserve(element);
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver !== 'undefined') {
      observer.current = new IntersectionObserver(setEntries, options);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [options]);

  return { entries, observe, unobserve };
};

// Hook for resize observer
export const useResizeObserver = () => {
  const [entries, setEntries] = useState<ResizeObserverEntry[]>([]);
  const observer = useRef<ResizeObserver>();

  const observe = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.observe(element);
    }
  }, []);

  const unobserve = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.unobserve(element);
    }
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(setEntries);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return { entries, observe, unobserve };
};

// Hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} render #${renderCount.current} (${timeSinceLastRender}ms)`);
      
      if (timeSinceLastRender < 16) {
        console.warn(`⚠️ ${componentName} re-rendering too quickly!`);
      }
    }
    
    lastRenderTime.current = now;
  });

  return {
    renderCount: renderCount.current,
    averageRenderTime: Date.now() - lastRenderTime.current
  };
};

// Hook for debounced values
export const useDebouncedValue = <T>(
  value: T,
  delay: number
): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttled values
export const useThrottledValue = <T>(
  value: T,
  delay: number
): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastExecuted.current >= delay) {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }
    }, delay - (Date.now() - lastExecuted.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
};

// Hook for optimized list rendering
export const useOptimizedList = <T>(
  items: T[],
  keyExtractor: (item: T) => string,
  renderItem: (item: T, index: number) => React.ReactNode
) => {
  const memoizedItems = useMemo(() => {
    return items.map((item, index) => ({
      key: keyExtractor(item),
      item,
      index,
      rendered: renderItem(item, index)
    }));
  }, [items, keyExtractor, renderItem]);

  return memoizedItems;
};

// Component for optimized list rendering
export const OptimizedList = <T>({
  items,
  keyExtractor,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) => {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  } = useVirtualScroll(items, itemHeight, containerHeight, overscan);

  const memoizedItems = useOptimizedList(
    visibleItems,
    keyExtractor,
    renderItem
  );

  return React.createElement('div', {
    style: { height: containerHeight, overflow: 'auto' },
    onScroll: handleScroll
  }, 
    React.createElement('div', {
      style: { height: totalHeight, position: 'relative' }
    },
      React.createElement('div', {
        style: {
          transform: `translateY(${offsetY}px)`,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }
      },
        memoizedItems.map(({ key, rendered }) => 
          React.createElement('div', { 
            key: key, 
            style: { height: itemHeight } 
          }, rendered)
        )
      )
    )
  );
};

// Higher-order component for performance optimization
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    memo?: boolean;
    deepCompare?: boolean;
    monitorPerformance?: boolean;
  } = {}
) => {
  const {
    memo = true,
    deepCompare = true,
    monitorPerformance = false
  } = options;

  let OptimizedComponent: React.ComponentType<P> = Component;

  if (memo) {
    OptimizedComponent = createMemoComponent(
      OptimizedComponent,
      deepCompare ? undefined : (prev, next) => prev === next
    ) as React.ComponentType<P>;
  }

  if (monitorPerformance) {
    return ((props: P) => {
      const componentName = Component.displayName || Component.name || 'Component';
      usePerformanceMonitor(componentName);
      return React.createElement(OptimizedComponent, props);
    }) as React.ComponentType<P>;
  }

  return OptimizedComponent;
};
