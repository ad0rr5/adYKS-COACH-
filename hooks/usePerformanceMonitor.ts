import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
}

/**
 * Performance monitoring hook for development
 * @param componentName - Name of the component being monitored
 * @param enabled - Whether monitoring is enabled (default: development mode only)
 */
export function usePerformanceMonitor(
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: Date.now(),
    };

    // Log slow renders (> 16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`🐌 Slow render detected in ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        renderCount: renderCount.current,
        threshold: '16ms (60fps)',
      });
    }

    // Log to performance API if available
    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(`${componentName}-render-${renderCount.current}`);
    }

    // Store metrics for analysis
    if (typeof window !== 'undefined') {
      const existingMetrics = JSON.parse(
        localStorage.getItem('performance-metrics') || '[]'
      );
      
      const updatedMetrics = [...existingMetrics, metrics].slice(-100); // Keep last 100 entries
      localStorage.setItem('performance-metrics', JSON.stringify(updatedMetrics));
    }
  });

  return {
    renderCount: renderCount.current,
    getMetrics: () => {
      if (typeof window === 'undefined') return [];
      return JSON.parse(localStorage.getItem('performance-metrics') || '[]');
    },
    clearMetrics: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('performance-metrics');
      }
    },
  };
}

/**
 * Hook to measure and log component mount time
 * @param componentName - Name of the component
 */
export function useMountTime(componentName: string) {
  const mountStartTime = useRef<number>(performance.now());

  useEffect(() => {
    const mountEndTime = performance.now();
    const mountTime = mountEndTime - mountStartTime.current;

    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${componentName} mounted in ${mountTime.toFixed(2)}ms`);
    }

    // Mark mount completion
    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(`${componentName}-mounted`);
    }
  }, [componentName]);
}

/**
 * Hook to track memory usage (development only)
 * @param componentName - Name of the component
 * @param interval - Monitoring interval in ms (default: 5000)
 */
export function useMemoryMonitor(componentName: string, interval: number = 5000) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const monitor = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const used = Math.round(memory.usedJSHeapSize / 1048576); // MB
        const total = Math.round(memory.totalJSHeapSize / 1048576); // MB
        const limit = Math.round(memory.jsHeapSizeLimit / 1048576); // MB

        console.log(`🧠 Memory usage in ${componentName}:`, {
          used: `${used}MB`,
          total: `${total}MB`,
          limit: `${limit}MB`,
          percentage: `${Math.round((used / limit) * 100)}%`,
        });

        // Warn if memory usage is high
        if (used / limit > 0.8) {
          console.warn(`⚠️ High memory usage detected in ${componentName}: ${used}MB (${Math.round((used / limit) * 100)}%)`);
        }
      }
    };

    const intervalId = setInterval(monitor, interval);
    return () => clearInterval(intervalId);
  }, [componentName, interval]);
}