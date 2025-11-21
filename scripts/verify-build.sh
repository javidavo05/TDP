#!/bin/bash

# Script para verificar que el build compile correctamente antes de hacer push
# Uso: ./scripts/verify-build.sh

set -e

echo "🔍 Verificando que el build compile correctamente..."

# Ejecutar build
npm run build

# Verificar si hubo errores
if [ $? -eq 0 ]; then
    echo "✅ Build exitoso - Listo para hacer push"
    exit 0
else
    echo "❌ Build falló - Por favor corrige los errores antes de hacer push"
    exit 1
fi

