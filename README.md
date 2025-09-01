# 🤖 Task Validator Agent

Agente de IA para validação de tasks usando regras de negócio e análise de código com LangChain e Gemini.

## ✨ Funcionalidades

- 🔍 **Análise de Código**: Valida implementações contra regras de negócio
- 📊 **Relatórios Detalhados**: Gera relatórios JSON com análise completa
- 🔄 **Integração Git**: Puxa alterações reais do repositório
- 🎯 **Score de Completude**: Calcula percentual de implementação
- 💡 **Sugestões Automáticas**: Recomenda melhorias baseadas na análise
- 🖥️ **CLI Global**: Ferramenta de linha de comando para uso em qualquer projeto

## 🚀 Como Usar

### 🖥️ CLI (Recomendado para uso em projetos)

O CLI permite usar o Task Validator em qualquer repositório Git:

```bash
# Instalação global
npm install -g task-validator-agent

# Ou usar localmente
npx task-validator-agent

# Criar arquivo de regras
task-validator init

# Executar validação
task-validator validate
```

📖 **Documentação completa do CLI**: [CLI_README.md](CLI_README.md)

### 🖥️ Servidor (Para uso em equipes/CI)

#### 1. Configuração

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com sua GOOGLE_API_KEY
```

#### 2. Iniciar o Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

### 3. Validar Task

```bash
# Usando dados de exemplo
node test-git-validation.js

# Validar com Git real
curl -X POST http://localhost:3001/api/validation/validate \
  -H "Content-Type: application/json" \
  -d @test-git-data.json
```

### 4. Gerar Relatório

```bash
# Preparar dados para relatório
node generate-report.js

# Gerar relatório detalhado
curl -X POST http://localhost:3001/api/validation/report \
  -H "Content-Type: application/json" \
  -d @report-request.json
```

## 📊 Estrutura do Relatório

O relatório JSON inclui:

```json
{
  "taskId": "hello-world-api-001",
  "summary": {
    "totalRules": 5,
    "implementedCount": 1,
    "missingCount": 4,
    "completenessScore": 0.2,
    "percentage": "20.0%"
  },
  "implementedRules": [...],
  "missingRules": [...],
  "analysis": {
    "strengths": ["✅ 1 regras implementadas com sucesso"],
    "weaknesses": ["❌ 4 regras não implementadas"],
    "nextSteps": ["🔧 Implementar: Rota /hello-world"]
  },
  "rulesBreakdown": {
    "byPriority": {...},
    "byCategory": {...}
  }
}
```

## 🔧 APIs Disponíveis

### POST `/api/validation/validate`
Valida uma task e retorna resultado com relatório básico.

### POST `/api/validation/report`
Gera relatório detalhado da validação.

### GET `/api/health`
Health check do servidor.

### GET `/api/health/ready`

## 🛠️ Scripts Úteis

```bash
# Instalar CLI globalmente
./scripts/install-global.sh

# Executar CLI localmente
npm run cli

# Compilar e executar CLI
npm run cli:build

# Testar validação
npm run cli -- validate --rules examples/task-rules-example.json
```
Verifica se o serviço está pronto (API key configurada).

## 📁 Estrutura do Projeto

```
src/
├── agents/
│   └── TaskValidatorAgent.ts    # Agente principal
├── services/
│   ├── GitService.ts           # Integração com Git
│   └── ValidationReportService.ts # Geração de relatórios
├── routes/
│   ├── validation.ts           # Rotas de validação
│   └── health.ts               # Health checks
├── types/
│   └── index.ts                # Tipos TypeScript
└── utils/
    └── logger.ts               # Sistema de logging

reports/                         # Relatórios gerados
├── detailed-validation-*.json
└── validation-report-*.json
```

## 🧪 Exemplo de Uso

### 1. Criar Regras de Negócio

```json
{
  "taskId": "hello-world-api-001",
  "rules": [
    {
      "id": "rule-001",
      "description": "A rota deve responder a requisições GET em /hello-world",
      "priority": "high",
      "category": "api"
    }
  ]
}
```

### 2. Validar Implementação

```bash
# O agente analisará o código e comparará com as regras
curl -X POST http://localhost:3001/api/validation/validate \
  -H "Content-Type: application/json" \
  -d '{
    "rules": {...},
    "repositoryPath": "/path/to/repo",
    "baseBranch": "main"
  }'
```

### 3. Gerar Relatório

```bash
# Relatório será salvo em ./reports/
curl -X POST http://localhost:3001/api/validation/report \
  -H "Content-Type: application/json" \
  -d '{
    "rules": {...},
    "repositoryPath": "/path/to/repo",
    "reportType": "detailed"
  }'
```

## 🎯 Tecnologias

- **LangChain**: Framework para agentes de IA
- **Google Gemini**: Modelo de linguagem para análise
- **Express**: Servidor web
- **TypeScript**: Linguagem principal
- **Simple Git**: Integração com Git

## 📈 Próximos Passos

- [ ] Interface web para visualização
- [ ] Integração com CI/CD
- [ ] Suporte a múltiplos repositórios
- [ ] Análise de histórico de commits
- [ ] Métricas de qualidade de código
