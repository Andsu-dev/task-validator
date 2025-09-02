#!/bin/bash

# Script de instalação para task-validator-agent
# Este script compila o projeto TypeScript e instala globalmente

set -e

echo "🚀 Instalando task-validator-agent..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm primeiro."
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🔨 Compilando projeto TypeScript..."
npm run build

echo "🔒 Definindo permissões de execução..."
chmod +x dist/cli.js

echo "🌍 Instalando globalmente..."
npm install -g .

echo "✅ Instalação concluída!"
echo ""
echo "📋 Comandos disponíveis:"
echo "   task-validator --version     # Verificar versão"
echo "   task-validator --help        # Ver ajuda"
echo "   task-validator init          # Criar arquivo de regras de exemplo"
echo "   task-validator config        # Configurar CLI"
echo "   task-validator validate      # Validar tasks"
echo ""
echo "🎯 Para usar em outros repositórios, execute:"
echo "   task-validator init          # Para criar arquivo de regras"
echo "   task-validator validate      # Para validar tasks"
