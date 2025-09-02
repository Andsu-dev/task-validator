// src/services/GitService.ts
import simpleGit, { SimpleGit } from 'simple-git';
import { GitChange } from '../types';
import { logger } from '../utils/logger';

export class GitService {
  private git: SimpleGit;

  constructor(repositoryPath: string) {
    this.git = simpleGit(repositoryPath);
  }

  async getChanges(baseBranch: string = 'main'): Promise<GitChange[]> {
    try {
      logger.info(`Getting Git changes from ${baseBranch} to current branch`);

      const currentBranch = await this.git.branch();
      const currentBranchName = currentBranch.current;

      let diffResult: string;
      if (baseBranch === currentBranchName) {
        diffResult = await this.git.diff([
          'HEAD~1..HEAD',
          '--name-status'
        ]);
      } else {
        diffResult = await this.git.diff([
          `${baseBranch}...${currentBranchName}`,
          '--name-status'
        ]);
      }

      const lines = diffResult.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        logger.info('No changes found');
        return [];
      }

      const changes: GitChange[] = [];

      for (const line of lines) {
        const [status, filePath] = line.split('\t');
        if (!filePath) continue;
        try {
          const content = await this.git.show([`${currentBranchName}:${filePath}`]);
          
          let fileDiff: string;
          if (baseBranch === currentBranchName) {
            fileDiff = await this.git.diff([
              'HEAD~1..HEAD',
              '--',
              filePath
            ]);
          } else {
            fileDiff = await this.git.diff([
              `${baseBranch}...${currentBranchName}`,
              '--',
              filePath
            ]);
          }

          const additions = (fileDiff.match(/^\+/gm) || []).length;
          const deletions = (fileDiff.match(/^-/gm) || []).length;

          changes.push({
            filePath: filePath,
            changeType: this.mapGitStatus(status),
            additions,
            deletions,
            content,
            diff: fileDiff
          });

          logger.info(`Processed file: ${filePath} (${status})`);
        } catch (error) {
          logger.warn(`Error processing file ${filePath}:`, error);
        }
      }

      logger.info(`Found ${changes.length} changed files`);
      return changes;
    } catch (error) {
      logger.error("Error getting Git changes:", error);
      throw error;
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.branch();
      return branch.current;
    } catch (error) {
      logger.error("Error getting current branch:", error);
      throw error;
    }
  }

  async getRepositoryPath(): Promise<string> {
    try {
      const remotes = await this.git.getRemotes(true);
      if (remotes.length > 0) {
        return remotes[0].refs.fetch;
      }
      return 'local';
    } catch (error) {
      logger.error("Error getting repository path:", error);
      return 'local';
    }
  }

  private mapGitStatus(status: string): 'added' | 'modified' | 'deleted' | 'renamed' {
    switch (status) {
      case 'A':
        return 'added';
      case 'M':
        return 'modified';
      case 'D':
        return 'deleted';
      case 'R':
        return 'renamed';
      default:
        return 'modified';
    }
  }
}
