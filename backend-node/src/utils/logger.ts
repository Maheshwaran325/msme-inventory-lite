import { Request } from 'express';

export interface LogEntry {
  timestamp: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  product_id?: string;
  actor_id?: string;
  status: 'SUCCESS' | 'ERROR' | 'CONFLICT' | 'NOT_FOUND' | 'PERMISSION_DENIED';
  latency: number;
  error_code?: string;
  error_message?: string;
  details?: any;
}

class Logger {
  private logs: LogEntry[] = [];

  log(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Also log to console for debugging
    console.log(JSON.stringify({
      ...entry,
      level: entry.status === 'SUCCESS' ? 'info' : 'error'
    }));
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Helper method to create log entry with timing
  createLogEntry(
    operation: LogEntry['operation'],
    startTime: number,
    req: Request,
    status: LogEntry['status'],
    product_id?: string,
    error_code?: string,
    error_message?: string,
    details?: any
  ): LogEntry {
    const latency = Date.now() - startTime;
    const actor_id = req.user?.id || 'anonymous';

    return {
      timestamp: new Date().toISOString(),
      operation,
      product_id,
      actor_id,
      status,
      latency,
      error_code,
      error_message,
      details
    };
  }
}

export const logger = new Logger();