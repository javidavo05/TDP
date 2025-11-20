# Credenciales de Prueba

Este documento contiene las credenciales de los usuarios de prueba creados para el sistema TDP Ticketing System.

## Usuario Cliente

**Email:** `cliente@tdp.com`  
**Password:** `Cliente123!`  
**Rol:** `passenger`

Este usuario puede:
- Buscar y comprar boletos
- Ver su perfil y tickets
- Gestionar sus preferencias

## Super Administrador

**Email:** `admin@tdp.com`  
**Password:** `Admin123!`  
**Rol:** `admin`

Este usuario puede:
- Acceder al dashboard administrativo
- Gestionar buses, rutas, viajes
- Ver analytics y reportes financieros
- Gestionar usuarios y terminales POS

## Ejecutar Script de Seed

Para crear estos usuarios en tu base de datos, ejecuta:

```bash
# Asegúrate de tener las variables de entorno configuradas en .env.local
npx tsx scripts/seed-users.ts
```

O si prefieres usar ts-node:

```bash
npx ts-node scripts/seed-users.ts
```

### Variables de Entorno Requeridas

Asegúrate de tener estas variables en tu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Nota de Seguridad

⚠️ **IMPORTANTE:** Estas credenciales son solo para desarrollo y pruebas. En producción:

1. Cambia todas las contraseñas
2. Usa contraseñas fuertes y únicas
3. No compartas estas credenciales públicamente
4. Considera usar un sistema de gestión de usuarios más robusto

## Acceso

- **Cliente:** Accede desde la página principal haciendo clic en "Iniciar Sesión" en el navbar
- **Admin:** Accede desde `/login` o `/dashboard` (será redirigido si no está autenticado)
