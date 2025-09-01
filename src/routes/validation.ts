// src/routes/validation.ts
import { Router, Request, Response } from 'express';
import { TaskValidatorAgent } from '@/agents/TaskValidatorAgent';
import { GitService } from '@/services/git.service';
import { ValidationReportService } from '@/services/validation-report.service';
import { logger } from '@/utils/logger';

const router = Router();

// POST /api/validation/validate
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { rules, repositoryPath, baseBranch = 'main' } = req.body;

    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_API_KEY not configured'
      });
    }

    const gitService = new GitService(repositoryPath || process.cwd());
    const gitChanges = await gitService.getChanges(baseBranch);
    const branchName = await gitService.getCurrentBranch();

    const agent = new TaskValidatorAgent(process.env.GOOGLE_API_KEY);
    
    const result = await agent.validateTask({
      rules,
      gitChanges,
      branchName,
      repositoryPath: repositoryPath || process.cwd()
    });

    const reportService = new ValidationReportService();
    const report = await reportService.generateReport(result);
    const reportPath = await reportService.saveDetailedReport(result);

    res.json({
      success: true,
      data: result,
      report: {
        summary: report.summary,
        analysis: report.analysis,
        reportPath: reportPath
      }
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

// POST /api/validation/report
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { rules, repositoryPath, baseBranch = 'main', reportType = 'detailed' } = req.body;

    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_API_KEY not configured'
      });
    }

    // Obter alterações do Git
    const gitService = new GitService(repositoryPath || process.cwd());
    const gitChanges = await gitService.getChanges(baseBranch);
    const branchName = await gitService.getCurrentBranch();

    const agent = new TaskValidatorAgent(process.env.GOOGLE_API_KEY);
    
    const result = await agent.validateTask({
      rules,
      gitChanges,
      branchName,
      repositoryPath: repositoryPath || process.cwd()
    });

    // Gerar relatório
    const reportService = new ValidationReportService();
    const report = await reportService.generateReport(result);
    
    let reportPath: string;
    if (reportType === 'detailed') {
      reportPath = await reportService.saveDetailedReport(result);
    } else {
      reportPath = await reportService.saveReport(report);
    }

    res.json({
      success: true,
      report: {
        ...report,
        reportPath: reportPath
      }
    });
  } catch (error) {
    logger.error('Report generation error', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as validationRoutes };
