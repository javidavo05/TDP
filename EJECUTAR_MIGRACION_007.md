# 🚀 Ejecutar Migración 007 - Sistema de Caja Registradora POS

## ⚠️ IMPORTANTE

Esta migración agrega las columnas necesarias para el sistema de caja registradora POS, incluyendo:
- `current_cash_amount` en `pos_terminals`
- `physical_location` en `pos_terminals`
- Tablas `pos_cash_sessions` y `pos_transactions`

## 📋 Pasos para Ejecutar

### 1. Abre tu proyecto en Supabase:
   - Ve a: https://supabase.com/dashboard/project/xfgvutasyerkzfrbmpsn
   - O directamente: https://app.supabase.com/project/xfgvutasyerkzfrbmpsn

### 2. Abre el SQL Editor:
   - En el menú lateral izquierdo, busca "SQL Editor"
   - Click en "SQL Editor"

### 3. Crea una nueva query:
   - Click en el botón "New query" o el ícono "+"

### 4. Copia el contenido de la migración:
   - Abre el archivo: `supabase/migrations/007_pos_cash_register_system.sql`
   - Selecciona TODO el contenido (Cmd+A o Ctrl+A)
   - Copia (Cmd+C o Ctrl+C)

### 5. Pega en el SQL Editor:
   - Pega el contenido en el editor de Supabase
   - Verifica que se haya pegado todo (debería tener ~154 líneas)

### 6. Ejecuta la migración:
   - Click en el botón "Run" (o presiona `Ctrl+Enter` / `Cmd+Enter`)
   - Espera a que termine (puede tomar 10-30 segundos)

### 7. Verifica el resultado:
   - Deberías ver un mensaje de "Success" o "Success. No rows returned"
   - Si hay errores, aparecerán en rojo

## ✅ Verificar que funcionó

Después de ejecutar la migración:

1. **Ve a Table Editor en Supabase:**
   - En el menú lateral, busca "Table Editor"
   - Selecciona la tabla `pos_terminals`
   - Verifica que tenga estas columnas:
     - ✅ `physical_location`
     - ✅ `location_code`
     - ✅ `initial_cash_amount`
     - ✅ `current_cash_amount`
     - ✅ `is_open`
     - ✅ `last_opened_at`
     - ✅ `last_closed_at`
     - ✅ `opened_by_user_id`

2. **Verifica las nuevas tablas:**
   - Deberías ver `pos_cash_sessions`
   - Deberías ver `pos_transactions`

## 🆘 Si hay errores

### Error: "column already exists"
- Algunas columnas ya existen
- Esto es normal si ejecutaste parte de la migración antes
- Puedes ignorar estos errores

### Error: "relation already exists"
- Las tablas ya existen
- Esto es normal si ejecutaste la migración antes
- Puedes ignorar estos errores

## 🎉 Siguiente Paso

Una vez que la migración esté ejecutada:
1. Recarga la página de terminales en tu aplicación
2. Intenta crear una nueva terminal
3. Debería funcionar sin errores

