import { BusinessRule, GitChange } from '../types';
export interface AnalysisLog {
    timestamp: string;
    taskId: string;
    taskTitle: string;
    branchName: string;
    baseBranch: string;
    analysisDetails: {
        rulesAnalyzed: BusinessRule[];
        gitChanges: GitChange[];
        agentPrompt: string;
        agentResponse: string;
        finalResult: any;
    };
    performance: {
        gitAnalysisTime: number;
        aiAnalysisTime: number;
        totalTime: number;
    };
}
export declare class AnalysisLogger {
    private logDir;
    constructor(logDir?: string);
    logAnalysis(log: AnalysisLog): Promise<string>;
    logGitChanges(changes: GitChange[], baseBranch: string, currentBranch: string): Promise<string>;
    logAgentPrompt(prompt: string, taskId: string): Promise<string>;
    logAgentResponse(response: string, taskId: string): Promise<string>;
}
//# sourceMappingURL=analysis-logger.d.ts.map