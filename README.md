# TDP Ticketing System

Sistema completo de ticketing de transporte nacional con arquitectura backend-independiente siguiendo principios DDD.

## 🚀 Características Principales

- **Portal Público de Venta**: Búsqueda y compra de boletos online (Web y Mobile)
- **Sistema POS**: Terminales de venta física con doble pantalla
- **Gestión de Flota**: Administración completa de buses, rutas y viajes
- **Tracking GPS**: Seguimiento en tiempo real de buses
- **Pagos Panameños**: Integración con Yappy Comercial, PagueloFacil, Tilopay, PayU, Banesco
- **PWA**: Aplicación progresiva instalable en móviles
- **Realtime**: Actualización en tiempo real de disponibilidad de asientos

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (inicialmente), preparado para migración
- **Base de Datos**: Supabase PostgreSQL
- **Autenticación**: Supabase Auth
- **Realtime**: Supabase Realtime
- **Deployment**: Vercel (inicial), preparado para VPS

## 📁 Estructura del Proyecto

```
src/
  app/                    # Next.js App Router
    (public)/            # Rutas públicas de venta
    (admin)/             # Rutas de administración
    api/                  # API routes
      public/            # API pública (venta de tiquetes)
      mobile/            # API móvil
      admin/             # API administración
  domain/                # Capa de dominio (DDD)
  services/              # Lógica de negocio
  infrastructure/        # Implementaciones concretas
  lib/                   # Utilidades
  components/            # Componentes React
```

## 🚦 Roles del Sistema

1. **Pasajero**: Compra boletos, gestiona tickets
2. **Admin**: Gestión completa del sistema
3. **POS Agent**: Venta de tickets en terminales físicas
4. **Bus Owner**: Gestión de su flota y reportes
5. **Driver**: Tracking GPS y manifest
6. **Assistant**: Validación de tickets con QR

## 🔧 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

3. Ejecutar en desarrollo:
```bash
npm run dev
```

## 📝 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linter
- `npm run type-check` - Verificación de tipos
- `npm run generate-types` - Generar tipos de Supabase

## 🗄️ Base de Datos

El esquema de base de datos se encuentra en `supabase/migrations/`. Ejecutar migraciones en Supabase.

## 🔐 Autenticación

El sistema usa Supabase Auth con roles RBAC:
- `passenger`: Usuarios públicos
- `admin`: Administradores
- `pos_agent`: Agentes POS
- `bus_owner`: Dueños de buses
- `driver`: Conductores
- `assistant`: Asistentes de bus

## 💳 Pagos

Integración con pasarelas panameñas:
- Yappy Comercial
- PagueloFacil
- Tilopay
- PayU
- Banesco

## 📱 PWA

La aplicación es una PWA instalable. Configurar en `next.config.js` y `public/manifest.json`.

## 🚀 Deployment

### Vercel (Inicial)
```bash
vercel deploy
```

### VPS (Futuro)
El sistema está preparado para migración a VPS con Docker, Postgres, Redis, y Socket.IO.

## 📄 Licencia

Privado - TDP Ticketing System

