# 🤖 Task Validator Agent

Agente de IA para validação automática de tasks usando regras de negócio e análise de código com LangChain e Gemini.

## ✨ Funcionalidades

- 🔍 **Análise Inteligente**: Valida implementações contra regras de negócio usando IA
- 📊 **Relatórios Detalhados**: Gera relatórios JSON com análise completa e sugestões
- 🔄 **Integração Git**: Analisa mudanças reais do repositório
- 🎯 **Score de Completude**: Calcula percentual de implementação da task
- 💡 **Sugestões Automáticas**: Recomenda melhorias baseadas na análise
- 🖥️ **CLI Global**: Ferramenta de linha de comando para uso em qualquer projeto
- ⚙️ **Configuração Flexível**: Sistema de configuração global e local

## 🚀 Uso Principal: CLI

O **CLI (Command Line Interface)** é a forma mais prática de usar o Task Validator. Ele permite validar tasks em qualquer repositório Git sem precisar configurar um servidor.

### 📦 Instalação

```bash
# Instalação global (recomendado)
npm install -g task-validator-agent

# Verificar instalação
task-validator --version
```

### ⚙️ Configuração Inicial

#### 1. Configurar API Key (Obrigatório)

```bash
# Configurar sua chave da API do Google AI
task-validator config --api-key "sua-chave-aqui"

# Verificar se foi salva
task-validator config --show
```

