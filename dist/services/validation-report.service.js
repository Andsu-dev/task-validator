"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationReportService = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("@/utils/logger");
class ValidationReportService {
    outputDir;
    constructor(outputDir = './reports') {
        this.outputDir = outputDir;
        this.ensureOutputDir();
    }
    async ensureOutputDir() {
        try {
            await fs_extra_1.default.ensureDir(this.outputDir);
        }
        catch (error) {
            logger_1.logger.error('Error creating output directory:', error);
        }
    }
    async generateReport(validationResult) {
        const percentage = `${(validationResult.completenessScore * 100).toFixed(1)}%`;
        const report = {
            taskId: validationResult.taskId,
            branchName: validationResult.branchName,
            timestamp: validationResult.timestamp.toISOString(),
            summary: {
                totalRules: validationResult.summary.totalRules,
                implementedCount: validationResult.summary.implementedCount,
                missingCount: validationResult.summary.missingCount,
                highPriorityMissing: validationResult.summary.highPriorityMissing,
                completenessScore: validationResult.completenessScore,
                percentage
            },
            implementedRules: validationResult.implementedRules,
            missingRules: validationResult.missingRules,
            suggestions: validationResult.suggestions,
            analysis: this.generateAnalysis(validationResult)
        };
        return report;
    }
    generateAnalysis(validationResult) {
        const strengths = [];
        const weaknesses = [];
        const nextSteps = [];
        // Análise de pontos fortes
        if (validationResult.implementedRules.length > 0) {
            strengths.push(`✅ ${validationResult.implementedRules.length} regras implementadas com sucesso`);
            const highPriorityImplemented = validationResult.implementedRules.filter(r => r.priority === 'high');
            if (highPriorityImplemented.length > 0) {
                strengths.push(`✅ ${highPriorityImplemented.length} regras de alta prioridade implementadas`);
            }
        }
        // Análise de pontos fracos
        if (validationResult.missingRules.length > 0) {
            weaknesses.push(`❌ ${validationResult.missingRules.length} regras não implementadas`);
            const highPriorityMissing = validationResult.missingRules.filter(r => r.priority === 'high');
            if (highPriorityMissing.length > 0) {
                weaknesses.push(`⚠️ ${highPriorityMissing.length} regras de alta prioridade pendentes`);
            }
        }
        if (validationResult.completenessScore < 0.5) {
            weaknesses.push('⚠️ Score de completude baixo (< 50%)');
        }
        // Próximos passos
        if (validationResult.missingRules.length > 0) {
            const highPriorityRules = validationResult.missingRules
                .filter(r => r.priority === 'high')
                .slice(0, 3);
            highPriorityRules.forEach(rule => {
                nextSteps.push(`🔧 Implementar: ${rule.description}`);
            });
        }
        if (validationResult.suggestions.length > 0) {
            validationResult.suggestions.forEach(suggestion => {
                nextSteps.push(`💡 ${suggestion}`);
            });
        }
        return { strengths, weaknesses, nextSteps };
    }
    async saveReport(report, filename) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultFilename = `validation-report-${report.taskId}-${timestamp}.json`;
            const finalFilename = filename || defaultFilename;
            const filePath = path_1.default.join(this.outputDir, finalFilename);
            await fs_extra_1.default.writeJson(filePath, report, { spaces: 2 });
            logger_1.logger.info(`Validation report saved to: ${filePath}`);
            return filePath;
        }
        catch (error) {
            logger_1.logger.error('Error saving validation report:', error);
            throw error;
        }
    }
    async saveDetailedReport(validationResult, filename) {
        try {
            const report = await this.generateReport(validationResult);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultFilename = `detailed-validation-${report.taskId}-${timestamp}.json`;
            const finalFilename = filename || defaultFilename;
            const filePath = path_1.default.join(this.outputDir, finalFilename);
            const detailedReport = {
                ...report,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    validatorVersion: '1.0.0',
                    validationDuration: 'N/A'
                },
                rulesBreakdown: {
                    byPriority: {
                        high: {
                            total: validationResult.implementedRules.filter(r => r.priority === 'high').length +
                                validationResult.missingRules.filter(r => r.priority === 'high').length,
                            implemented: validationResult.implementedRules.filter(r => r.priority === 'high').length,
                            missing: validationResult.missingRules.filter(r => r.priority === 'high').length
                        },
                        medium: {
                            total: validationResult.implementedRules.filter(r => r.priority === 'medium').length +
                                validationResult.missingRules.filter(r => r.priority === 'medium').length,
                            implemented: validationResult.implementedRules.filter(r => r.priority === 'medium').length,
                            missing: validationResult.missingRules.filter(r => r.priority === 'medium').length
                        },
                        low: {
                            total: validationResult.implementedRules.filter(r => r.priority === 'low').length +
                                validationResult.missingRules.filter(r => r.priority === 'low').length,
                            implemented: validationResult.implementedRules.filter(r => r.priority === 'low').length,
                            missing: validationResult.missingRules.filter(r => r.priority === 'low').length
                        }
                    },
                    byCategory: this.groupRulesByCategory(validationResult)
                }
            };
            await fs_extra_1.default.writeJson(filePath, detailedReport, { spaces: 2 });
            logger_1.logger.info(`Detailed validation report saved to: ${filePath}`);
            return filePath;
        }
        catch (error) {
            logger_1.logger.error("Error saving detailed validation report:", error);
            throw error;
        }
    }
    groupRulesByCategory(validationResult) {
        const allRules = [...validationResult.implementedRules, ...validationResult.missingRules];
        const categories = {};
        allRules.forEach(rule => {
            if (!categories[rule.category]) {
                categories[rule.category] = {
                    total: 0,
                    implemented: 0,
                    missing: 0,
                    rules: []
                };
            }
            categories[rule.category].total++;
            categories[rule.category].rules.push({
                id: rule.id,
                description: rule.description,
                priority: rule.priority,
                implemented: rule.implemented,
                confidence: rule.confidence,
                evidence: rule.evidence
            });
            if (rule.implemented) {
                categories[rule.category].implemented++;
            }
            else {
                categories[rule.category].missing++;
            }
        });
        return categories;
    }
}
exports.ValidationReportService = ValidationReportService;
//# sourceMappingURL=validation-report.service.js.map