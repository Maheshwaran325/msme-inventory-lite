import { LogEntry } from './logger';

export interface OperationMetrics {
  count: number;
  latencies: number[];
  p95_latency: number;
  avg_latency: number;
  min_latency: number;
  max_latency: number;
}

export interface CRUDMetrics {
  CREATE: OperationMetrics;
  READ: OperationMetrics;
  UPDATE: OperationMetrics;
  DELETE: OperationMetrics;
}

class MetricsCollector {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  // Calculate p95 latency from an array of latencies
  private calculateP95(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    
    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
  }

  // Calculate metrics for a specific operation
  private calculateOperationMetrics(logs: LogEntry[], operation: string): OperationMetrics {
    const operationLogs = logs.filter(log => log.operation === operation);
    const latencies = operationLogs.map(log => log.latency);

    if (latencies.length === 0) {
      return {
        count: 0,
        latencies: [],
        p95_latency: 0,
        avg_latency: 0,
        min_latency: 0,
        max_latency: 0
      };
    }

    const sum = latencies.reduce((acc, val) => acc + val, 0);
    
    return {
      count: operationLogs.length,
      latencies,
      p95_latency: this.calculateP95(latencies),
      avg_latency: Math.round(sum / latencies.length),
      min_latency: Math.min(...latencies),
      max_latency: Math.max(...latencies)
    };
  }

  // Generate comprehensive metrics from logs
  generateMetrics(logs: LogEntry[]): {
    summary: {
      total_operations: number;
      success_rate: number;
      uptime_seconds: number;
      timestamp: string;
    };
    operations: CRUDMetrics;
    status_breakdown: Record<string, number>;
    recent_errors: LogEntry[];
  } {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);
    
    // Calculate success rate
    const successfulOps = logs.filter(log => log.status === 'SUCCESS').length;
    const successRate = logs.length > 0 ? (successfulOps / logs.length) * 100 : 100;

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    logs.forEach(log => {
      statusBreakdown[log.status] = (statusBreakdown[log.status] || 0) + 1;
    });

    // Recent errors (last 10)
    const recentErrors = logs
      .filter(log => log.status !== 'SUCCESS')
      .slice(-10);

    return {
      summary: {
        total_operations: logs.length,
        success_rate: Math.round(successRate * 100) / 100,
        uptime_seconds: uptimeSeconds,
        timestamp: new Date().toISOString()
      },
      operations: {
        CREATE: this.calculateOperationMetrics(logs, 'CREATE'),
        READ: this.calculateOperationMetrics(logs, 'READ'),
        UPDATE: this.calculateOperationMetrics(logs, 'UPDATE'),
        DELETE: this.calculateOperationMetrics(logs, 'DELETE')
      },
      status_breakdown: statusBreakdown,
      recent_errors: recentErrors
    };
  }

  // Reset start time (useful for testing)
  resetStartTime(): void {
    this.startTime = Date.now();
  }
}

export const metricsCollector = new MetricsCollector();