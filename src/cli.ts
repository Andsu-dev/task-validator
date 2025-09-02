#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const program = new Command();

// Configuração global do CLI
const CONFIG_DIR = path.join(os.homedir(), '.task-validator');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface CLIConfig {
  apiKey?: string;
  defaultBranch?: string;
  outputDir?: string;
  rulesFile?: string;
}

// Funções de configuração
async function loadConfig(): Promise<CLIConfig> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      return await fs.readJson(CONFIG_FILE);
    }
  } catch (error) {
    console.warn(chalk.yellow('Erro ao carregar configuração:', error));
  }
  return {};
}

async function saveConfig(config: CLIConfig): Promise<void> {
  try {
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
  } catch (error) {
    throw new Error(`Erro ao salvar configuração: ${error}`);
  }
}

async function maskApiKey(apiKey: string): Promise<string> {
  if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
  return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
}

program
  .name('task-validator')
  .description('CLI para validação de tasks usando regras de negócio')
  .version('1.0.0');

// Comando de configuração
program
  .command('config')
  .description('Gerenciar configuração do CLI')
  .option('--api-key <key>', 'Definir chave da API do Google AI')
  .option('--default-branch <branch>', 'Definir branch padrão', 'main')
  .option('--output-dir <dir>', 'Definir diretório de saída padrão', 'reports')
  .option('--rules-file <file>', 'Definir arquivo de regras padrão', 'task-rules.json')
  .option('--show', 'Mostrar configuração atual')
  .option('--clear', 'Limpar configuração')
  .action(async (options) => {
    try {
      const config = await loadConfig();

      // Mostrar configuração atual
      if (options.show) {
        console.log(chalk.bold.blue('🔧 CONFIGURAÇÃO ATUAL'));
        console.log(chalk.gray('─'.repeat(50)));

        if (config.apiKey) {
          const maskedKey = await maskApiKey(config.apiKey);
          console.log(chalk.white(`API Key: ${chalk.green(maskedKey)}`));
        } else {
          console.log(chalk.white(`API Key: ${chalk.red('Não configurada')}`));
        }

        console.log(chalk.white(`Branch padrão: ${chalk.cyan(config.defaultBranch || 'main')}`));
        console.log(chalk.white(`Diretório de saída: ${chalk.cyan(config.outputDir || 'reports')}`));
        console.log(chalk.white(`Arquivo de regras: ${chalk.cyan(config.rulesFile || 'task-rules.json')}`));
        console.log(chalk.gray(`\nArquivo de configuração: ${CONFIG_FILE}`));
        return;
      }

      // Limpar configuração
      if (options.clear) {
        await fs.remove(CONFIG_FILE);
        console.log(chalk.green('✅ Configuração limpa com sucesso!'));
        return;
      }

      // Atualizar configuração
      let hasChanges = false;

      if (options.apiKey) {
        config.apiKey = options.apiKey;
        hasChanges = true;
        console.log(chalk.green('✅ API Key configurada com sucesso!'));
      }

      if (options.defaultBranch) {
        config.defaultBranch = options.defaultBranch;
        hasChanges = true;
        console.log(chalk.green(`✅ Branch padrão definido como: ${options.defaultBranch}`));
      }

      if (options.outputDir) {
        config.outputDir = options.outputDir;
        hasChanges = true;
        console.log(chalk.green(`✅ Diretório de saída definido como: ${options.outputDir}`));
      }

      if (options.rulesFile) {
        config.rulesFile = options.rulesFile;
        hasChanges = true;
        console.log(chalk.green(`✅ Arquivo de regras definido como: ${options.rulesFile}`));
      }

      if (hasChanges) {
        await saveConfig(config);
        console.log(chalk.blue('\n📝 Configuração salva em:', CONFIG_FILE));
      } else {
        console.log(chalk.yellow('💡 Use --show para ver a configuração atual'));
        console.log(chalk.yellow('💡 Use --api-key <chave> para configurar a API Key'));
      }

    } catch (error) {
      console.error(chalk.red('Erro na configuração:'), error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validar uma task baseada nas mudanças do Git')
  .option('-b, --base-branch <branch>', 'Branch base para comparação', 'main')
  .option('-o, --output <dir>', 'Diretório de saída para relatórios')
  .option('-k, --api-key <key>', 'Chave da API do Google AI')
  .option('--server <url>', 'URL do servidor de validação (modo remoto)')
  .action(async (options) => {
    try {
      const spinner = ora('Iniciando validação...').start();

      // Verificar se estamos em um repositório Git
      const cwd = process.cwd();
      if (!fs.existsSync(path.join(cwd, '.git'))) {
        spinner.fail('Erro: Não é um repositório Git válido');
        process.exit(1);
      }

      // Carregar configuração
      const config = await loadConfig();

      // Carregar regras da task
      const rulesPath = path.resolve('task-rules.json');
      if (!fs.existsSync(rulesPath)) {
        spinner.fail(`Erro: Arquivo de regras não encontrado: ${rulesPath}`);
        process.exit(1);
      }

      const rules = await fs.readJson(rulesPath);
      spinner.text = 'Regras carregadas';

      // Obter API key (prioridade: linha de comando > configuração > variável de ambiente)
      let apiKey = options.apiKey || config.apiKey || process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        spinner.fail('Erro: Chave da API do Google AI não fornecida');
        console.log(chalk.yellow('\n💡 Configure sua API Key:'));
        console.log(chalk.cyan('   task-validator config --api-key <sua-chave>'));
        console.log(chalk.cyan('   ou use --api-key <chave> neste comando'));
        console.log(chalk.cyan('   ou configure GOOGLE_AI_API_KEY no ambiente'));
        process.exit(1);
      }

      // Modo servidor remoto
      if (options.server) {
        await validateWithServer(options.server, rules, options);
        return;
      }

      // Validação local com IA
      spinner.text = 'Executando validação local...';
      await validateLocally(rules, options, config, spinner);

    } catch (error) {
      console.error(chalk.red('Erro durante a validação:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Criar arquivo de regras de exemplo')
  .action(async () => {
    const exampleRules = {
      taskId: "TASK-001",
      title: "Implementar autenticação de usuários",
      description: "Criar sistema de login e registro de usuários",
      rules: [
        {
          id: "AUTH-001",
          category: "api",
          description: "Implementar endpoint de login",
          priority: "high",
          implemented: false,
          confidence: 0,
          evidence: ""
        },
        {
          id: "AUTH-002",
          category: "api",
          description: "Implementar endpoint de registro",
          priority: "high",
          implemented: false,
          confidence: 0,
          evidence: ""
        },
        {
          id: "AUTH-003",
          category: "security",
          description: "Implementar middleware de autenticação",
          priority: "medium",
          implemented: false,
          confidence: 0,
          evidence: ""
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const outputPath = path.resolve('task-rules.json');
    await fs.writeJson(outputPath, exampleRules, { spaces: 2 });

    console.log(chalk.green(`✅ Arquivo de regras criado: ${outputPath}`));
    console.log(chalk.blue('📝 Edite o arquivo com suas regras específicas'));
  });

async function validateLocally(rules: any, options: any, config: any, spinner: ora.Ora) {
  try {
    // Importar o agente e serviço Git
    const { TaskValidatorAgent } = await import('./agents/TaskValidatorAgent');
    const { GitService } = await import('./services/git.service');
    const { AnalysisLogger } = await import('./utils/analysis-logger');

    const startTime = Date.now();
    const logger = new AnalysisLogger();

    spinner.text = 'Analisando mudanças do Git...';

    // Determinar caminhos relevantes baseado nas regras
    const relevantPaths = extractRelevantPaths(rules);
    console.log(chalk.blue(`🔍 Analisando apenas arquivos relevantes: ${relevantPaths.join(', ')}`));

    // Obter mudanças do Git (apenas arquivos relevantes)
    const gitService = new GitService(process.cwd());
    const currentBranch = await gitService.getCurrentBranch();
    const baseBranch = options.baseBranch || config.defaultBranch || 'main';
    const gitChanges = await gitService.getChanges(baseBranch, relevantPaths);

    const gitAnalysisTime = Date.now() - startTime;

    // Log das mudanças Git
    const gitLogPath = await logger.logGitChanges(gitChanges, baseBranch, currentBranch);
    console.log(chalk.blue(`📝 Log Git salvo em: ${gitLogPath}`));

    spinner.text = 'Inicializando agente de IA...';

    // Inicializar o agente de validação
    const apiKey = options.apiKey || config.apiKey || process.env.GOOGLE_AI_API_KEY;
    const agent = new TaskValidatorAgent(apiKey);

    // Preparar contexto para o agente
    const context = {
      rules,
      gitChanges,
      repositoryPath: process.cwd(),
      branchName: currentBranch
    };

    spinner.text = 'Executando análise com IA...';

    const aiStartTime = Date.now();

    // Executar validação com o agente
    const result = await agent.validateTask(context);

    const aiAnalysisTime = Date.now() - aiStartTime;
    const totalTime = Date.now() - startTime;

    // Exibir resultado
    console.log(chalk.bold.blue('\n📊 RESULTADO DA VALIDAÇÃO COM IA'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.white(`Task: ${chalk.cyan(rules.title)}`));
    console.log(chalk.white(`ID: ${chalk.cyan(rules.taskId)}`));
    console.log(chalk.white(`Branch: ${chalk.cyan(currentBranch)}`));
    console.log(chalk.white(`Base: ${chalk.cyan(baseBranch)}`));
    console.log(chalk.gray('─'.repeat(50)));

    // Estatísticas
    console.log(chalk.white(`📈 Total de regras: ${chalk.cyan(result.summary.totalRules)}`));
    console.log(chalk.white(`✅ Implementadas: ${chalk.green(result.summary.implementedCount)}`));
    console.log(chalk.white(`❌ Pendentes: ${chalk.red(result.summary.missingCount)}`));
    console.log(chalk.white(`🎯 Score de completude: ${chalk.yellow((result.completenessScore * 100).toFixed(1))}%`));

    // Prioridades
    if (result.summary.highPriorityMissing > 0) {
      console.log(chalk.white(`🔥 Alta prioridade pendente: ${chalk.red(result.summary.highPriorityMissing)} regras`));
    }

    console.log(chalk.gray('─'.repeat(50)));

    // Regras implementadas
    if (result.implementedRules.length > 0) {
      console.log(chalk.bold.green('\n✅ REGRAS IMPLEMENTADAS:'));
      result.implementedRules.forEach((rule: any) => {
        const confidenceColor = rule.confidence >= 0.8 ? chalk.green : rule.confidence >= 0.6 ? chalk.yellow : chalk.red;
        console.log(chalk.green(`   • ${rule.id}: ${rule.description}`));
        if (rule.evidence) {
          console.log(chalk.gray(`     📝 Evidência: ${rule.evidence}`));
        }
        console.log(confidenceColor(`     🎯 Confiança: ${(rule.confidence * 100).toFixed(0)}%`));
      });
    }

    // Regras pendentes
    if (result.missingRules.length > 0) {
      console.log(chalk.bold.red('\n❌ REGRAS PENDENTES:'));
      result.missingRules.forEach((rule: any) => {
        const priorityColor = rule.priority === 'high' ? chalk.red : rule.priority === 'medium' ? chalk.yellow : chalk.blue;
        console.log(priorityColor(`   • ${rule.id}: ${rule.description} (${rule.priority})`));
      });
    }

    // Sugestões da IA
    if (result.suggestions && result.suggestions.length > 0) {
      console.log(chalk.bold.blue('\n💡 SUGESTÕES DA IA:'));
      result.suggestions.forEach((suggestion: string) => {
        console.log(chalk.cyan(`   • ${suggestion}`));
      });
    }

    // Resumo da IA
    if (result.summary) {
      console.log(chalk.bold.blue('\n📋 RESUMO DA ANÁLISE:'));
      console.log(chalk.white(`Total de regras: ${result.summary.totalRules}`));
      console.log(chalk.white(`Implementadas: ${result.summary.implementedCount}`));
      console.log(chalk.white(`Pendentes: ${result.summary.missingCount}`));
      console.log(chalk.white(`Alta prioridade pendente: ${result.summary.highPriorityMissing}`));
    }

    // Salvar relatório se diretório de saída especificado
    const outputDir = options.output || config.outputDir || 'reports';
    if (outputDir) {
      try {
        await fs.ensureDir(outputDir);
        const reportPath = path.join(outputDir, `validation-report-${Date.now()}.json`);

        await fs.writeJson(reportPath, result, { spaces: 2 });
        console.log(chalk.blue(`\n📄 Relatório salvo em: ${reportPath}`));
      } catch (error) {
        console.warn(chalk.yellow('⚠️  Não foi possível salvar o relatório:', error));
      }
    }

    // Salvar log completo da análise
    try {
      const analysisLog = {
        timestamp: new Date().toISOString(),
        taskId: rules.taskId,
        taskTitle: rules.title,
        branchName: currentBranch,
        baseBranch: baseBranch,
        analysisDetails: {
          rulesAnalyzed: rules.rules,
          gitChanges: gitChanges,
          agentPrompt: '', // Será preenchido pelo TaskValidatorAgent
          agentResponse: '', // Será preenchido pelo TaskValidatorAgent
          finalResult: result
        },
        performance: {
          gitAnalysisTime,
          aiAnalysisTime,
          totalTime
        }
      };

      const analysisLogPath = await logger.logAnalysis(analysisLog);
      console.log(chalk.blue(`📋 Log completo da análise salvo em: ${analysisLogPath}`));

      // Verificar consistência do resultado
      if (result.completenessScore > 0.8 && result.summary.implementedCount === 0) {
        console.log(chalk.yellow('⚠️  ATENÇÃO: Score alto mas nenhuma regra implementada - possível inconsistência!'));
        console.log(chalk.yellow('   Verifique os logs para mais detalhes.'));
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Não foi possível salvar o log da análise:', error));
    }

    spinner.succeed('Validação com IA concluída!');

  } catch (error) {
    spinner.fail('Erro durante validação com IA');
    console.error(chalk.red('Detalhes do erro:'), error);
    throw error;
  }
}

// Função para extrair caminhos relevantes das regras
function extractRelevantPaths(rules: any): string[] {
  const relevantPaths: string[] = [];

  rules.rules.forEach((rule: any) => {
    if (rule.criteria && Array.isArray(rule.criteria)) {
      rule.criteria.forEach((criterion: string) => {
        // Extrair caminhos de arquivos dos critérios
        const fileMatch = criterion.match(/src\/[^\s]+/);
        if (fileMatch) {
          const path = fileMatch[0];
          if (!relevantPaths.includes(path)) {
            relevantPaths.push(path);
          }
        }
      });
    }
  });

  // Se não encontrou caminhos específicos, usar padrões baseados na categoria
  if (relevantPaths.length === 0) {
    rules.rules.forEach((rule: any) => {
      if (rule.category === 'controller') {
        relevantPaths.push('src/api');
      } else if (rule.category === 'routes') {
        relevantPaths.push('src/api');
      } else if (rule.category === 'api') {
        relevantPaths.push('src/api');
      }
    });
  }

  return relevantPaths;
}

async function validateWithServer(serverUrl: string, rules: any, options: any) {
  const spinner = ora('Enviando validação para servidor remoto...').start();

  try {
    // Implementar lógica para enviar para servidor remoto
    // Por enquanto, apenas exibir que seria enviado
    spinner.succeed('Modo servidor remoto (não implementado ainda)');
    console.log(chalk.yellow('URL do servidor:', serverUrl));

  } catch (error) {
    spinner.fail('Erro ao conectar com servidor remoto');
    throw error;
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Erro não tratado:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Exceção não capturada:'), error);
  process.exit(1);
});

program.parse();
