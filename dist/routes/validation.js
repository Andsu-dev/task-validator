"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationRoutes = void 0;
// src/routes/validation.ts
const express_1 = require("express");
const TaskValidatorAgent_1 = require("@/agents/TaskValidatorAgent");
const git_service_1 = require("@/services/git.service");
const validation_report_service_1 = require("@/services/validation-report.service");
const logger_1 = require("@/utils/logger");
const router = (0, express_1.Router)();
exports.validationRoutes = router;
// POST /api/validation/validate
router.post('/validate', async (req, res) => {
    try {
        const { rules, repositoryPath, baseBranch = 'main' } = req.body;
        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'GOOGLE_API_KEY not configured'
            });
        }
        const gitService = new git_service_1.GitService(repositoryPath || process.cwd());
        const gitChanges = await gitService.getChanges(baseBranch);
        const branchName = await gitService.getCurrentBranch();
        const agent = new TaskValidatorAgent_1.TaskValidatorAgent(process.env.GOOGLE_API_KEY);
        const result = await agent.validateTask({
            rules,
            gitChanges,
            branchName,
            repositoryPath: repositoryPath || process.cwd()
        });
        const reportService = new validation_report_service_1.ValidationReportService();
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
    }
    catch (error) {
        logger_1.logger.error('Validation error', error);
        res.status(500).json({
            success: false,
            message: 'Error during validation',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/validation/report
router.post('/report', async (req, res) => {
    try {
        const { rules, repositoryPath, baseBranch = 'main', reportType = 'detailed' } = req.body;
        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'GOOGLE_API_KEY not configured'
            });
        }
        // Obter alterações do Git
        const gitService = new git_service_1.GitService(repositoryPath || process.cwd());
        const gitChanges = await gitService.getChanges(baseBranch);
        const branchName = await gitService.getCurrentBranch();
        const agent = new TaskValidatorAgent_1.TaskValidatorAgent(process.env.GOOGLE_API_KEY);
        const result = await agent.validateTask({
            rules,
            gitChanges,
            branchName,
            repositoryPath: repositoryPath || process.cwd()
        });
        // Gerar relatório
        const reportService = new validation_report_service_1.ValidationReportService();
        const report = await reportService.generateReport(result);
        let reportPath;
        if (reportType === 'detailed') {
            reportPath = await reportService.saveDetailedReport(result);
        }
        else {
            reportPath = await reportService.saveReport(report);
        }
        res.json({
            success: true,
            report: {
                ...report,
                reportPath: reportPath
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Report generation error', error);
        res.status(500).json({
            success: false,
            message: 'Error generating report',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=validation.js.map