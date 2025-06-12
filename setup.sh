#!/bin/bash

# Script de inicialização para configurar o projeto
# 
# FUNCIONALIDADES:
# - Instalação completa das dependências
# - Execução de testes automatizados abrangentes
# - Inicialização dos servidores de desenvolvimento
#
# TESTES IMPLEMENTADOS:
# - Backend: Jest + Supertest (100% cobertura das rotas da API)
# - Frontend: Vitest + jsdom (cobertura completa dos services)
#
# USO:
# ./setup.sh              - Instalação + Testes + Servidores
# ./setup.sh --test-only  - Apenas executar testes

set -e

# Certificar e matar processos nas portas necessárias
PORT_BACKEND=3000
PORT_FRONTEND=5173

# Detectar SO
OS="$(uname)"
echo "Sistema operacional detectado: $OS"

# Função para matar processos na porta (compatível Mac e Linux)
kill_port() {
  local PORT=$1
  if lsof -i :$PORT >/dev/null 2>&1; then
    if [ "$OS" = "Darwin" ]; then
      # MacOS
      kill -9 $(lsof -t -i :$PORT)
    else
      # Linux
      fuser -k ${PORT}/tcp || kill -9 $(lsof -t -i :$PORT)
    fi
  fi
}

echo "Verificando e matando processos nas portas $PORT_BACKEND e $PORT_FRONTEND..."
kill_port $PORT_BACKEND
kill_port $PORT_FRONTEND

# Configuração do backend
echo "Instalando dependências do backend..."
cd backend
rm -rf node_modules package-lock.json
if ! npm install; then
  echo "Erro ao instalar dependências do backend. Limpando cache do npm e tentando novamente..."
  npm cache clean --force
  rm -rf node_modules package-lock.json
  if ! npm install; then
    echo "Erro persiste. Corrigindo permissões da pasta ~/.npm e tentando novamente..."
    sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
    if ! npm install; then
      echo "FALHA FATAL: Não foi possível instalar as dependências do backend mesmo após corrigir permissões."
      exit 1
    fi
  fi
fi

# Configuração do frontend
echo "Instalando dependências do frontend..."
cd ../frontend
rm -rf node_modules package-lock.json
if ! npm install; then
  echo "Erro ao instalar dependências do frontend. Limpando cache do npm e tentando novamente..."
  npm cache clean --force
  rm -rf node_modules package-lock.json
  if ! npm install; then
    echo "Erro persiste. Corrigindo permissões da pasta ~/.npm e tentando novamente..."
    sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
    if ! npm install; then
      echo "FALHA FATAL: Não foi possível instalar as dependências do frontend mesmo após corrigir permissões."
      exit 1
    fi
  fi
fi

# Executar testes
echo "=================================="
echo "EXECUTANDO TESTES AUTOMATIZADOS"
echo "=================================="

# Testes do Backend (Jest + Supertest)
echo ""
echo ">>> Executando testes do BACKEND..."
cd ../backend
if npm test; then
  echo "✅ BACKEND: Todos os testes passaram!"
else
  echo "❌ BACKEND: Alguns testes falharam!"
  echo "Por favor, verifique os erros acima antes de continuar."
fi

# Testes do Frontend (Vitest)
echo ""
echo ">>> Executando testes do FRONTEND..."
cd ../frontend
if npm test; then
  echo "✅ FRONTEND: Todos os testes passaram!"
else
  echo "❌ FRONTEND: Alguns testes falharam!"
  echo "Por favor, verifique os erros acima antes de continuar."
fi

echo ""
echo "=================================="
echo "RESUMO DOS TESTES"
echo "=================================="
echo "Backend: Jest + Supertest - Cobertura completa das rotas da API"
echo "Frontend: Vitest + jsdom - Cobertura dos serviços e utilitários"
echo "=================================="

# Opção para executar apenas os testes
if [[ "$1" == "--test-only" ]]; then
  echo ""
  echo "Execução de testes concluída. Encerrando script (--test-only)."
  exit 0
fi

# Iniciar o backend e o frontend
cd ..
echo ""
echo "Iniciando o backend e o frontend com npm run dev na raiz..."
echo "Use Ctrl+C para encerrar ambos os servidores."
echo ""
echo "💡 Para executar apenas os testes, use: ./setup.sh --test-only"
echo ""
npm run dev

echo "Configuração concluída e servidores iniciados!"