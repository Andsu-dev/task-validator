# Task Validator CLI

Uma ferramenta de linha de comando para validar automaticamente a implementação de tarefas usando IA e análise de mudanças do Git.

## 🚀 Instalação

### Instalação Global (Recomendado)

```bash
npm install -g task-validator-agent
```

### Instalação Local

```bash
npm install task-validator-agent
npx task-validator --help
```

## 📋 Pré-requisitos

1. **Chave da API do Google AI**: Obtenha uma chave em [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Repositório Git**: O projeto deve estar em um repositório Git
3. **Arquivo de Regras**: JSON com as regras de negócio a serem validadas

## 🎯 Uso Básico

### 1. Configurar API Key (Primeira vez)

```bash
# Configurar sua chave da API (obrigatório)
task-validator config --api-key "sua-chave-aqui"

# Verificar se foi salva
task-validator config --show
```

### 2. Criar arquivo de regras

```bash
# Criar arquivo de exemplo
task-validator init

# Ou especificar nome personalizado
task-validator init --output minhas-regras.json
```

### 3. Editar as regras

Edite o arquivo `task-rules.json` criado com suas regras específicas:

```json
{
  "taskId": "TASK-001",
  "title": "Implementar autenticação",
  "description": "Sistema de login e registro",
  "rules": [
    {
      "id": "AUTH-001",
      "category": "api",
      "description": "Endpoint de login",
      "priority": "high",
      "criteria": ["POST /auth/login", "validação", "token"]
    }
  ]
}
```

### 4. Executar validação

```bash
# Validação básica (usa configuração global)
task-validator validate

# Com opções personalizadas
task-validator validate \
  --rules minhas-regras.json \
  --base-branch develop \
  --output relatorios
```

## ⚙️ Configuração

### Configuração Global (Recomendado)

O CLI salva a configuração globalmente em `~/.task-validator/config.json`:

```bash
# Configurar API key (obrigatório)
task-validator config --api-key "sua-chave-aqui"

# Ver configuração atual
task-validator config --show

# Configurar valores padrão
task-validator config --default-branch develop --output-dir meus-relatorios
```

### Prioridade de Configuração

O CLI usa a seguinte prioridade para configurações:

1. **Linha de comando** (maior prioridade)
2. **Configuração global** (`~/.task-validator/config.json`)
3. **Variável de ambiente** (`GOOGLE_AI_API_KEY`)
4. **Valores padrão** (menor prioridade)

### Variável de Ambiente (Alternativo)

Configure sua chave da API via variável de ambiente:

```bash
export GOOGLE_AI_API_KEY="sua-chave-aqui"
```

### Arquivo de Configuração Local (Deprecated)

Para projetos específicos, você pode criar um arquivo `.task-validator.json`:

```json
{
  "defaultBranch": "main",
  "outputDir": "reports",
  "rulesFile": "task-rules.json"
}
```

## 📊 Comandos Disponíveis

### `config`

Gerencia a configuração global do CLI.

**Opções:**
- `--api-key <key>`: Definir chave da API do Google AI
- `--default-branch <branch>`: Definir branch padrão
- `--output-dir <dir>`: Definir diretório de saída padrão
- `--rules-file <file>`: Definir arquivo de regras padrão
- `--show`: Mostrar configuração atual
- `--clear`: Limpar configuração

**Exemplos:**
```bash
# Configurar API key
task-validator config --api-key "sua-chave-aqui"

# Ver configuração atual
task-validator config --show

# Definir diretório de saída padrão
task-validator config --output-dir "meus-relatorios"

# Limpar configuração
task-validator config --clear
```

### `validate`

Valida uma task baseada nas mudanças do Git.

**Opções:**
- `-r, --rules <file>`: Arquivo de regras (usa configuração padrão se não especificado)
- `-b, --base-branch <branch>`: Branch base (usa configuração padrão se não especificado)
- `-o, --output <dir>`: Diretório de saída (usa configuração padrão se não especificado)
- `-k, --api-key <key>`: Chave da API do Google AI (usa configuração padrão se não especificado)
- `--server <url>`: URL do servidor remoto (modo remoto)

### `init`

Cria um arquivo de regras de exemplo.

**Opções:**
- `-o, --output <file>`: Nome do arquivo (padrão: `task-rules.json`)

## 📁 Estrutura de Saída

Após a validação, será criada uma pasta `reports` com:

```
reports/
├── validation-TASK-001-2024-01-01T10-30-00-000Z.json
└── validation-TASK-002-2024-01-01T11-45-00-000Z.json
```

### Formato do Relatório

```json
{
  "taskId": "TASK-001",
  "branchName": "feature/auth",
  "timestamp": "2024-01-01T10:30:00.000Z",
  "summary": {
    "totalRules": 5,
    "implementedCount": 3,
    "missingCount": 2,
    "completenessScore": 0.6,
    "percentage": "60.0%"
  },
  "implementedRules": [...],
  "missingRules": [...],
  "suggestions": [...],
  "analysis": {
    "strengths": [...],
    "weaknesses": [...],
    "nextSteps": [...]
  }
}
```

## 🔧 Exemplos de Uso

### Validação em CI/CD

```bash
# No seu pipeline
task-validator validate \
  --rules ci-rules.json \
  --base-branch main \
  --output ci-reports
```

### Validação com Branch Personalizado

```bash
# Validar mudanças desde develop
task-validator validate \
  --base-branch develop \
  --output feature-reports
```

### Validação Remota

```bash
# Enviar para servidor remoto
task-validator validate \
  --server https://seu-servidor.com/api/validate \
  --rules remote-rules.json
```

## 🎨 Categorias de Regras

- `api`: Endpoints e APIs
- `business_logic`: Lógica de negócio
- `ui`: Interface do usuário
- `database`: Modelos e consultas
- `security`: Segurança e autenticação
- `performance`: Otimizações
- `validation`: Validações de entrada

## 🚨 Solução de Problemas

### Erro: "Não é um repositório Git válido"
- Certifique-se de estar em um diretório com `.git/`

### Erro: "Chave da API não fornecida"
- Configure `GOOGLE_AI_API_KEY` ou use `--api-key`

### Erro: "Arquivo de regras não encontrado"
- Use `task-validator init` para criar um arquivo de exemplo

### Nenhuma mudança encontrada
- Verifique se há commits no branch atual
- Confirme se o branch base está correto

## 📝 Dicas

1. **Regras Específicas**: Seja específico nas descrições das regras
2. **Critérios Claros**: Liste critérios mensuráveis
3. **Prioridades**: Use `high`, `medium`, `low` para priorizar
4. **Commits Frequentes**: Faça commits pequenos e frequentes
5. **Teste Local**: Teste as regras antes de usar em CI/CD

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.
