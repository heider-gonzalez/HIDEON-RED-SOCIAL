/**
 * Sistema de monitoreo de rendimiento
 * Rastrea métricas clave de la aplicación
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Limitar el número de métricas almacenadas

  /**
   * Registra una métrica de rendimiento
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Limitar el tamaño del array
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // En producción, enviar a servicio de monitoreo
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      this.sendToMonitoringService(metric);
    }
  }

  /**
   * Mide el tiempo de ejecución de una función asíncrona
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * Mide el tiempo de ejecución de una función síncrona
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * Obtiene métricas por nombre
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Obtiene el promedio de una métrica
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Obtiene el percentil de una métrica
   */
  getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetricsByName(name)
      .map(m => m.value)
      .sort((a, b) => a - b);
    
    if (metrics.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * metrics.length) - 1;
    return metrics[Math.max(0, index)];
  }

  /**
   * Limpia métricas antiguas
   */
  clearMetrics(olderThan?: number): void {
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    } else {
      this.metrics = [];
    }
  }

  /**
   * Envía métricas a servicio de monitoreo (placeholder)
   */
  private sendToMonitoringService(metric: PerformanceMetric): void {
    // Aquí se implementaría el envío a servicios como:
    // - Google Analytics
    // - Sentry
    // - Datadog
    // - Custom backend endpoint
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance Monitor]', metric);
    }
  }

  /**
   * Obtiene Web Vitals del navegador
   */
  getWebVitals(): Promise<Record<string, number>> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        resolve({});
        return;
      }

      const vitals: Record<string, number> = {};

      // Observar FCP (First Contentful Paint)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcp) {
            vitals.fcp = fcp.startTime;
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // Ignore if not supported
      }

      // Observar LCP (Largest Contentful Paint)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1];
          if (lcp) {
            vitals.lcp = lcp.startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Ignore if not supported
      }

      // Resolver después de un tiempo para permitir que las métricas se capturen
      setTimeout(() => resolve(vitals), 1000);
    });
  }
}

// Instancia singleton del monitor
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook de React para usar el monitor de rendimiento
 */
export function usePerformanceMonitor() {
  return {
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    getMetricsByName: performanceMonitor.getMetricsByName.bind(performanceMonitor),
    getAverageMetric: performanceMonitor.getAverageMetric.bind(performanceMonitor),
    getPercentile: performanceMonitor.getPercentile.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor),
    getWebVitals: performanceMonitor.getWebVitals.bind(performanceMonitor),
  };
}