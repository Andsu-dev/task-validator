#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const program = new commander_1.Command();
// Configuração global do CLI
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.task-validator');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
// Funções de configuração
async function loadConfig() {
    try {
        if (await fs_extra_1.default.pathExists(CONFIG_FILE)) {
            return await fs_extra_1.default.readJson(CONFIG_FILE);
        }
    }
    catch (error) {
        console.warn(chalk_1.default.yellow('Erro ao carregar configuração:', error));
    }
    return {};
}
async function saveConfig(config) {
    try {
        await fs_extra_1.default.ensureDir(CONFIG_DIR);
        await fs_extra_1.default.writeJson(CONFIG_FILE, config, { spaces: 2 });
    }
    catch (error) {
        throw new Error(`Erro ao salvar configuração: ${error}`);
    }
}
async function maskApiKey(apiKey) {
    if (apiKey.length <= 8)
        return '*'.repeat(apiKey.length);
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
            console.log(chalk_1.default.bold.blue('🔧 CONFIGURAÇÃO ATUAL'));
            console.log(chalk_1.default.gray('─'.repeat(50)));
            if (config.apiKey) {
                const maskedKey = await maskApiKey(config.apiKey);
                console.log(chalk_1.default.white(`API Key: ${chalk_1.default.green(maskedKey)}`));
            }
            else {
                console.log(chalk_1.default.white(`API Key: ${chalk_1.default.red('Não configurada')}`));
            }
            console.log(chalk_1.default.white(`Branch padrão: ${chalk_1.default.cyan(config.defaultBranch || 'main')}`));
            console.log(chalk_1.default.white(`Diretório de saída: ${chalk_1.default.cyan(config.outputDir || 'reports')}`));
            console.log(chalk_1.default.white(`Arquivo de regras: ${chalk_1.default.cyan(config.rulesFile || 'task-rules.json')}`));
            console.log(chalk_1.default.gray(`\nArquivo de configuração: ${CONFIG_FILE}`));
            return;
        }
        // Limpar configuração
        if (options.clear) {
            await fs_extra_1.default.remove(CONFIG_FILE);
            console.log(chalk_1.default.green('✅ Configuração limpa com sucesso!'));
            return;
        }
        // Atualizar configuração
        let hasChanges = false;
        if (options.apiKey) {
            config.apiKey = options.apiKey;
            hasChanges = true;
            console.log(chalk_1.default.green('✅ API Key configurada com sucesso!'));
        }
        if (options.defaultBranch) {
            config.defaultBranch = options.defaultBranch;
            hasChanges = true;
            console.log(chalk_1.default.green(`✅ Branch padrão definido como: ${options.defaultBranch}`));
        }
        if (options.outputDir) {
            config.outputDir = options.outputDir;
            hasChanges = true;
            console.log(chalk_1.default.green(`✅ Diretório de saída definido como: ${options.outputDir}`));
        }
        if (options.rulesFile) {
            config.rulesFile = options.rulesFile;
            hasChanges = true;
            console.log(chalk_1.default.green(`✅ Arquivo de regras definido como: ${options.rulesFile}`));
        }
        if (hasChanges) {
            await saveConfig(config);
            console.log(chalk_1.default.blue('\n📝 Configuração salva em:', CONFIG_FILE));
        }
        else {
            console.log(chalk_1.default.yellow('💡 Use --show para ver a configuração atual'));
            console.log(chalk_1.default.yellow('💡 Use --api-key <chave> para configurar a API Key'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Erro na configuração:'), error);
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
        const spinner = (0, ora_1.default)('Iniciando validação...').start();
        // Verificar se estamos em um repositório Git
        const cwd = process.cwd();
        if (!fs_extra_1.default.existsSync(path_1.default.join(cwd, '.git'))) {
            spinner.fail('Erro: Não é um repositório Git válido');
            process.exit(1);
        }
        // Carregar configuração
        const config = await loadConfig();
        // Carregar regras da task
        const rulesPath = path_1.default.resolve('task-rules.json');
        if (!fs_extra_1.default.existsSync(rulesPath)) {
            spinner.fail(`Erro: Arquivo de regras não encontrado: ${rulesPath}`);
            process.exit(1);
        }
        const rules = await fs_extra_1.default.readJson(rulesPath);
        spinner.text = 'Regras carregadas';
        // Obter API key (prioridade: linha de comando > configuração > variável de ambiente)
        let apiKey = options.apiKey || config.apiKey || process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            spinner.fail('Erro: Chave da API do Google AI não fornecida');
            console.log(chalk_1.default.yellow('\n💡 Configure sua API Key:'));
            console.log(chalk_1.default.cyan('   task-validator config --api-key <sua-chave>'));
            console.log(chalk_1.default.cyan('   ou use --api-key <chave> neste comando'));
            console.log(chalk_1.default.cyan('   ou configure GOOGLE_AI_API_KEY no ambiente'));
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
    }
    catch (error) {
        console.error(chalk_1.default.red('Erro durante a validação:'), error);
        process.exit(1);
    }
});
// Comando para criar arquivo de regras de exemplo
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
    const outputPath = path_1.default.resolve('task-rules.json');
    await fs_extra_1.default.writeJson(outputPath, exampleRules, { spaces: 2 });
    console.log(chalk_1.default.green(`✅ Arquivo de regras criado: ${outputPath}`));
    console.log(chalk_1.default.blue('📝 Edite o arquivo com suas regras específicas'));
});
program
    .command('clear')
    .description('Limpar arquivos e pastas gerados (task-rules.json, reports/, logs/)')
    .option('-f, --force', 'Forçar limpeza sem confirmação')
    .action(async (options) => {
    try {
        await clearGeneratedFiles(options.force);
    }
    catch (error) {
        console.error(chalk_1.default.red('Erro ao limpar arquivos:'), error);
        process.exit(1);
    }
});
async function clearGeneratedFiles(force = false) {
    try {
        const filesToRemove = [
            'task-rules.json',
            'reports/',
            'logs/'
        ];
        if (!force) {
            console.log(chalk_1.default.yellow('⚠️  Você está prestes a remover os seguintes arquivos e pastas:'));
            filesToRemove.forEach(file => {
                console.log(chalk_1.default.white(`   • ${file}`));
            });
            console.log(chalk_1.default.yellow('\n🔍 Verificando o que será removido...'));
            // Verificar o que existe
            for (const file of filesToRemove) {
                if (await fs_extra_1.default.pathExists(file)) {
                    if (file.endsWith('/')) {
                        // É uma pasta
                        const files = await fs_extra_1.default.readdir(file);
                        console.log(chalk_1.default.blue(`   📁 ${file} (${files.length} arquivos)`));
                    }
                    else {
                        // É um arquivo
                        const stats = await fs_extra_1.default.stat(file);
                        console.log(chalk_1.default.blue(`   📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`));
                    }
                }
                else {
                    console.log(chalk_1.default.gray(`   ❌ ${file} (não existe)`));
                }
            }
            console.log(chalk_1.default.yellow('\n❓ Deseja continuar? (y/N)'));
            // Aguardar resposta do usuário
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const answer = await new Promise((resolve) => {
                rl.question('', (input) => {
                    rl.close();
                    resolve(input.toLowerCase());
                });
            });
            if (answer !== 'y' && answer !== 'yes') {
                console.log(chalk_1.default.blue('❌ Operação cancelada pelo usuário'));
                return;
            }
        }
        console.log(chalk_1.default.blue('🧹 Iniciando limpeza...'));
        let removedCount = 0;
        for (const file of filesToRemove) {
            if (await fs_extra_1.default.pathExists(file)) {
                try {
                    if (file.endsWith('/')) {
                        // É uma pasta
                        await fs_extra_1.default.remove(file);
                        console.log(chalk_1.default.green(`   ✅ Pasta removida: ${file}`));
                    }
                    else {
                        // É um arquivo
                        await fs_extra_1.default.remove(file);
                        console.log(chalk_1.default.green(`   ✅ Arquivo removido: ${file}`));
                    }
                    removedCount++;
                }
                catch (error) {
                    console.log(chalk_1.default.red(`   ❌ Erro ao remover ${file}:`, error));
                }
            }
            else {
                console.log(chalk_1.default.gray(`   ⏭️  ${file} não existe, pulando...`));
            }
        }
        if (removedCount > 0) {
            console.log(chalk_1.default.green(`\n🎉 Limpeza concluída! ${removedCount} item(s) removido(s)`));
        }
        else {
            console.log(chalk_1.default.blue('\nℹ️  Nenhum arquivo foi removido'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Erro durante a limpeza:'), error);
        throw error;
    }
}
async function validateLocally(rules, options, config, spinner) {
    try {
        // Importar o agente e serviço Git
        const { TaskValidatorAgent } = await Promise.resolve().then(() => __importStar(require('./agents/TaskValidatorAgent')));
        const { GitService } = await Promise.resolve().then(() => __importStar(require('./services/git.service')));
        const { AnalysisLogger } = await Promise.resolve().then(() => __importStar(require('./utils/analysis-logger')));
        const startTime = Date.now();
        const logger = new AnalysisLogger();
        spinner.text = 'Analisando mudanças do Git...';
        // Determinar caminhos relevantes baseado nas regras
        const relevantPaths = extractRelevantPaths(rules);
        console.log(chalk_1.default.blue(`🔍 Analisando apenas arquivos relevantes: ${relevantPaths.join(', ')}`));
        // Obter mudanças do Git (apenas arquivos relevantes)
        const gitService = new GitService(process.cwd());
        const currentBranch = await gitService.getCurrentBranch();
        const baseBranch = options.baseBranch || config.defaultBranch || 'main';
        const gitChanges = await gitService.getChanges(baseBranch, relevantPaths);
        const gitAnalysisTime = Date.now() - startTime;
        // Log das mudanças Git
        const gitLogPath = await logger.logGitChanges(gitChanges, baseBranch, currentBranch);
        console.log(chalk_1.default.blue(`📝 Log Git salvo em: ${gitLogPath}`));
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
        console.log(chalk_1.default.bold.blue('\n📊 RESULTADO DA VALIDAÇÃO COM IA'));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        console.log(chalk_1.default.white(`Task: ${chalk_1.default.cyan(rules.title)}`));
        console.log(chalk_1.default.white(`ID: ${chalk_1.default.cyan(rules.taskId)}`));
        console.log(chalk_1.default.white(`Branch: ${chalk_1.default.cyan(currentBranch)}`));
        console.log(chalk_1.default.white(`Base: ${chalk_1.default.cyan(baseBranch)}`));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        // Estatísticas
        console.log(chalk_1.default.white(`📈 Total de regras: ${chalk_1.default.cyan(result.summary.totalRules)}`));
        console.log(chalk_1.default.white(`✅ Implementadas: ${chalk_1.default.green(result.summary.implementedCount)}`));
        console.log(chalk_1.default.white(`❌ Pendentes: ${chalk_1.default.red(result.summary.missingCount)}`));
        console.log(chalk_1.default.white(`🎯 Score de completude: ${chalk_1.default.yellow((result.completenessScore * 100).toFixed(1))}%`));
        // Prioridades
        if (result.summary.highPriorityMissing > 0) {
            console.log(chalk_1.default.white(`🔥 Alta prioridade pendente: ${chalk_1.default.red(result.summary.highPriorityMissing)} regras`));
        }
        console.log(chalk_1.default.gray('─'.repeat(50)));
        // Regras implementadas
        if (result.implementedRules.length > 0) {
            console.log(chalk_1.default.bold.green('\n✅ REGRAS IMPLEMENTADAS:'));
            result.implementedRules.forEach((rule) => {
                const confidenceColor = rule.confidence >= 0.8 ? chalk_1.default.green : rule.confidence >= 0.6 ? chalk_1.default.yellow : chalk_1.default.red;
                console.log(chalk_1.default.green(`   • ${rule.id}: ${rule.description}`));
                if (rule.evidence) {
                    console.log(chalk_1.default.gray(`     📝 Evidência: ${rule.evidence}`));
                }
                console.log(confidenceColor(`     🎯 Confiança: ${(rule.confidence * 100).toFixed(0)}%`));
            });
        }
        // Regras pendentes
        if (result.missingRules.length > 0) {
            console.log(chalk_1.default.bold.red('\n❌ REGRAS PENDENTES:'));
            result.missingRules.forEach((rule) => {
                const priorityColor = rule.priority === 'high' ? chalk_1.default.red : rule.priority === 'medium' ? chalk_1.default.yellow : chalk_1.default.blue;
                console.log(priorityColor(`   • ${rule.id}: ${rule.description} (${rule.priority})`));
            });
        }
        // Sugestões da IA
        if (result.suggestions && result.suggestions.length > 0) {
            console.log(chalk_1.default.bold.blue('\n💡 SUGESTÕES DA IA:'));
            result.suggestions.forEach((suggestion) => {
                console.log(chalk_1.default.cyan(`   • ${suggestion}`));
            });
        }
        // Resumo da IA
        if (result.summary) {
            console.log(chalk_1.default.bold.blue('\n📋 RESUMO DA ANÁLISE:'));
            console.log(chalk_1.default.white(`Total de regras: ${result.summary.totalRules}`));
            console.log(chalk_1.default.white(`Implementadas: ${result.summary.implementedCount}`));
            console.log(chalk_1.default.white(`Pendentes: ${result.summary.missingCount}`));
            console.log(chalk_1.default.white(`Alta prioridade pendente: ${result.summary.highPriorityMissing}`));
        }
        // Salvar relatório se diretório de saída especificado
        const outputDir = options.output || config.outputDir || 'reports';
        if (outputDir) {
            try {
                await fs_extra_1.default.ensureDir(outputDir);
                const reportPath = path_1.default.join(outputDir, `validation-report-${Date.now()}.json`);
                await fs_extra_1.default.writeJson(reportPath, result, { spaces: 2 });
                console.log(chalk_1.default.blue(`\n📄 Relatório salvo em: ${reportPath}`));
            }
            catch (error) {
                console.warn(chalk_1.default.yellow('⚠️  Não foi possível salvar o relatório:', error));
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
            console.log(chalk_1.default.blue(`📋 Log completo da análise salvo em: ${analysisLogPath}`));
            // Verificar consistência do resultado
            if (result.completenessScore > 0.8 && result.summary.implementedCount === 0) {
                console.log(chalk_1.default.yellow('⚠️  ATENÇÃO: Score alto mas nenhuma regra implementada - possível inconsistência!'));
                console.log(chalk_1.default.yellow('   Verifique os logs para mais detalhes.'));
            }
        }
        catch (error) {
            console.warn(chalk_1.default.yellow('⚠️  Não foi possível salvar o log da análise:', error));
        }
        spinner.succeed('Validação com IA concluída!');
    }
    catch (error) {
        spinner.fail('Erro durante validação com IA');
        console.error(chalk_1.default.red('Detalhes do erro:'), error);
        throw error;
    }
}
// Função para extrair caminhos relevantes das regras
function extractRelevantPaths(rules) {
    const relevantPaths = [];
    rules.rules.forEach((rule) => {
        if (rule.criteria && Array.isArray(rule.criteria)) {
            rule.criteria.forEach((criterion) => {
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
        rules.rules.forEach((rule) => {
            if (rule.category === 'controller') {
                relevantPaths.push('src/api');
            }
            else if (rule.category === 'routes') {
                relevantPaths.push('src/api');
            }
            else if (rule.category === 'api') {
                relevantPaths.push('src/api');
            }
        });
    }
    return relevantPaths;
}
async function validateWithServer(serverUrl, rules, options) {
    const spinner = (0, ora_1.default)('Enviando validação para servidor remoto...').start();
    try {
        // Implementar lógica para enviar para servidor remoto
        // Por enquanto, apenas exibir que seria enviado
        spinner.succeed('Modo servidor remoto (não implementado ainda)');
        console.log(chalk_1.default.yellow('URL do servidor:', serverUrl));
    }
    catch (error) {
        spinner.fail('Erro ao conectar com servidor remoto');
        throw error;
    }
}
// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('Erro não tratado:'), reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('Exceção não capturada:'), error);
    process.exit(1);
});
program.parse();
//# sourceMappingURL=cli.js.map