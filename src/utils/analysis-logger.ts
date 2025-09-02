import fs from 'fs-extra';
import path from 'path';
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

export class AnalysisLogger {
  private logDir: string;

  constructor(logDir: string = 'logs') {
    this.logDir = logDir;
  }

  async logAnalysis(log: AnalysisLog): Promise<string> {
    try {
      await fs.ensureDir(this.logDir);
      
      const fileName = `analysis-${log.taskId}-${Date.now()}.json`;
      const filePath = path.join(this.logDir, fileName);
      
      await fs.writeJson(filePath, log, { spaces: 2 });
      
      return filePath;
    } catch (error) {
      console.warn('⚠️  Erro ao salvar log de análise:', error);
      return '';
    }
  }

  async logGitChanges(changes: GitChange[], baseBranch: string, currentBranch: string): Promise<string> {
    try {
      await fs.ensureDir(this.logDir);
      
      const fileName = `git-changes-${currentBranch}-${Date.now()}.json`;
      const filePath = path.join(this.logDir, fileName);
      
      const gitLog = {
        timestamp: new Date().toISOString(),
        baseBranch,
        currentBranch,
        totalChanges: changes.length,
        changes: changes.map(change => ({
          filePath: change.filePath,
          changeType: change.changeType,
          additions: change.additions,
          deletions: change.deletions,
          diff: change.diff
        }))
      };
      
      await fs.writeJson(filePath, gitLog, { spaces: 2 });
      
      return filePath;
    } catch (error) {
      console.warn('⚠️  Erro ao salvar log de mudanças Git:', error);
      return '';
    }
  }

  async logAgentPrompt(prompt: string, taskId: string): Promise<string> {
    try {
      await fs.ensureDir(this.logDir);
      
      const fileName = `agent-prompt-${taskId}-${Date.now()}.txt`;
      const filePath = path.join(this.logDir, fileName);
      
      await fs.writeFile(filePath, prompt);
      
      return filePath;
    } catch (error) {
      console.warn('⚠️  Erro ao salvar prompt do agente:', error);
      return '';
    }
  }

  async logAgentResponse(response: string, taskId: string): Promise<string> {
    try {
      await fs.ensureDir(this.logDir);
      
      const fileName = `agent-response-${taskId}-${Date.now()}.json`;
      const filePath = path.join(this.logDir, fileName);
      
      await fs.writeFile(filePath, response);
      
      return filePath;
    } catch (error) {
      console.warn('⚠️  Erro ao salvar resposta do agente:', error);
      return '';
    }
  }
}
