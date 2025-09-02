"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitService = void 0;
// src/services/GitService.ts
const simple_git_1 = __importDefault(require("simple-git"));
const logger_1 = require("../utils/logger");
class GitService {
    git;
    constructor(repositoryPath) {
        this.git = (0, simple_git_1.default)(repositoryPath);
    }
    async getChanges(baseBranch = 'main') {
        try {
            logger_1.logger.info(`Getting Git changes from ${baseBranch} to current branch`);
            const currentBranch = await this.git.branch();
            const currentBranchName = currentBranch.current;
            let diffResult;
            if (baseBranch === currentBranchName) {
                diffResult = await this.git.diff([
                    'HEAD~1..HEAD',
                    '--name-status'
                ]);
            }
            else {
                diffResult = await this.git.diff([
                    `${baseBranch}...${currentBranchName}`,
                    '--name-status'
                ]);
            }
            const lines = diffResult.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                logger_1.logger.info('No changes found');
                return [];
            }
            const changes = [];
            for (const line of lines) {
                const [status, filePath] = line.split('\t');
                if (!filePath)
                    continue;
                try {
                    const content = await this.git.show([`${currentBranchName}:${filePath}`]);
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
                        filePath: filePath,
                        changeType: this.mapGitStatus(status),
                        additions,
                        deletions,
                        content,
                        diff: fileDiff
                    });
                    logger_1.logger.info(`Processed file: ${filePath} (${status})`);
                }
                catch (error) {
                    logger_1.logger.warn(`Error processing file ${filePath}:`, error);
                }
            }
            logger_1.logger.info(`Found ${changes.length} changed files`);
            return changes;
        }
        catch (error) {
            logger_1.logger.error("Error getting Git changes:", error);
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