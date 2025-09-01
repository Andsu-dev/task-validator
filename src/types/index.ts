// src/types/index.ts

export interface BusinessRule {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'validation' | 'business_logic' | 'ui' | 'database' | 'api' | 'security' | 'performance';
  implemented: boolean;
  confidence: number;
  evidence?: string;
}

export interface GitChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  content: string;
  diff: string;
}

export interface ValidationResult {
  taskId: string;
  branchName: string;
  completenessScore: number;
  implementedRules: BusinessRule[];
  missingRules: BusinessRule[];
  suggestions: string[];
  timestamp: Date;
  gitCommits: GitCommit[];
  summary: {
    totalRules: number;
    implementedCount: number;
    missingCount: number;
    highPriorityMissing: number;
  };
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export interface TaskRules {
  taskId: string;
  title: string;
  description: string;
  rules: BusinessRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationRequest {
  taskId: string;
  repositoryPath: string;
  branchName: string;
  baseBranch?: string;
}

export interface AgentContext {
  rules: TaskRules;
  gitChanges: GitChange[];
  repositoryPath: string;
  branchName: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: Date;
  errors?: string[];
}

// Agent specific types
export interface AgentConfig {
  anthropicApiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AgentPrompt {
  system: string;
  user: string;
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