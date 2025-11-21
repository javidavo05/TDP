<!-- ac368155-833b-4282-abd6-158d6db9c7b0 1410ab93-0e4f-495c-9b02-e45eda837696 -->
# Fix Supabase Cookie API Issues

## Problema

El archivo `src/lib/supabase/server.ts` usa `getAll()` y `setAll()` que no existen en la API de cookies de Supabase SSR. La API correcta usa `get()`, `set()`, y `remove()`.

## Solución

1. **Arreglar `src/lib/supabase/server.ts`**:

- Reemplazar `getAll()` con `get(name)` que retorna `cookieStore.get(name)?.value`
- Reemplazar `setAll()` con `set(name, value, options)` que usa `cookieStore.set(name, value, options)`
- Agregar `remove(name, options)` que usa `cookieStore.set(name, "", { ...options, maxAge: 0 })`
- Esto debe ser consistente con la implementación en `middleware.ts`

2. **Verificar consistencia**:

- Revisar que `middleware.ts` y `server.ts` usen la misma API
- Asegurar que ambos archivos manejen cookies de forma compatible

3. **Verificar otros archivos**:

- Buscar cualquier otro uso de `createServerClient` con configuración de cookies personalizada
- Asegurar que todos usen la API correcta

## Archivos a modificar

- `src/lib/supabase/server.ts`: Actualizar a la API correcta de cookies

### To-dos

- [ ] Review realtime adapter + interface
- [ ] Rework subscribe typing and payload guards
- [ ] Search for other realtime usages to align
- [ ] Run local type check before pushing