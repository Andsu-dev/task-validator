// src/routes/validation.ts
import { Router, Request, Response } from 'express';
import { TaskValidatorAgent } from '@/agents/TaskValidatorAgent';
import { logger } from '@/utils/logger';

const router = Router();

// POST /api/validation/validate
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { rules, gitChanges, branchName, repositoryPath } = req.body;

    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_API_KEY not configured'
      });
    }

    const agent = new TaskValidatorAgent(process.env.GOOGLE_API_KEY);
    
    const result = await agent.validateTask({
      rules,
      gitChanges,
      branchName,
      repositoryPath: repositoryPath || process.cwd()
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Validation error', error);
    res.status(500).json({
      success: false,
      message: 'Error during validation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/validation/stream
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { rules, gitChanges, branchName, repositoryPath } = req.body;

    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_API_KEY not configured'
      });
    }

    const agent = new TaskValidatorAgent(process.env.GOOGLE_API_KEY);
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await agent.streamValidation({
      rules,
      gitChanges,
      branchName,
      repositoryPath: repositoryPath || process.cwd()
    }, (partial) => {
      res.write(`data: ${JSON.stringify(partial)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ complete: true, result })}\n\n`);
    res.end();
  } catch (error) {
    logger.error('Stream validation error', error);
    res.write(`data: ${JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })}\n\n`);
    res.end();
  }
});

export { router as validationRoutes };
