import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { 
  AgentContext, 
  ValidationResult, 
  BusinessRule, 
  AgentResponse,
} from '../types';
import { logger } from '../utils/logger';

export class TaskValidatorAgent {
  private model: ChatGoogleGenerativeAI;

  constructor(apiKey: string) {
    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      modelName: "gemini-2.0-flash",
      temperature: 0.1,
      maxOutputTokens: 4000
    });
  }

  async validateTask(context: AgentContext): Promise<ValidationResult> {
    try {
      logger.info(`Starting validation for task ${context.rules.taskId}`);

      const prompt = this.buildValidationPrompt(context);
      const response = await this.model.invoke(prompt);
      const agentResponse = this.parseAgentResponse(response.content as string);
      const result = this.buildValidationResult(context, agentResponse);
      
      logger.info(`Validation completed for task ${context.rules.taskId}`, {
        score: result.completenessScore,
        implemented: result.implementedRules.length,
        missing: result.missingRules.length
      });

      return result;
    } catch (error) {
      logger.error('Error during task validation', error);
      throw error;
    }
  }

  private buildValidationPrompt(context: AgentContext): string {
    const rulesContext = context.rules.rules.map((rule, index) => {
      let ruleText = `${index + 1}. [${rule.priority.toUpperCase()}] ${rule.category}: ${rule.description}`;
      
      // Incluir critérios se existirem
      if (rule.criteria && Array.isArray(rule.criteria)) {
        ruleText += '\n   Critérios:';
        rule.criteria.forEach((criterion: string, critIndex: number) => {
          ruleText += `\n   - ${criterion}`;
        });
      }
      
      return ruleText;
    }).join('\n\n');

    const changesContext = context.gitChanges.map(change => `
--- Arquivo: ${change.filePath} (${change.changeType}) ---
Adições: ${change.additions} | Remoções: ${change.deletions}
${change.diff}
    `).join('\n');



    return `
Você é um especialista em análise de código e validação de implementações. 
Sua tarefa é analisar se as regras de negócio foram implementadas corretamente nas mudanças de código fornecidas.

CONTEXTO DA TASK:
Título: ${context.rules.title}
Descrição: ${context.rules.description}
Branch: ${context.branchName}

REGRAS DE NEGÓCIO A VALIDAR:
${rulesContext}

MUDANÇAS NO CÓDIGO:
${changesContext}

INSTRUÇÕES:
1. Para cada regra de negócio, determine se foi implementada baseada nas mudanças de código
2. ATENÇÃO ESPECIAL para refatorações:
   - Renomeação de funções: procure por mudanças onde o nome antigo foi removido e o novo foi adicionado
   - Atualização de referências: procure por mudanças em arquivos de rota onde handlers foram atualizados
   - Mudanças de controller: analise se a lógica interna foi preservada
3. Forneça um nível de confiança de 0.0 a 1.0 para cada análise
4. Identifique evidências específicas no código que comprovem a implementação
5. Sugira o que ainda precisa ser feito para regras não implementadas
6. Calcule um score geral de completude da task

RESPONDA APENAS COM JSON VÁLIDO NO FORMATO:
{
  "analysis": [
    {
      "ruleId": "string",
      "implemented": boolean,
      "confidence": number,
      "evidence": "string descrevendo onde encontrou a implementação",
      "suggestion": "string com sugestão se não implementado"
    }
  ],
  "overallCompleteness": number,
  "generalSuggestions": ["array de sugestões gerais"],
  "summary": "string com resumo da análise"
}
    `.trim();
  }

  private parseAgentResponse(content: string): AgentResponse {
    try {
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleanedContent) as AgentResponse;
    } catch (error) {
      logger.error('Error parsing agent response', { content, error });
      
      return {
        analysis: [],
        overallCompleteness: 0,
        generalSuggestions: ['Erro ao processar resposta do agente. Verifique os logs.'],
        summary: 'Falha na análise devido a erro de parsing da resposta do agente.'
      };
    }
  }

  private buildValidationResult(context: AgentContext, agentResponse: AgentResponse): ValidationResult {
    const implementedRules: BusinessRule[] = [];
    const missingRules: BusinessRule[] = [];

    context.rules.rules.forEach(rule => {
      const analysis = agentResponse.analysis.find(a => a.ruleId === rule.id);
      
      if (analysis) {
        const updatedRule: BusinessRule = {
          ...rule,
          implemented: analysis.implemented,
          confidence: analysis.confidence,
          evidence: analysis.evidence
        };

        if (analysis.implemented) {
          implementedRules.push(updatedRule);
        } else {
          missingRules.push(updatedRule);
        }
      } else {
        missingRules.push({
          ...rule,
          implemented: false,
          confidence: 0,
          evidence: 'Regra não foi analisada pelo agente'
        });
      }
    });

    return {
      taskId: context.rules.taskId,
      branchName: context.branchName,
      completenessScore: agentResponse.overallCompleteness,
      implementedRules,
      missingRules,
      suggestions: agentResponse.generalSuggestions,
      timestamp: new Date(),
      summary: {
        totalRules: context.rules.rules.length,
        implementedCount: implementedRules.length,
        missingCount: missingRules.length,
        highPriorityMissing: missingRules.filter(r => r.priority === 'high').length
      }
    };
  }
}