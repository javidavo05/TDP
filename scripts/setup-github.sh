#!/bin/bash

# Script para configurar GitHub remote y hacer push inicial

echo "🚀 Configuración de GitHub para TDP Ticketing System"
echo ""

# Verificar si ya existe un remote
if git remote | grep -q origin; then
    echo "⚠️  Ya existe un remote 'origin'"
    git remote -v
    read -p "¿Deseas actualizarlo? (y/n): " update
    if [ "$update" != "y" ]; then
        echo "❌ Operación cancelada"
        exit 1
    fi
    git remote remove origin
fi

# Solicitar URL del repositorio
echo "📝 Ingresa la URL de tu repositorio de GitHub:"
echo "   Ejemplo HTTPS: https://github.com/usuario/repositorio.git"
echo "   Ejemplo SSH: git@github.com:usuario/repositorio.git"
read -p "URL: " repo_url

if [ -z "$repo_url" ]; then
    echo "❌ URL no puede estar vacía"
    exit 1
fi

# Agregar remote
echo ""
echo "🔗 Agregando remote..."
git remote add origin "$repo_url"

# Verificar
echo ""
echo "✅ Remote configurado:"
git remote -v

# Hacer push
echo ""
read -p "¿Deseas hacer push ahora? (y/n): " push_now
if [ "$push_now" == "y" ]; then
    echo ""
    echo "📤 Haciendo push a GitHub..."
    git push -u origin main
    echo ""
    echo "✅ ¡Código subido exitosamente a GitHub!"
else
    echo ""
    echo "💡 Para hacer push manualmente, ejecuta:"
    echo "   git push -u origin main"
fi

echo ""
echo "✨ Configuración completada!"

