# Configuración de Supabase - Paso a Paso

## ✅ Paso 1: Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión o crea una cuenta
3. Click en "New Project"
4. Completa el formulario:
   - **Name**: TDP Ticketing System
   - **Database Password**: Crea una contraseña segura (guárdala bien)
   - **Region**: Elige la región más cercana (us-east-1 para Panamá)
   - **Pricing Plan**: Free tier está bien para empezar

5. Espera a que se cree el proyecto (2-3 minutos)

## ✅ Paso 2: Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** → **API**
2. Anota las siguientes credenciales:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGc...`
   - **service_role** key: `eyJhbGc...` (¡Mantén esto secreto!)

3. Ve a **Settings** → **Database**
   - Anota la **Connection string** (si la necesitas)

## ✅ Paso 3: Ejecutar Migraciones

Tienes dos opciones:

### Opción A: Desde el Dashboard (Más fácil)

1. Ve a **SQL Editor** en el dashboard de Supabase
2. Click en "New query"
3. Abre el archivo `supabase/migrations/001_initial_schema.sql` en tu editor
4. Copia TODO el contenido del archivo
5. Pégalo en el SQL Editor
6. Click en "Run" o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
7. Espera a que termine (debería tomar unos segundos)
8. Verifica que no haya errores

### Opción B: Usando Supabase CLI (Más profesional)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar sesión
supabase login

# Vincular proyecto (necesitas el Project Reference ID)
supabase link --project-ref TU_PROJECT_REF

# Ejecutar migraciones
supabase db push
```

Para obtener el Project Reference ID:
- Ve a Settings → General
- Busca "Reference ID"

## ✅ Paso 4: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
ITBMS_RATE=0.07
CURRENCY=USD

# PWA
NEXT_PUBLIC_PWA_ENABLED=true

# Payment Gateways (configurar después)
# YAPPY_API_KEY=
# PAGUELOFACIL_API_KEY=
# etc...
```

**⚠️ IMPORTANTE**: 
- `.env.local` está en `.gitignore` (no se subirá a GitHub)
- NUNCA subas las keys a GitHub
- Para producción, usa variables de entorno en Vercel/plataforma de hosting

## ✅ Paso 5: Generar Tipos de TypeScript

Después de ejecutar las migraciones:

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Generar tipos
npx supabase gen types typescript --project-id TU_PROJECT_REF > src/lib/supabase/database.types.ts
```

O manualmente desde el dashboard:
1. Ve a **Settings** → **API**
2. Scroll hasta "TypeScript types"
3. Copia el código generado
4. Pégalo en `src/lib/supabase/database.types.ts`

## ✅ Paso 6: Verificar Configuración

1. Inicia el servidor de desarrollo:
```bash
npm run dev
```

2. Ve a `http://localhost:3000`
3. Deberías ver la página de búsqueda sin errores

## ✅ Paso 7: Configurar Autenticación (Opcional)

1. Ve a **Authentication** → **Providers** en Supabase
2. Configura los proveedores que quieras usar:
   - Email (ya está habilitado por defecto)
   - Google, GitHub, etc. (opcional)

3. Configura **Email Templates** si quieres personalizar los emails

## 🔍 Verificación Final

Verifica que todo esté funcionando:

1. ✅ Las migraciones se ejecutaron sin errores
2. ✅ Puedes ver las tablas en **Table Editor**
3. ✅ Las políticas RLS están activas
4. ✅ El proyecto local se conecta a Supabase
5. ✅ No hay errores en la consola del navegador

## 📚 Recursos Útiles

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Dashboard](https://app.supabase.com)

## 🆘 Solución de Problemas

### Error: "relation does not exist"
- Las migraciones no se ejecutaron correctamente
- Verifica que ejecutaste TODO el script SQL

### Error: "permission denied"
- Las políticas RLS pueden estar bloqueando
- Verifica las políticas en Authentication → Policies

### Error de conexión
- Verifica que las URLs y keys en `.env.local` sean correctas
- Asegúrate de que `.env.local` existe y está en la raíz del proyecto

