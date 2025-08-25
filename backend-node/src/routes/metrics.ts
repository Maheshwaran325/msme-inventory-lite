import express from 'express';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = express.Router();

// GET /api/metrics - Get observability metrics (owners only for security)
router.get('/', authenticateToken, authorizeRole(['owner']), (req, res) => {
  try {
    const logs = logger.getLogs();
    const metrics = metricsCollector.generateMetrics(logs);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate metrics'
      }
    });
  }
});

// GET /api/metrics/logs - Get raw logs (owners only)
router.get('/logs', authenticateToken, authorizeRole(['owner']), (req, res) => {
  try {
    const { limit = '100', operation, status } = req.query as { 
      limit?: string; 
      operation?: string; 
      status?: string; 
    };
    
    let logs = logger.getLogs();
    
    // Filter by operation if specified
    if (operation) {
      logs = logs.filter(log => log.operation === operation.toUpperCase());
    }
    
    // Filter by status if specified
    if (status) {
      logs = logs.filter(log => log.status === status.toUpperCase());
    }
    
    // Apply limit
    const limitNum = Math.min(parseInt(limit, 10) || 100, 1000);
    const limitedLogs = logs.slice(-limitNum);
    
    res.json({
      success: true,
      data: {
        logs: limitedLogs,
        total_count: logs.length,
        returned_count: limitedLogs.length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve logs'
      }
    });
  }
});

// POST /api/metrics/clear - Clear logs and reset metrics (owners only)
router.post('/clear', authenticateToken, authorizeRole(['owner']), (req, res) => {
  try {
    logger.clearLogs();
    metricsCollector.resetStartTime();
    
    res.json({
      success: true,
      message: 'Logs cleared and metrics reset'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear metrics'
      }
    });
  }
});

export default router;