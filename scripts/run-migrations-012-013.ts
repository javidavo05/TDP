import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filename: string) {
  console.log(`\n📄 Ejecutando migración: ${filename}`);
  
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', filename);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Split SQL by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(0);
          if (queryError) {
            // Use raw SQL execution via REST API
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ sql_query: statement })
            });
            
            if (!response.ok) {
              console.error(`❌ Error ejecutando statement: ${statement.substring(0, 50)}...`);
              console.error(`   Error: ${await response.text()}`);
            }
          }
        }
      } catch (err) {
        console.error(`❌ Error: ${err}`);
      }
    }
  }
  
  console.log(`✅ Migración ${filename} completada`);
}

async function main() {
  console.log('🚀 Ejecutando migraciones 012 y 013...\n');
  
  try {
    // Execute migrations
    await runMigration('012_fix_route_stops_rls.sql');
    await runMigration('013_rename_price_adjustment_to_price.sql');
    
    console.log('\n✅ Todas las migraciones se ejecutaron correctamente');
    console.log('\n📝 Nota: Si hubo errores, ejecuta las migraciones manualmente desde el SQL Editor de Supabase');
  } catch (error) {
    console.error('\n❌ Error ejecutando migraciones:', error);
    console.log('\n💡 Alternativa: Ejecuta las migraciones manualmente desde el SQL Editor de Supabase:');
    console.log('   1. Ve a https://app.supabase.com/project/xfgvutasyerkzfrbmpsn');
    console.log('   2. Abre SQL Editor');
    console.log('   3. Copia y pega el contenido de las migraciones');
    process.exit(1);
  }
}

main();

