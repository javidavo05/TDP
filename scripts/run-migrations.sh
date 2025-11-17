#!/bin/bash

# Script para ejecutar migraciones de Supabase usando DIRECT_URL

echo "🗄️  Ejecutando migraciones de Supabase..."
echo ""

# Verificar que existe .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ Error: No se encontró el archivo .env.local"
    echo "💡 Crea el archivo .env.local con tus credenciales de Supabase"
    exit 1
fi

# Cargar variables de entorno
export $(grep -v '^#' .env.local | xargs)

# Verificar que DIRECT_URL está configurada
if [ -z "$DIRECT_URL" ]; then
    echo "❌ Error: DIRECT_URL no está configurada en .env.local"
    exit 1
fi

# Reemplazar [YOUR-PASSWORD] si existe
if [[ "$DIRECT_URL" == *"[YOUR-PASSWORD]"* ]]; then
    echo "⚠️  Advertencia: Necesitas reemplazar [YOUR-PASSWORD] en .env.local"
    echo "   con tu contraseña real de la base de datos"
    exit 1
fi

echo "📊 Conectando a la base de datos..."
echo ""

# Ejecutar migraciones usando psql
if command -v psql &> /dev/null; then
    echo "✅ psql encontrado, ejecutando migraciones..."
    PGPASSWORD=$(echo $DIRECT_URL | grep -oP 'postgres\.\w+:\K[^@]+' | sed 's/\[YOUR-PASSWORD\]//')
    
    # Extraer componentes de la URL
    DB_USER=$(echo $DIRECT_URL | grep -oP 'postgres\.\K[^:]+')
    DB_PASS=$(echo $DIRECT_URL | grep -oP ':\K[^@]+' | head -1)
    DB_HOST=$(echo $DIRECT_URL | grep -oP '@\K[^:]+')
    DB_PORT=$(echo $DIRECT_URL | grep -oP ':\K[0-9]+' | tail -1)
    DB_NAME=$(echo $DIRECT_URL | grep -oP '/\K[^?]+')
    
    # Ejecutar el archivo SQL
    psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" -f supabase/migrations/001_initial_schema.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migraciones ejecutadas exitosamente!"
    else
        echo ""
        echo "❌ Error al ejecutar migraciones"
        exit 1
    fi
else
    echo "⚠️  psql no está instalado"
    echo ""
    echo "💡 Opciones alternativas:"
    echo "   1. Instala PostgreSQL client: brew install postgresql (Mac) o apt-get install postgresql-client (Linux)"
    echo "   2. Usa el SQL Editor en el dashboard de Supabase"
    echo "   3. Usa Supabase CLI: supabase db push"
    echo ""
    echo "📝 Para usar el SQL Editor:"
    echo "   1. Ve a https://app.supabase.com"
    echo "   2. Selecciona tu proyecto"
    echo "   3. Ve a SQL Editor"
    echo "   4. Copia el contenido de supabase/migrations/001_initial_schema.sql"
    echo "   5. Pégalo y ejecuta"
    exit 1
fi

echo ""
echo "✨ ¡Configuración completada!"

