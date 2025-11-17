# Configuración Rápida de Supabase

## ✅ Ya tienes las conexiones de base de datos

Tienes las URLs de conexión. Ahora necesitas:

## 📋 Paso 1: Obtener las credenciales de API

1. Ve a tu proyecto en Supabase: https://app.supabase.com
2. Ve a **Settings** → **API**
3. Copia estos valores:

   - **Project URL**: `https://xfgvutasyerkzfrbmpsn.supabase.co`
   - **anon public** key: (empieza con `eyJhbGc...`)
   - **service_role** key: (empieza con `eyJhbGc...`) ⚠️ **MANTÉN ESTO SECRETO**

## 📋 Paso 2: Actualizar .env.local

1. Abre el archivo `.env.local` que acabo de crear
2. Reemplaza `[YOUR-PASSWORD]` con tu contraseña real de la base de datos
3. Actualiza estas líneas con los valores del Paso 1:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xfgvutasyerkzfrbmpsn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_real_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_real_aqui
```

## 📋 Paso 3: Ejecutar Migraciones

Tienes 3 opciones:

### Opción A: Usando el Script (Recomendado si tienes psql)

```bash
./scripts/run-migrations.sh
```

### Opción B: Desde el Dashboard de Supabase (Más fácil)

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú lateral)
4. Click en **New query**
5. Abre el archivo `supabase/migrations/001_initial_schema.sql`
6. Copia TODO el contenido (414 líneas)
7. Pégalo en el SQL Editor
8. Click en **Run** o presiona `Ctrl+Enter` (Mac: `Cmd+Enter`)
9. Espera a que termine (debería decir "Success")

### Opción C: Usando Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar sesión
supabase login

# Vincular proyecto (necesitas el Project Reference ID)
# Lo encuentras en Settings > General > Reference ID
supabase link --project-ref xfgvutasyerkzfrbmpsn

# Ejecutar migraciones
supabase db push
```

## 📋 Paso 4: Verificar que funcionó

1. Ve a **Table Editor** en Supabase
2. Deberías ver todas estas tablas:
   - users
   - bus_owners
   - buses
   - bus_presets
   - routes
   - route_stops
   - trips
   - seats
   - tickets
   - payments
   - pos_terminals
   - pos_display_sessions
   - gps_logs
   - daily_bus_revenue
   - occupancy_metrics
   - route_usage

## 📋 Paso 5: Generar Tipos de TypeScript

Después de las migraciones, genera los tipos:

```bash
# Opción 1: Usando Supabase CLI
npx supabase gen types typescript --project-id xfgvutasyerkzfrbmpsn > src/lib/supabase/database.types.ts

# Opción 2: Desde el Dashboard
# 1. Ve a Settings > API
# 2. Scroll hasta "TypeScript types"
# 3. Copia el código
# 4. Pégalo en src/lib/supabase/database.types.ts
```

## 📋 Paso 6: Probar la Conexión

```bash
# Iniciar el servidor de desarrollo
npm run dev
```

Ve a http://localhost:3000 y verifica que no haya errores en la consola.

## 🔍 Verificación Final

✅ `.env.local` configurado con todas las credenciales  
✅ Migraciones ejecutadas sin errores  
✅ Tablas creadas en Supabase  
✅ Tipos de TypeScript generados  
✅ Servidor local funciona sin errores  

## 🆘 Problemas Comunes

### Error: "relation does not exist"
- Las migraciones no se ejecutaron
- Ejecuta las migraciones de nuevo

### Error: "permission denied"
- Verifica que las políticas RLS estén activas
- Ve a Authentication > Policies en Supabase

### Error de conexión
- Verifica que `.env.local` tenga las credenciales correctas
- Asegúrate de reemplazar `[YOUR-PASSWORD]` con tu contraseña real

