#!/bin/bash

# Script para configurar Supabase

echo "🗄️  Configuración de Supabase para TDP Ticketing System"
echo ""

# Verificar si Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI no está instalado"
    echo "📦 Instalando Supabase CLI..."
    npm install -g supabase
fi

echo "✅ Supabase CLI instalado"
echo ""

# Verificar si ya está vinculado
if [ -f ".supabase/config.toml" ]; then
    echo "⚠️  Ya existe una configuración de Supabase"
    read -p "¿Deseas reconfigurarlo? (y/n): " reconfigure
    if [ "$reconfigure" != "y" ]; then
        echo "❌ Operación cancelada"
        exit 1
    fi
fi

echo "📝 Necesitarás las siguientes credenciales de tu proyecto Supabase:"
echo "   1. Project Reference ID"
echo "   2. Database Password"
echo ""

read -p "¿Tienes estas credenciales listas? (y/n): " ready
if [ "$ready" != "y" ]; then
    echo ""
    echo "💡 Obtén las credenciales en:"
    echo "   https://app.supabase.com/project/_/settings/api"
    echo ""
    exit 1
fi

# Iniciar sesión
echo ""
echo "🔐 Iniciando sesión en Supabase..."
supabase login

# Vincular proyecto
echo ""
echo "🔗 Vinculando proyecto..."
read -p "Project Reference ID: " project_ref

if [ -z "$project_ref" ]; then
    echo "❌ Project Reference ID no puede estar vacío"
    exit 1
fi

supabase link --project-ref "$project_ref"

# Ejecutar migraciones
echo ""
read -p "¿Deseas ejecutar las migraciones ahora? (y/n): " run_migrations
if [ "$run_migrations" == "y" ]; then
    echo ""
    echo "📊 Ejecutando migraciones..."
    supabase db push
    echo ""
    echo "✅ Migraciones ejecutadas"
else
    echo ""
    echo "💡 Para ejecutar migraciones manualmente:"
    echo "   supabase db push"
fi

echo ""
echo "✨ Configuración de Supabase completada!"
echo ""
echo "📝 Recuerda actualizar tu archivo .env.local con:"
echo "   NEXT_PUBLIC_SUPABASE_URL=tu_url"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key"
echo "   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key"

