// 🚀 Performance Monitoring Utility
// Track Google Auth performance metrics

import { useState, useEffect } from 'react';

interface AuthMetrics {
  startTime: number;
  profileCheckTime?: number;
  endTime?: number;
  totalTime?: number;
  cached: boolean;
  userId: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, AuthMetrics> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startAuthTracking(userId: string): string {
    const trackingId = `${userId}-${Date.now()}`;
    this.metrics.set(trackingId, {
      startTime: performance.now(),
      cached: false,
      userId
    });
    console.log(`🚀 Performance Monitor: Started tracking auth for user ${userId}`);
    return trackingId;
  }

  markProfileCheck(trackingId: string, cached: boolean): void {
    const metric = this.metrics.get(trackingId);
    if (metric) {
      metric.profileCheckTime = performance.now();
      metric.cached = cached;
      console.log(`🚀 Performance Monitor: Profile check ${cached ? '(CACHED)' : '(DB QUERY)'} for ${metric.userId}`);
    }
  }

  endAuthTracking(trackingId: string): void {
    const metric = this.metrics.get(trackingId);
    if (metric) {
      metric.endTime = performance.now();
      metric.totalTime = metric.endTime - metric.startTime;
      
      console.log(`🚀 Performance Monitor: Auth completed for ${metric.userId}`);
      console.log(`   ⏱️  Total time: ${metric.totalTime?.toFixed(2)}ms`);
      console.log(`   🗄️  Profile check: ${metric.profileCheckTime ? (metric.profileCheckTime - metric.startTime).toFixed(2) : 'N/A'}ms`);
      console.log(`   💾 Cached: ${metric.cached ? 'YES' : 'NO'}`);
      
      // Performance alerts
      if (metric.totalTime > 2000) {
        console.warn(`⚠️  Slow auth detected: ${metric.totalTime?.toFixed(2)}ms for user ${metric.userId}`);
      }
      
      if (metric.totalTime < 500 && metric.cached) {
        console.log(`✅ Fast auth with cache: ${metric.totalTime?.toFixed(2)}ms for user ${metric.userId}`);
      }
    }
  }

  getAverageTime(): number {
    const completedMetrics = Array.from(this.metrics.values()).filter(m => m.totalTime);
    if (completedMetrics.length === 0) return 0;
    
    const total = completedMetrics.reduce((sum, m) => sum + (m.totalTime || 0), 0);
    return total / completedMetrics.length;
  }

  getCacheHitRate(): number {
    const completedMetrics = Array.from(this.metrics.values()).filter(m => m.totalTime);
    if (completedMetrics.length === 0) return 0;
    
    const cachedCount = completedMetrics.filter(m => m.cached).length;
    return (cachedCount / completedMetrics.length) * 100;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Hook for React components
export function useAuthPerformance() {
  const [averageTime, setAverageTime] = useState(0);
  const [cacheHitRate, setCacheHitRate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAverageTime(performanceMonitor.getAverageTime());
      setCacheHitRate(performanceMonitor.getCacheHitRate());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { averageTime, cacheHitRate };
}
