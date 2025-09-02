// src/services/GitService.ts
import simpleGit, { SimpleGit } from 'simple-git';
import { GitChange } from '../types';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs-extra';

export class GitService {
  private git: SimpleGit;

  constructor(repositoryPath: string) {
    this.git = simpleGit(repositoryPath);
  }

  async getChanges(baseBranch: string = 'main', relevantPaths?: string[]): Promise<GitChange[]> {
    try {
      logger.info(`Getting Git changes from ${baseBranch} to current branch`);

      const currentBranch = await this.git.branch();
      const currentBranchName = currentBranch.current;

      const localChanges = await this.getLocalChanges(relevantPaths);
      const committedChanges = await this.getCommittedChanges(baseBranch, currentBranchName, relevantPaths);
      const allChanges = this.combineChanges(localChanges, committedChanges);

      logger.info(`Combined changes: ${allChanges.length} total (${localChanges.length} local, ${committedChanges.length} committed)`);

      return allChanges;
    } catch (error) {
      logger.error("Error getting Git changes:", error);
      throw error;
    }
  }

  private async getCommittedChanges(baseBranch: string, currentBranchName: string, relevantPaths?: string[]): Promise<GitChange[]> {
    const changes: GitChange[] = [];

    try {
      let diffResult: string;
      if (baseBranch === currentBranchName) {
        // Se estamos na branch base, comparar com commit anterior
        diffResult = await this.git.diff([
          'HEAD~1..HEAD',
          '--name-status'
        ]);
      } else {
        // Comparar com branch base
        diffResult = await this.git.diff([
          `${baseBranch}...${currentBranchName}`,
          '--name-status'
        ]);
      }

      const lines = diffResult.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [status, filePath] = line.split('\t');
        if (!filePath) continue;

        // Filtrar apenas arquivos relevantes se especificado
        if (relevantPaths && relevantPaths.length > 0) {
          const isRelevant = relevantPaths.some(relevantPath =>
            filePath.includes(relevantPath) ||
            filePath.startsWith(relevantPath) ||
            relevantPath.includes(filePath)
          );

          if (!isRelevant) {
            continue;
          }
        }

        try {
          let content = '';
          try {
            content = await this.git.show([`${currentBranchName}:${filePath}`]);
          } catch (showError) {
            // Arquivo pode ter sido deletado
            logger.warn(`Could not get content for ${filePath}, may be deleted`);
          }

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
            filePath,
            changeType: this.mapGitStatus(status),
            additions,
            deletions,
            content,
            diff: fileDiff,
            isLocal: false // Flag para identificar mudanças commitadas
          });

          logger.info(`Processed committed change: ${filePath} (${status})`);
        } catch (error) {
          logger.warn(`Error processing committed file ${filePath}:`, error);
        }
      }

      logger.info(`Found ${changes.length} committed changes`);
      return changes;
    } catch (error) {
      logger.error("Error getting committed changes:", error);
      return [];
    }
  }

  private combineChanges(localChanges: GitChange[], committedChanges: GitChange[]): GitChange[] {
    const combined = new Map<string, GitChange>();

    // Adicionar mudanças commitadas primeiro
    committedChanges.forEach(change => {
      combined.set(change.filePath, change);
    });

    // Sobrescrever/adicionar mudanças locais (têm prioridade)
    localChanges.forEach(change => {
      const existing = combined.get(change.filePath);
      if (existing) {
        // Se arquivo tem tanto mudanças commitadas quanto locais, 
        // usar conteúdo local mas somar estatísticas
        combined.set(change.filePath, {
          ...change,
          additions: change.additions + existing.additions,
          deletions: change.deletions + existing.deletions,
        });
      } else {
        combined.set(change.filePath, change);
      }
    });

    return Array.from(combined.values());
  }

  private async getLocalChanges(relevantPaths?: string[]): Promise<GitChange[]> {
    const changes: GitChange[] = [];

    try {
      // Alterações no working directory (não staged)
      const workingDirStatus = await this.git.status();
      const modifiedFiles = [
        ...workingDirStatus.modified,
        ...workingDirStatus.not_added,
        ...workingDirStatus.created,
        ...workingDirStatus.deleted
      ];

      // Alterações staged
      const stagedFiles = [
        ...workingDirStatus.staged,
      ];

      // Combinar todos os arquivos alterados localmente
      const allLocalFiles = [...new Set([...modifiedFiles, ...stagedFiles])];

      for (const filePath of allLocalFiles) {
        // Filtrar apenas arquivos relevantes se especificado
        if (relevantPaths && relevantPaths.length > 0) {
          const isRelevant = relevantPaths.some(relevantPath =>
            filePath.includes(relevantPath) ||
            filePath.startsWith(relevantPath) ||
            relevantPath.includes(filePath)
          );

          if (!isRelevant) {
            logger.info(`Skipping irrelevant local file: ${filePath}`);
            continue;
          }
        }

        try {
          // Usar o diretório atual do repositório
          const fullPath = path.join(process.cwd(), filePath);

          // Verificar se arquivo existe (pode ter sido deletado)
          let content = '';
          let changeType: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';

          if (await fs.pathExists(fullPath)) {
            content = await fs.readFile(fullPath, 'utf-8');

            // Determinar tipo de mudança
            if (workingDirStatus.not_added.includes(filePath) ||
              workingDirStatus.created.includes(filePath)) {
              changeType = 'added';
            } else if (workingDirStatus.deleted.includes(filePath)) {
              changeType = 'deleted';
            }
          } else {
            changeType = 'deleted';
          }

          // Pegar diff detalhado para este arquivo
          let fileDiff = '';
          try {
            if (changeType === 'added') {
              // Para arquivos novos, mostrar todo o conteúdo como adição
              fileDiff = content.split('\n').map(line => `+${line}`).join('\n');
            } else if (changeType === 'deleted') {
              // Para arquivos deletados, pegar conteúdo do HEAD
              const headContent = await this.git.show([`HEAD:${filePath}`]);
              fileDiff = headContent.split('\n').map(line => `-${line}`).join('\n');
            } else {
              // Para arquivos modificados, pegar diff normal
              fileDiff = await this.git.diff(['HEAD', '--', filePath]);
            }
          } catch (diffError) {
            logger.warn(`Could not get diff for ${filePath}:`, diffError);
          }

          const additions = (fileDiff.match(/^\+/gm) || []).length;
          const deletions = (fileDiff.match(/^-/gm) || []).length;

          changes.push({
            filePath,
            changeType,
            additions,
            deletions,
            content,
            diff: fileDiff,
            isLocal: true // Flag para identificar mudanças locais
          });

          logger.info(`Processed local change: ${filePath} (${changeType})`);
        } catch (error) {
          logger.warn(`Error processing local file ${filePath}:`, error);
        }
      }

      logger.info(`Found ${changes.length} local changes`);
      return changes;
    } catch (error) {
      logger.error("Error getting local changes:", error);
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