**💡 Dica**: Obtenha sua chave em [Google AI Studio](https://makersuite.google.com/app/apikey)

#### 2. Configurações Opcionais

```bash
# Configurar branch padrão
task-validator config --default-branch develop

# Configurar diretório de relatórios
task-validator config --output-dir meus-relatorios

# Configurar arquivo de regras padrão
task-validator config --rules-file minhas-regras.json
```

### 📋 Criando Regras de Negócio

#### 1. Gerar Arquivo de Exemplo

```bash
# Criar arquivo de regras básico
task-validator init

# Ou com nome personalizado
task-validator init --output auth-rules.json
```

#### 2. Estrutura do Arquivo de Regras

```json
{
  "taskId": "AUTH-001",
  "title": "Implementar Sistema de Autenticação",
  "description": "Criar sistema completo de login e registro de usuários",
  "rules": [
    {
      "id": "AUTH-LOGIN-001",
      "category": "api",
      "description": "Implementar endpoint POST /auth/login",
      "priority": "high",
      "implemented": false,
      "confidence": 0,
      "evidence": ""
    },
    {
      "id": "AUTH-REGISTER-001",
      "category": "api", 
      "description": "Implementar endpoint POST /auth/register",
      "priority": "high",
      "implemented": false,
      "confidence": 0,
      "evidence": ""
    },
    {
      "id": "AUTH-MIDDLEWARE-001",
      "category": "security",
      "description": "Implementar middleware de autenticação JWT",
      "priority": "medium",
      "implemented": false,
      "confidence": 0,
      "evidence": ""
    },
    {
      "id": "AUTH-VALIDATION-001",
      "category": "validation",
      "description": "Validar dados de entrada nos endpoints",
      "priority": "medium",
      "implemented": false,
      "confidence": 0,
      "evidence": ""
    }
  ],
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 🎯 Executando Validações

#### Validação Básica

```bash
# Usar configurações padrão
task-validator validate

# Especificar arquivo de regras
task-validator validate --rules auth-rules.json

# Especificar branch base
task-validator validate --base-branch develop
```

#### Validação com Opções Personalizadas

```bash
# Validação completa com todas as opções
task-validator validate \
  --rules auth-rules.json \
  --base-branch main \
  --output relatorios-auth \
  --api-key "sua-chave-aqui"
```

### 📊 Exemplo de Relatório Gerado

```json
{
  "taskId": "AUTH-001",
  "branchName": "feature/auth-system",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "summary": {
    "totalRules": 4,
    "implementedCount": 2,
    "missingCount": 2,
    "highPriorityMissing": 0,
    "completenessScore": 0.5,
    "percentage": "50.0%"
  },
  "implementedRules": [
    {
      "id": "AUTH-LOGIN-001",
      "description": "Implementar endpoint POST /auth/login",
      "priority": "high",
      "category": "api",
      "implemented": true,
      "confidence": 0.95,
      "evidence": "Encontrado endpoint POST /auth/login em src/routes/auth.ts"
    }
  ],
  "missingRules": [
    {
      "id": "AUTH-REGISTER-001", 
      "description": "Implementar endpoint POST /auth/register",
      "priority": "high",
      "category": "api",
      "implemented": false,
      "confidence": 0.0,
      "evidence": "Endpoint não encontrado no código"
    }
  ],
  "suggestions": [
    "Implementar endpoint POST /auth/register",
    "Adicionar validação de dados nos endpoints existentes"
  ],
  "analysis": {
    "strengths": [
      "✅ 2 regras implementadas com sucesso",
      "✅ 2 regras de alta prioridade implementadas"
    ],
    "weaknesses": [
      "❌ 2 regras não implementadas"
    ],
    "nextSteps": [
      "🔧 Implementar: Implementar endpoint POST /auth/register",
      "🔧 Implementar: Implementar middleware de autenticação JWT"
    ]
  }
}
```

## 🏗️ Decisões Técnicas da Arquitetura

### 🎯 Foco no CLI

Decidi focar na CLI como interface principal porque:

1. **Simplicidade**: Não precisa configurar servidor
2. **Portabilidade**: Funciona em qualquer repositório Git
3. **Integração**: Fácil integração com CI/CD
4. **Configuração**: Sistema de configuração global intuitivo

### 🔧 Sistema de Configuração

O sistema de configuração foi projetado com prioridades claras:

```bash
# Prioridade: Linha de comando > Configuração global > Variável de ambiente
task-validator validate --api-key "chave"  # 1ª prioridade
# ~/.task-validator/config.json            # 2ª prioridade  
# GOOGLE_AI_API_KEY                        # 3ª prioridade
```

## 🖥️ Servidor API (Uso Avançado)

Para equipes ou integração com CI/CD, o servidor API oferece mais funcionalidades:

### Configuração do Servidor

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com sua GOOGLE_API_KEY

# Iniciar servidor
npm run dev
```

### APIs Disponíveis

#### POST `/api/validation/validate`
Valida uma task e retorna resultado com relatório básico.

```bash
curl -X POST http://localhost:3001/api/validation/validate \
  -H "Content-Type: application/json" \
  -d '{
    "rules": {...},
    "repositoryPath": "/path/to/repo",
    "baseBranch": "main"
  }'
```

#### POST `/api/validation/report`
Gera relatório detalhado da validação.

```bash
curl -X POST http://localhost:3001/api/validation/report \
  -H "Content-Type: application/json" \
  -d '{
    "rules": {...},
    "repositoryPath": "/path/to/repo",
    "reportType": "detailed"
  }'
```

## 🔧 Troubleshooting

### Problema: Comando não encontrado após instalação

Se após instalar com `npm install -g task-validator-agent` você receber o erro:

```bash
zsh: command not found: task-validator
```

**Soluções:**

1. **Reinstalar o pacote:**
   ```bash
   npm uninstall -g task-validator-agent
   npm install -g task-validator-agent
   ```

2. **Verificar se o npm está configurado corretamente:**
   ```bash
   npm config get prefix
   # Deve mostrar o diretório onde os binários globais são instalados
   
   echo $PATH
   # Deve incluir o diretório de binários do npm
   ```

3. **Usar o script de instalação automático:**
   ```bash
   # No diretório do projeto
   ./scripts/install.sh
   ```

4. **Verificar se o projeto foi compilado:**
   ```bash
   # No diretório do projeto
   npm run build
   chmod +x dist/cli.js
   npm install -g .
   ```

### Problema: Erro de permissão

Se receber erro de permissão ao instalar globalmente:

```bash
sudo npm install -g task-validator-agent
```

### Verificar instalação

```bash
# Verificar se o comando está disponível
which task-validator

# Verificar versão
task-validator --version

# Verificar ajuda
task-validator --help
```

## 📁 Estrutura do Projeto

```
src/
├── agents/
│   └── TaskValidatorAgent.ts    # Agente principal com IA
├── services/
│   ├── git.service.ts           # Integração com Git
│   └── validation-report.service.ts # Geração de relatórios
├── routes/
│   ├── validation.ts            # Rotas de validação
│   └── health.ts                # Health checks
├── types/
│   └── index.ts                 # Tipos TypeScript (7 interfaces essenciais)
├── utils/
│   └── logger.ts                # Sistema de logging
├── middleware/
│   └── errorHandler.ts          # Tratamento de erros
├── cli.ts                       # Interface de linha de comando
└── index.ts                     # Servidor Express

scripts/
└── install-global.sh            # Script de instalação global

reports/                         # Relatórios gerados
├── detailed-validation-*.json
└── validation-report-*.json
```

## 🎯 Tecnologias

- **LangChain**: Framework para agentes de IA
- **Google Gemini**: Modelo de linguagem para análise de código
- **Express**: Servidor web para API
- **TypeScript**: Linguagem principal com tipagem forte
- **Simple Git**: Integração robusta com Git
- **Commander**: Framework CLI profissional

## 📈 Próximos Passos

- [ ] Interface web para visualização de relatórios
- [ ] Integração com GitHub Actions e GitLab CI
- [ ] Suporte a múltiplos repositórios simultâneos
- [ ] Análise de histórico de commits
- [ ] Métricas de qualidade de código
- [ ] Plugins para diferentes linguagens de programação

## 🤝 Contribuindo

O projeto foi otimizado para ser fácil de contribuir:

1. **Documentação**: Exemplos práticos e decisões documentadas
2. **CLI First**: Foco na experiência do desenvolvedor

---

**💡 Dica**: Comece com `task-validator init` para criar seu primeiro arquivo de regras e veja como funciona!
