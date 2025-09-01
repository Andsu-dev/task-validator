import fs from 'fs-extra';
import path from 'path';

export interface CLIConfig {
  apiKey?: string;
  defaultBranch?: string;
  outputDir?: string;
  rulesFile?: string;
  serverUrl?: string;
  autoCommit?: boolean;
  ignoreFiles?: string[];
  maxFileSize?: number; // em bytes
  timeout?: number; // em segundos
}

export class ConfigManager {
  private configPath: string;
  private config: CLIConfig;

  constructor(projectRoot: string) {
    this.configPath = path.join(projectRoot, '.task-validator.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): CLIConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        return fs.readJsonSync(this.configPath);
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração:', error);
    }

    return this.getDefaultConfig();
  }

  private getDefaultConfig(): CLIConfig {
    return {
      defaultBranch: 'main',
      outputDir: 'reports',
      rulesFile: 'task-rules.json',
      autoCommit: false,
      ignoreFiles: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.log',
        '*.tmp'
      ],
      maxFileSize: 1024 * 1024, // 1MB
      timeout: 300 // 5 minutos
    };
  }

  async saveConfig(): Promise<void> {
    await fs.writeJson(this.configPath, this.config, { spaces: 2 });
  }

  get<K extends keyof CLIConfig>(key: K): CLIConfig[K] {
    return this.config[key];
  }

  set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
    this.config[key] = value;
  }

  async createConfigFile(): Promise<void> {
    const defaultConfig = this.getDefaultConfig();
    await fs.writeJson(this.configPath, defaultConfig, { spaces: 2 });
  }

  getConfigPath(): string {
    return this.configPath;
  }

  exists(): boolean {
    return fs.existsSync(this.configPath);
  }
}

export function createDefaultConfig(projectRoot: string): CLIConfig {
  return {
    defaultBranch: 'main',
    outputDir: 'reports',
    rulesFile: 'task-rules.json',
    autoCommit: false,
    ignoreFiles: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      '*.log',
      '*.tmp',
      'coverage/**',
      '.nyc_output/**',
      '.env*',
      '*.lock'
    ],
    maxFileSize: 1024 * 1024, // 1MB
    timeout: 300 // 5 minutos
  };
}
