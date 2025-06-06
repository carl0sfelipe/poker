#!/bin/bash

# Script de inicialização para configurar o projeto

set -e

# Certificar e matar processos nas portas necessárias
PORT_BACKEND=3000
PORT_FRONTEND=5173

echo "Verificando e matando processos nas portas $PORT_BACKEND e $PORT_FRONTEND..."
if lsof -i:$PORT_BACKEND; then
  kill -9 $(lsof -t -i:$PORT_BACKEND)
fi
if lsof -i:$PORT_FRONTEND; then
  kill -9 $(lsof -t -i:$PORT_FRONTEND)
fi

# Configuração do backend
echo "Instalando dependências do backend..."
cd backend
rm -rf node_modules package-lock.json
npm install

# Configuração do frontend
echo "Instalando dependências do frontend..."
cd ../frontend
rm -rf node_modules package-lock.json
npm install

# Iniciar o backend e o frontend
echo "Iniciando o backend e o frontend..."
cd ../backend
npm run dev &
cd ../frontend
npm run dev &

echo "Configuração concluída e servidores iniciados!"