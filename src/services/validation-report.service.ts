import fs from 'fs-extra';
import path from 'path';
import { ValidationResult } from '../types';
import { logger } from '../utils/logger';

export class ValidationReportService {
  private outputDir: string;

  constructor(outputDir: string = './reports') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.ensureDir(this.outputDir);
    } catch (error) {
      logger.error('Error creating output directory:', error);
    }
  }

  async generateReport(validationResult: ValidationResult): Promise<any> {
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

  private generateAnalysis(validationResult: ValidationResult): {
    strengths: string[];
    weaknesses: string[];
    nextSteps: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const nextSteps: string[] = [];

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

  async saveReport(report: any, filename?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `validation-report-${report.taskId}-${timestamp}.json`;
      const finalFilename = filename || defaultFilename;
      
      const filePath = path.join(this.outputDir, finalFilename);
      
      await fs.writeJson(filePath, report, { spaces: 2 });
      
      logger.info(`Validation report saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Error saving validation report:', error);
      throw error;
    }
  }

  async saveDetailedReport(validationResult: ValidationResult, filename?: string): Promise<string> {
    try {
      const report = await this.generateReport(validationResult);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `detailed-validation-${report.taskId}-${timestamp}.json`;
      const finalFilename = filename || defaultFilename;
      
      const filePath = path.join(this.outputDir, finalFilename);
      
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
      
      await fs.writeJson(filePath, detailedReport, { spaces: 2 });
      
      logger.info(`Detailed validation report saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error("Error saving detailed validation report:", error);
      throw error;
    }
  }

  private groupRulesByCategory(validationResult: ValidationResult): Record<string, any> {
    const allRules = [...validationResult.implementedRules, ...validationResult.missingRules];
    const categories: Record<string, any> = {};

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
      } else {
        categories[rule.category].missing++;
      }
    });

    return categories;
  }
}
