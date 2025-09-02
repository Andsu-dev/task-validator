import { GitChange } from '../types';
export declare class GitService {
    private git;
    constructor(repositoryPath: string);
    getChanges(baseBranch?: string): Promise<GitChange[]>;
    getCurrentBranch(): Promise<string>;
    getRepositoryPath(): Promise<string>;
    private mapGitStatus;
}
//# sourceMappingURL=git.service.d.ts.map