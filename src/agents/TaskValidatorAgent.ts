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

      // Log do prompt enviado para a IA
      logger.info(`Prompt sent to AI for task ${context.rules.taskId}`, {
        promptLength: prompt.length,
        rulesCount: context.rules.rules.length,
        gitChangesCount: context.gitChanges.length
      });

      const response = await this.model.invoke(prompt);
      const agentResponse = this.parseAgentResponse(response.content as string);
      const result = this.buildValidationResult(context, agentResponse);

      // Log da resposta da IA
      logger.info(`AI response received for task ${context.rules.taskId}`, {
        responseLength: response.content?.length || 0,
        analysisCount: agentResponse.analysis.length,
        overallCompleteness: agentResponse.overallCompleteness
      });

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

ANÁLISE DETALHADA - COMO INTERPRETAR DIFS:

1. **RENOMEAÇÃO DE FUNÇÕES** (REFACTOR-001):
   - Procure por linhas que começam com "-" (vermelho) contendo o nome antigo da função
   - Procure por linhas que começam com "+" (verde) contendo o novo nome da função
   - EXEMPLO ESPECÍFICO: Se você vê "-async getUsersWithFilters(ctx)" e "+async cordenadorLead(ctx)", isso é uma renomeação
   - Se a lógica interna (parâmetros, implementação) permaneceu igual, considere IMPLEMENTADO

2. **ATUALIZAÇÃO DE ROTAS** (REFACTOR-002):
   - Procure por linhas que começam com "-" contendo o handler antigo
   - Procure por linhas que começam com "+" contendo o novo handler
   - EXEMPLO ESPECÍFICO: Se você vê "-handler: \"lead.getUsersWithFilters\"" e "+handler: \"lead.cordenadorLead\"", isso é uma atualização de rota
   - Se apenas o handler mudou e o resto permaneceu igual, considere IMPLEMENTADO

3. **ANÁLISE DE DIFS**:
   - Linhas com "-" (vermelho) = código removido
   - Linhas com "+" (verde) = código adicionado
   - Linhas sem prefixo = código inalterado
   - Para refatorações, você deve ver pares de linhas onde uma foi removida e outra similar foi adicionada

INSTRUÇÕES ESPECÍFICAS:
1. Para REFACTOR-001: Procure especificamente por "-async getUsersWithFilters" e "+async cordenadorLead" no arquivo lead.js
2. Para REFACTOR-002: Procure especificamente por "-handler: \"lead.getUsersWithFilters\"" e "+handler: \"lead.cordenadorLead\"" no arquivo custom-routes.js
3. Se encontrar esses pares de mudanças, marque como IMPLEMENTADO com confiança alta (0.9-1.0)
4. Para regras de teste e documentação, considere como não implementadas (são validações pós-refatoração)
5. Forneça um nível de confiança de 0.0 a 1.0 para cada análise
6. Identifique evidências específicas no código que comprovem a implementação
7. Sugira o que ainda precisa ser feito para regras não implementadas
8. CALCULE O SCORE DE COMPLETUDE:
   - Se REFACTOR-001 e REFACTOR-002 estão implementados: score = 80-90%
   - Se apenas uma das regras principais está implementada: score = 40-50%
   - Se nenhuma regra principal está implementada: score = 0-20%
   - Regras de teste e documentação não afetam o score principal (são pós-refatoração)

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