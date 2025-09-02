import { ValidationResult } from '../types';
export declare class ValidationReportService {
    private outputDir;
    constructor(outputDir?: string);
    private ensureOutputDir;
    generateReport(validationResult: ValidationResult): Promise<any>;
    private generateAnalysis;
    saveReport(report: any, filename?: string): Promise<string>;
    saveDetailedReport(validationResult: ValidationResult, filename?: string): Promise<string>;
    private groupRulesByCategory;
}
//# sourceMappingURL=validation-report.service.d.ts.map