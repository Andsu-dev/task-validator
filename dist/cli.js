#!/usr/bin/env node
"use strict";
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
    .option('-r, --rules <file>', 'Arquivo de regras JSON', 'task-rules.json')
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
        const rulesPath = path_1.default.resolve(options.rules || config.rulesFile || 'task-rules.json');
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
        spinner.fail('Validação local não implementada. Use o servidor API.');
        console.log(chalk_1.default.yellow('💡 Execute o servidor com: npm start'));
        console.log(chalk_1.default.yellow('💡 Use --server <url> para validação remota'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Erro durante a validação:'), error);
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
    const outputPath = path_1.default.resolve(options.output);
    await fs_extra_1.default.writeJson(outputPath, exampleRules, { spaces: 2 });
    console.log(chalk_1.default.green(`✅ Arquivo de regras criado: ${outputPath}`));
    console.log(chalk_1.default.blue('📝 Edite o arquivo com suas regras específicas'));
});
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