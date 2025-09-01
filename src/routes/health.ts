// src/routes/health.ts
import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

// GET /api/health
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Task Validator Agent is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// GET /api/health/ready
router.get('/ready', (req: Request, res: Response) => {
  // Check if required environment variables are set
  const requiredEnvVars = ['GOOGLE_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.warn('Missing required environment variables', { missingVars });
    return res.status(503).json({
      success: false,
      message: 'Service not ready',
      missingEnvironmentVariables: missingVars
    });
  }

  res.json({
    success: true,
    message: 'Service is ready',
    timestamp: new Date().toISOString()
  });
});

export { router as healthRoutes };
