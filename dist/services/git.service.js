"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitService = void 0;
// src/services/GitService.ts
const simple_git_1 = __importDefault(require("simple-git"));
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class GitService {
    git;
    constructor(repositoryPath) {
        this.git = (0, simple_git_1.default)(repositoryPath);
    }
    async getChanges(baseBranch = 'main', relevantPaths) {
        try {
            logger_1.logger.info(`Getting Git changes from ${baseBranch} to current branch`);
            const currentBranch = await this.git.branch();
            const currentBranchName = currentBranch.current;
            const localChanges = await this.getLocalChanges(relevantPaths);
            const committedChanges = await this.getCommittedChanges(baseBranch, currentBranchName, relevantPaths);
            const allChanges = this.combineChanges(localChanges, committedChanges);
            logger_1.logger.info(`Combined changes: ${allChanges.length} total (${localChanges.length} local, ${committedChanges.length} committed)`);
            return allChanges;
        }
        catch (error) {
            logger_1.logger.error("Error getting Git changes:", error);
            throw error;
        }
    }
    async getCommittedChanges(baseBranch, currentBranchName, relevantPaths) {
        const changes = [];
        try {
            let diffResult;
            if (baseBranch === currentBranchName) {
                // Se estamos na branch base, comparar com commit anterior
                diffResult = await this.git.diff([
                    'HEAD~1..HEAD',
                    '--name-status'
                ]);
            }
            else {
                // Comparar com branch base
                diffResult = await this.git.diff([
                    `${baseBranch}...${currentBranchName}`,
                    '--name-status'
                ]);
            }
            const lines = diffResult.split('\n').filter(line => line.trim());
            for (const line of lines) {
                const [status, filePath] = line.split('\t');
                if (!filePath)
                    continue;
                // Filtrar apenas arquivos relevantes se especificado
                if (relevantPaths && relevantPaths.length > 0) {
                    const isRelevant = relevantPaths.some(relevantPath => filePath.includes(relevantPath) ||
                        filePath.startsWith(relevantPath) ||
                        relevantPath.includes(filePath));
                    if (!isRelevant) {
                        continue;
                    }
                }
                try {
                    let content = '';
                    try {
                        content = await this.git.show([`${currentBranchName}:${filePath}`]);
                    }
                    catch (showError) {
                        // Arquivo pode ter sido deletado
                        logger_1.logger.warn(`Could not get content for ${filePath}, may be deleted`);
                    }
                    let fileDiff;
                    if (baseBranch === currentBranchName) {
                        fileDiff = await this.git.diff([
                            'HEAD~1..HEAD',
                            '--',
                            filePath
                        ]);
                    }
                    else {
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
                    logger_1.logger.info(`Processed committed change: ${filePath} (${status})`);
                }
                catch (error) {
                    logger_1.logger.warn(`Error processing committed file ${filePath}:`, error);
                }
            }
            logger_1.logger.info(`Found ${changes.length} committed changes`);
            return changes;
        }
        catch (error) {
            logger_1.logger.error("Error getting committed changes:", error);
            return [];
        }
    }
    combineChanges(localChanges, committedChanges) {
        const combined = new Map();
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
            }
            else {
                combined.set(change.filePath, change);
            }
        });
        return Array.from(combined.values());
    }
    async getLocalChanges(relevantPaths) {
        const changes = [];
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
                    const isRelevant = relevantPaths.some(relevantPath => filePath.includes(relevantPath) ||
                        filePath.startsWith(relevantPath) ||
                        relevantPath.includes(filePath));
                    if (!isRelevant) {
                        logger_1.logger.info(`Skipping irrelevant local file: ${filePath}`);
                        continue;
                    }
                }
                try {
                    // Usar o diretório atual do repositório
                    const fullPath = path_1.default.join(process.cwd(), filePath);
                    // Verificar se arquivo existe (pode ter sido deletado)
                    let content = '';
                    let changeType = 'modified';
                    if (await fs_extra_1.default.pathExists(fullPath)) {
                        content = await fs_extra_1.default.readFile(fullPath, 'utf-8');
                        // Determinar tipo de mudança
                        if (workingDirStatus.not_added.includes(filePath) ||
                            workingDirStatus.created.includes(filePath)) {
                            changeType = 'added';
                        }
                        else if (workingDirStatus.deleted.includes(filePath)) {
                            changeType = 'deleted';
                        }
                    }
                    else {
                        changeType = 'deleted';
                    }
                    // Pegar diff detalhado para este arquivo
                    let fileDiff = '';
                    try {
                        if (changeType === 'added') {
                            // Para arquivos novos, mostrar todo o conteúdo como adição
                            fileDiff = content.split('\n').map(line => `+${line}`).join('\n');
                        }
                        else if (changeType === 'deleted') {
                            // Para arquivos deletados, pegar conteúdo do HEAD
                            const headContent = await this.git.show([`HEAD:${filePath}`]);
                            fileDiff = headContent.split('\n').map(line => `-${line}`).join('\n');
                        }
                        else {
                            // Para arquivos modificados, pegar diff normal
                            fileDiff = await this.git.diff(['HEAD', '--', filePath]);
                        }
                    }
                    catch (diffError) {
                        logger_1.logger.warn(`Could not get diff for ${filePath}:`, diffError);
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
                    logger_1.logger.info(`Processed local change: ${filePath} (${changeType})`);
                }
                catch (error) {
                    logger_1.logger.warn(`Error processing local file ${filePath}:`, error);
                }
            }
            logger_1.logger.info(`Found ${changes.length} local changes`);
            return changes;
        }
        catch (error) {
            logger_1.logger.error("Error getting local changes:", error);
            throw error;
        }
    }
    async getCurrentBranch() {
        try {
            const branch = await this.git.branch();
            return branch.current;
        }
        catch (error) {
            logger_1.logger.error("Error getting current branch:", error);
            throw error;
        }
    }
    async getRepositoryPath() {
        try {
            const remotes = await this.git.getRemotes(true);
            if (remotes.length > 0) {
                return remotes[0].refs.fetch;
            }
            return 'local';
        }
        catch (error) {
            logger_1.logger.error("Error getting repository path:", error);
            return 'local';
        }
    }
    mapGitStatus(status) {
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
exports.GitService = GitService;
//# sourceMappingURL=git.service.js.map