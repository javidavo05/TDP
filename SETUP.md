# Guía de Configuración - TDP Ticketing System

## 1. Configuración de GitHub

### Conectar repositorio local con GitHub

1. Crea un nuevo repositorio en GitHub (si no lo has hecho)
2. Ejecuta los siguientes comandos:

```bash
# Agregar el remote de GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# O si usas SSH:
git remote add origin git@github.com:TU_USUARIO/TU_REPOSITORIO.git

# Verificar que se agregó correctamente
git remote -v

# Subir el código
git push -u origin main
```

## 2. Configuración de Supabase

### Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Anota las siguientes credenciales:
   - Project URL
   - Anon/Public Key
   - Service Role Key

### Paso 2: Ejecutar migraciones

1. Instala Supabase CLI:
```bash
npm install -g supabase
```

2. Inicia sesión en Supabase CLI:
```bash
supabase login
```

3. Vincula tu proyecto local con Supabase:
```bash
supabase link --project-ref TU_PROJECT_REF
```

4. Ejecuta las migraciones:
```bash
supabase db push
```

O manualmente desde el dashboard de Supabase:
- Ve a SQL Editor
- Copia el contenido de `supabase/migrations/001_initial_schema.sql`
- Ejecuta el script

### Paso 3: Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Payment Gateways - Panama
YAPPY_API_KEY=tu_yappy_api_key
YAPPY_MERCHANT_ID=tu_yappy_merchant_id
YAPPY_SECRET_KEY=tu_yappy_secret_key
YAPPY_CALLBACK_URL=https://tu-dominio.com/api/public/payments/yappy/callback

PAGUELOFACIL_API_KEY=tu_paguelofacil_api_key
PAGUELOFACIL_WEBHOOK_URL=https://tu-dominio.com/api/public/payments/paguelofacil/webhook

TILOPAY_API_KEY=tu_tilopay_api_key
TILOPAY_WEBHOOK_URL=https://tu-dominio.com/api/public/payments/tilopay/webhook

PAYU_MERCHANT_ID=tu_payu_merchant_id
PAYU_API_KEY=tu_payu_api_key
PAYU_API_LOGIN=tu_payu_api_login
PAYU_WEBHOOK_URL=https://tu-dominio.com/api/public/payments/payu/webhook

BANESCO_API_KEY=tu_banesco_api_key
BANESCO_WEBHOOK_URL=https://tu-dominio.com/api/public/payments/banesco/webhook

# Resend Email Service Configuration
# Get your API key from https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key_here
# For testing/development, you can use: onboarding@resend.dev (no domain verification needed)
# For production, use a verified domain email like: noreply@pimetransport.com
RESEND_FROM_EMAIL=onboarding@resend.dev

# App Configuration
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
ITBMS_RATE=0.07
CURRENCY=USD

# PWA
NEXT_PUBLIC_PWA_ENABLED=true
```

### Paso 4: Configurar Row Level Security (RLS)

Las políticas RLS ya están incluidas en la migración, pero puedes verificarlas en:
- Supabase Dashboard → Authentication → Policies

### Paso 5: Generar tipos de TypeScript

```bash
npm run generate-types
```

Esto generará los tipos de TypeScript desde tu esquema de Supabase.

## 3. Configuración de Vercel (Opcional)

1. Conecta tu repositorio de GitHub con Vercel
2. Agrega las variables de entorno en Vercel Dashboard
3. Deploy automático en cada push a main

## 4. Próximos pasos

- [ ] Configurar credenciales de pasarelas de pago
- [ ] Completar implementaciones de APIs de pago
- [ ] Personalizar UI/UX
- [ ] Agregar tests
- [ ] Configurar dominio personalizado

