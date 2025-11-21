import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error("Please ensure .env.local contains:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedUsers() {
  console.log("🌱 Starting user seed...");

  // Create client user
  const clientEmail = "cliente@pimetransport.com";
  const clientPassword = "Cliente123!";

  try {
    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", clientEmail)
      .single();

    if (existingUser) {
      console.log(`✅ Client user already exists: ${clientEmail}`);
    } else {
      // Create client user in Auth
      const { data: clientAuth, error: clientAuthError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: clientPassword,
        email_confirm: true,
        user_metadata: {
          full_name: "Usuario Cliente",
          role: "passenger",
        },
      });

      if (clientAuthError) {
        // User might already exist in auth but not in users table
        if (clientAuthError.message.includes("already registered")) {
          console.log(`⚠️  Client user exists in auth, checking users table...`);
          // Try to sign in to get user ID
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: clientEmail,
            password: clientPassword,
          });
          if (signInData?.user) {
            // Create user record if it doesn't exist
            const { error: insertError } = await supabase.from("users").insert({
              id: signInData.user.id,
              email: clientEmail,
              role: "passenger",
              full_name: "Usuario Cliente",
              email_verified_at: new Date().toISOString(),
            });
            if (!insertError) {
              console.log(`✅ Created client user record in database`);
            }
          }
        } else {
          console.error("❌ Error creating client user:", clientAuthError.message);
        }
      } else if (clientAuth?.user) {
        console.log(`✅ Created client user: ${clientEmail}`);

        // Create user record in users table
        const { error: clientUserError } = await supabase.from("users").insert({
          id: clientAuth.user.id,
          email: clientEmail,
          role: "passenger",
          full_name: "Usuario Cliente",
          email_verified_at: new Date().toISOString(),
        });

        if (clientUserError) {
          console.error("❌ Error creating client user record:", clientUserError.message);
        } else {
          console.log(`✅ Created client user record in database`);
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Error with client user:", error?.message || error);
  }

  // Create super admin user
  const adminEmail = "admin@pimetransport.com";
  const adminPassword = "Admin123!";

  try {
    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", adminEmail)
      .single();

    if (existingUser) {
      console.log(`✅ Admin user already exists: ${adminEmail}`);
    } else {
      // Create admin user in Auth
      const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: "Super Administrador",
          role: "admin",
        },
      });

      if (adminAuthError) {
        // User might already exist in auth but not in users table
        if (adminAuthError.message.includes("already registered")) {
          console.log(`⚠️  Admin user exists in auth, checking users table...`);
          // Try to sign in to get user ID
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword,
          });
          if (signInData?.user) {
            // Create user record if it doesn't exist
            const { error: insertError } = await supabase.from("users").insert({
              id: signInData.user.id,
              email: adminEmail,
              role: "admin",
              full_name: "Super Administrador",
              email_verified_at: new Date().toISOString(),
            });
            if (!insertError) {
              console.log(`✅ Created admin user record in database`);
            }
          }
        } else {
          console.error("❌ Error creating admin user:", adminAuthError.message);
        }
      } else if (adminAuth?.user) {
        console.log(`✅ Created admin user: ${adminEmail}`);

        // Create user record in users table
        const { error: adminUserError } = await supabase.from("users").insert({
          id: adminAuth.user.id,
          email: adminEmail,
          role: "admin",
          full_name: "Super Administrador",
          email_verified_at: new Date().toISOString(),
        });

        if (adminUserError) {
          console.error("❌ Error creating admin user record:", adminUserError.message);
        } else {
          console.log(`✅ Created admin user record in database`);
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Error with admin user:", error?.message || error);
  }

  console.log("\n📋 Credentials Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("CLIENT USER:");
  console.log(`  Email: ${clientEmail}`);
  console.log(`  Password: ${clientPassword}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SUPER ADMIN:");
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✅ Seed completed!");
}

seedUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
