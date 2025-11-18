#!/bin/bash

# Script para verificar la configuración de Supabase

echo "🔍 Verificando configuración de Supabase..."
echo ""

# Verificar que existe .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ Error: No se encontró .env.local"
    exit 1
fi

# Cargar variables
export $(grep -v '^#' .env.local | grep -v '^$' | xargs)

echo "✅ Archivo .env.local encontrado"
echo ""

# Verificar variables
echo "📋 Verificando variables de entorno:"
echo ""

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL no está configurada"
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada"
else
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:30}..."
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY no está configurada"
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."
fi

if [ -z "$DIRECT_URL" ]; then
    echo "❌ DIRECT_URL no está configurada"
elif [[ "$DIRECT_URL" == *"[YOUR-PASSWORD]"* ]]; then
    echo "⚠️  DIRECT_URL contiene [YOUR-PASSWORD] - necesitas reemplazarlo con tu contraseña real"
else
    echo "✅ DIRECT_URL configurada"
fi

echo ""
echo "📊 Estado de las migraciones:"
if [ -f "supabase/migrations/001_initial_schema.sql" ]; then
    echo "✅ Archivo de migración encontrado"
    LINES=$(wc -l < supabase/migrations/001_initial_schema.sql)
    echo "   Líneas: $LINES"
else
    echo "❌ Archivo de migración no encontrado"
fi

echo ""
echo "✨ Verificación completada"
echo ""
echo "💡 Próximos pasos:"
echo "   1. Si DIRECT_URL tiene [YOUR-PASSWORD], reemplázalo en .env.local"
echo "   2. Ejecuta las migraciones desde el SQL Editor de Supabase"
echo "   3. O usa: ./scripts/run-migrations.sh (si tienes psql)"

