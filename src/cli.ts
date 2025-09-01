#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { TaskValidatorAgent } from './agents/TaskValidatorAgent';
import { GitService } from './services/GitService';
import { ValidationReportService } from './services/ValidationReportService';
import { logger } from './utils/logger';
import { AgentContext, TaskRules } from './types';
import { ConfigManager } from './config/cli-config';

const program = new Command();

program
  .name('task-validator')
  .description('CLI para validação de tasks usando regras de negócio')
  .version('1.0.0');

program
  .command('validate')
  .description('Validar uma task baseada nas mudanças do Git')
  .option('-r, --rules <file>', 'Arquivo de regras JSON', 'task-rules.json')
  .option('-b, --base-branch <branch>', 'Branch base para comparação', 'main')
  .option('-o, --output <dir>', 'Diretório de saída para relatórios', 'reports')
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

      // Carregar regras da task
      const rulesPath = path.resolve(options.rules);
      if (!fs.existsSync(rulesPath)) {
        spinner.fail(`Erro: Arquivo de regras não encontrado: ${rulesPath}`);
        process.exit(1);
      }

      const rules: TaskRules = await fs.readJson(rulesPath);
      spinner.text = 'Regras carregadas';

      // Obter API key
      let apiKey = options.apiKey;
      if (!apiKey) {
        apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
          spinner.fail('Erro: Chave da API do Google AI não fornecida');
          console.log(chalk.yellow('Use --api-key ou configure GOOGLE_AI_API_KEY'));
          process.exit(1);
        }
      }

      // Modo servidor remoto
      if (options.server) {
        await validateWithServer(options.server, rules, options);
        return;
      }

      // Modo local
      await validateLocally(apiKey, rules, options, spinner);
      
    } catch (error) {
      console.error(chalk.red('Erro durante a validação:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Criar arquivo de regras de exemplo')
  .option('-o, --output <file>', 'Nome do arquivo de saída', 'task-rules.json')
  .action(async (options) => {
    const exampleRules = {
      taskId: "TASK-001",
      title: "Implementar autenticação de usuários",
      description: "Criar sistema de login e registro de usuários",
      rules: [
        {
          id: "AUTH-001",
          category: "Autenticação",
          description: "Implementar endpoint de login",
          priority: "high",
          criteria: ["POST /auth/login", "validação de credenciais", "retorno de token"]
        },
        {
          id: "AUTH-002", 
          category: "Autenticação",
          description: "Implementar endpoint de registro",
          priority: "high",
          criteria: ["POST /auth/register", "validação de dados", "hash de senha"]
        },
        {
          id: "AUTH-003",
          category: "Segurança",
          description: "Implementar middleware de autenticação",
          priority: "medium",
          criteria: ["middleware JWT", "proteção de rotas", "validação de token"]
        }
      ]
    };

    const outputPath = path.resolve(options.output);
    await fs.writeJson(outputPath, exampleRules, { spaces: 2 });
    
    console.log(chalk.green(`✅ Arquivo de regras criado: ${outputPath}`));
    console.log(chalk.blue('📝 Edite o arquivo com suas regras específicas'));
  });

async function validateLocally(
  apiKey: string, 
  rules: TaskRules, 
  options: any, 
  spinner: ora.Ora
) {
  try {
    // Inicializar serviços
    const gitService = new GitService(process.cwd());
    const agent = new TaskValidatorAgent(apiKey);
    const reportService = new ValidationReportService();

    spinner.text = 'Capturando mudanças do Git...';
    const gitChanges = await gitService.getChanges(options.baseBranch);
    
    if (gitChanges.length === 0) {
      spinner.warn('Nenhuma mudança encontrada no Git');
      return;
    }

    spinner.text = 'Obtendo branch atual...';
    const currentBranch = await gitService.getCurrentBranch();

    spinner.text = 'Executando validação com IA...';
    const context: AgentContext = {
      rules,
      gitChanges,
      repositoryPath: process.cwd(),
      branchName: currentBranch
    };

    const result = await agent.validateTask(context);

    // Criar diretório de relatórios
    const reportsDir = path.resolve(options.output);
    await fs.ensureDir(reportsDir);

    // Gerar relatório
    spinner.text = 'Gerando relatório...';
    const report = await reportService.generateReport(result);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `validation-${rules.taskId}-${timestamp}.json`;
    const reportPath = path.join(reportsDir, reportFileName);

    await fs.writeJson(reportPath, report, { spaces: 2 });

    spinner.succeed('Validação concluída!');

    // Exibir resumo
    displaySummary(result, reportPath);

  } catch (error) {
    spinner.fail('Erro durante a validação local');
    throw error;
  }
}

async function validateWithServer(serverUrl: string, rules: TaskRules, options: any) {
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

function displaySummary(result: any, reportPath: string) {
  console.log('\n' + chalk.bold.blue('📊 RESUMO DA VALIDAÇÃO'));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(chalk.white(`Score de Completude: ${chalk.bold.green(result.completenessScore * 100)}%`));
  console.log(chalk.white(`Regras Implementadas: ${chalk.bold.green(result.implementedRules.length)}`));
  console.log(chalk.white(`Regras Pendentes: ${chalk.bold.yellow(result.missingRules.length)}`));
  
  if (result.missingRules.length > 0) {
    console.log('\n' + chalk.yellow('⚠️  REGRAS PENDENTES:'));
    result.missingRules.forEach((rule: any) => {
      console.log(chalk.yellow(`  • ${rule.description}`));
    });
  }

  console.log('\n' + chalk.blue('📄 Relatório completo salvo em:'));
  console.log(chalk.gray(reportPath));
  
  console.log('\n' + chalk.green('✅ Validação concluída com sucesso!'));
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
