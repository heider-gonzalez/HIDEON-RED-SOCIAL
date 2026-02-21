// 🚀 Auth Performance Dashboard Component
// Monitor Google Auth performance metrics in real-time

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { performanceMonitor } from '@/utils/performance-monitor';

export function AuthPerformanceDashboard() {
  const [averageTime, setAverageTime] = useState(0);
  const [cacheHitRate, setCacheHitRate] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAverageTime(performanceMonitor.getAverageTime());
      setCacheHitRate(performanceMonitor.getCacheHitRate());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (import.meta.env.PROD || !isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 z-50"
      >
        📊 Auth Perf
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 bg-white dark:bg-gray-800 border shadow-lg">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🚀 Auth Performance
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                ⏱️ Avg Time:
              </span>
              <span className={`text-sm font-medium ${
                averageTime < 500 ? 'text-green-600' : 
                averageTime < 1000 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {averageTime.toFixed(0)}ms
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                💾 Cache Hit:
              </span>
              <span className={`text-sm font-medium ${
                cacheHitRate > 80 ? 'text-green-600' : 
                cacheHitRate > 50 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {cacheHitRate.toFixed(1)}%
              </span>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                📊 Real-time Google Auth metrics
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
