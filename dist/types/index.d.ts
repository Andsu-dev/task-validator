export interface BusinessRule {
    id: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: 'validation' | 'business_logic' | 'ui' | 'database' | 'api' | 'security' | 'performance' | 'controller' | 'routes';
    implemented: boolean;
    confidence: number;
    evidence?: string;
    criteria?: string[];
}
export interface GitChange {
    filePath: string;
    changeType: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    content: string;
    diff: string;
    isLocal?: boolean;
}
export interface ValidationResult {
    taskId: string;
    branchName: string;
    completenessScore: number;
    implementedRules: BusinessRule[];
    missingRules: BusinessRule[];
    suggestions: string[];
    timestamp: Date;
    summary: {
        totalRules: number;
        implementedCount: number;
        missingCount: number;
        highPriorityMissing: number;
    };
}
export interface TaskRules {
    taskId: string;
    title: string;
    description: string;
    rules: BusinessRule[];
    createdAt: Date;
    updatedAt: Date;
}
export interface AgentContext {
    rules: TaskRules;
    gitChanges: GitChange[];
    repositoryPath: string;
    branchName: string;
}
export interface AgentResponse {
    analysis: RuleAnalysis[];
    overallCompleteness: number;
    generalSuggestions: string[];
    summary: string;
}
export interface RuleAnalysis {
    ruleId: string;
    implemented: boolean;
    confidence: number;
    evidence: string;
    suggestion?: string;
}
//# sourceMappingURL=index.d.ts.map