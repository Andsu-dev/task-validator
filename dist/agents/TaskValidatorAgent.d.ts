import type { AgentContext, ValidationResult } from '../types';
export declare class TaskValidatorAgent {
    private model;
    constructor(apiKey: string);
    validateTask(context: AgentContext): Promise<ValidationResult>;
    private buildValidationPrompt;
    private parseAgentResponse;
    private buildValidationResult;
}
//# sourceMappingURL=TaskValidatorAgent.d.ts.map