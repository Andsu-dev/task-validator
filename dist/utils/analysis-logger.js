"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisLogger = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class AnalysisLogger {
    logDir;
    constructor(logDir = 'logs') {
        this.logDir = logDir;
    }
    async logAnalysis(log) {
        try {
            await fs_extra_1.default.ensureDir(this.logDir);
            const fileName = `analysis-${log.taskId}-${Date.now()}.json`;
            const filePath = path_1.default.join(this.logDir, fileName);
            await fs_extra_1.default.writeJson(filePath, log, { spaces: 2 });
            return filePath;
        }
        catch (error) {
            console.warn('⚠️  Erro ao salvar log de análise:', error);
            return '';
        }
    }
    async logGitChanges(changes, baseBranch, currentBranch) {
        try {
            await fs_extra_1.default.ensureDir(this.logDir);
            const fileName = `git-changes-${currentBranch}-${Date.now()}.json`;
            const filePath = path_1.default.join(this.logDir, fileName);
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
            await fs_extra_1.default.writeJson(filePath, gitLog, { spaces: 2 });
            return filePath;
        }
        catch (error) {
            console.warn('⚠️  Erro ao salvar log de mudanças Git:', error);
            return '';
        }
    }
    async logAgentPrompt(prompt, taskId) {
        try {
            await fs_extra_1.default.ensureDir(this.logDir);
            const fileName = `agent-prompt-${taskId}-${Date.now()}.txt`;
            const filePath = path_1.default.join(this.logDir, fileName);
            await fs_extra_1.default.writeFile(filePath, prompt);
            return filePath;
        }
        catch (error) {
            console.warn('⚠️  Erro ao salvar prompt do agente:', error);
            return '';
        }
    }
    async logAgentResponse(response, taskId) {
        try {
            await fs_extra_1.default.ensureDir(this.logDir);
            const fileName = `agent-response-${taskId}-${Date.now()}.json`;
            const filePath = path_1.default.join(this.logDir, fileName);
            await fs_extra_1.default.writeFile(filePath, response);
            return filePath;
        }
        catch (error) {
            console.warn('⚠️  Erro ao salvar resposta do agente:', error);
            return '';
        }
    }
}
exports.AnalysisLogger = AnalysisLogger;
//# sourceMappingURL=analysis-logger.js.map