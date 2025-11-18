# 🚀 Ejecutar Migraciones de Supabase

## ✅ Configuración Verificada

Tu configuración está lista:
- ✅ Variables de entorno configuradas
- ✅ Contraseña actualizada
- ✅ Archivo de migración listo (413 líneas)

## 📋 Opción 1: SQL Editor (RECOMENDADO - Más fácil)

### Pasos:

1. **Abre tu proyecto en Supabase:**
   - Ve a: https://supabase.com/dashboard/project/xfgvutasyerkzfrbmpsn
   - O directamente: https://app.supabase.com/project/xfgvutasyerkzfrbmpsn

2. **Abre el SQL Editor:**
   - En el menú lateral izquierdo, busca "SQL Editor"
   - Click en "SQL Editor"

3. **Crea una nueva query:**
   - Click en el botón "New query" o el ícono "+"

4. **Copia el contenido de la migración:**
   - Abre el archivo: `supabase/migrations/001_initial_schema.sql`
   - Selecciona TODO el contenido (Cmd+A o Ctrl+A)
   - Copia (Cmd+C o Ctrl+C)

5. **Pega en el SQL Editor:**
   - Pega el contenido en el editor de Supabase
   - Verifica que se haya pegado todo (debería tener ~413 líneas)

6. **Ejecuta la migración:**
   - Click en el botón "Run" (o presiona `Ctrl+Enter` / `Cmd+Enter`)
   - Espera a que termine (puede tomar 10-30 segundos)

7. **Verifica el resultado:**
   - Deberías ver un mensaje de "Success" o "Success. No rows returned"
   - Si hay errores, aparecerán en rojo

## 📋 Opción 2: Usando psql (Si está instalado)

Si tienes PostgreSQL client instalado, puedes ejecutar:

```bash
./scripts/run-migrations.sh
```

O manualmente:

```bash
psql "postgresql://postgres.xfgvutasyerkzfrbmpsn:Th3m0stw@nt3d@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -f supabase/migrations/001_initial_schema.sql
```

## ✅ Verificar que funcionó

Después de ejecutar las migraciones:

1. **Ve a Table Editor en Supabase:**
   - En el menú lateral, busca "Table Editor"
   - Deberías ver todas estas tablas:
     - ✅ users
     - ✅ bus_owners
     - ✅ buses
     - ✅ bus_presets
     - ✅ routes
     - ✅ route_stops
     - ✅ trips
     - ✅ seats
     - ✅ tickets
     - ✅ payments
     - ✅ pos_terminals
     - ✅ pos_display_sessions
     - ✅ gps_logs
     - ✅ daily_bus_revenue
     - ✅ occupancy_metrics
     - ✅ route_usage

2. **Verifica las políticas RLS:**
   - Ve a "Authentication" → "Policies"
   - Deberías ver políticas para cada tabla

## 🧪 Probar la conexión

Después de verificar las tablas:

```bash
npm run dev
```

Abre http://localhost:3000 y verifica que no haya errores en la consola del navegador.

## 🆘 Si hay errores

### Error: "relation already exists"
- Algunas tablas ya existen
- Esto es normal si ejecutaste la migración antes
- Puedes ignorar estos errores o eliminar las tablas existentes

### Error: "permission denied"
- Verifica que la contraseña en `.env.local` sea correcta
- Verifica que el usuario tenga permisos

### Error: "extension does not exist"
- Algunas extensiones pueden no estar disponibles
- Comenta las líneas de extensiones si es necesario:
  ```sql
  -- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  -- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  ```

## 📝 Notas Importantes

- ⚠️ **NO ejecutes la migración dos veces** sin verificar primero qué tablas existen
- ✅ Las políticas RLS se crean automáticamente con la migración
- ✅ Los triggers para `updated_at` se crean automáticamente
- ✅ Todos los índices se crean automáticamente

## 🎉 Siguiente Paso

Una vez que las migraciones estén ejecutadas:
1. Genera los tipos de TypeScript (opcional pero recomendado)
2. Prueba la aplicación localmente
3. Configura las pasarelas de pago cuando estés listo

