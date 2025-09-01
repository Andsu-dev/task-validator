#!/bin/bash

# Script para instalação global do Task Validator CLI
echo "🚀 Instalando Task Validator CLI globalmente..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale o npm primeiro."
    exit 1
fi

# Compilar o projeto
echo "📦 Compilando o projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro na compilação. Verifique os erros acima."
    exit 1
fi

# Instalar globalmente
echo "🌍 Instalando globalmente..."
npm install -g .

if [ $? -eq 0 ]; then
    echo "✅ Task Validator CLI instalado com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Configure sua chave da API:"
    echo "   export GOOGLE_AI_API_KEY='sua-chave-aqui'"
    echo ""
    echo "2. Crie um arquivo de regras:"
    echo "   task-validator init"
    echo ""
    echo "3. Execute uma validação:"
    echo "   task-validator validate"
    echo ""
    echo "📖 Para mais informações, consulte: CLI_README.md"
else
    echo "❌ Erro na instalação global."
    exit 1
fi
