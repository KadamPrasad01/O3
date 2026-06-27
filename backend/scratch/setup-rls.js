const prisma = require("../src/lib/prisma");

async function main() {
  console.log("Enabling Row Level Security (RLS) on the 'File' table...");
  
  // 1. Enable RLS
  await prisma.$executeRawUnsafe(`ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;`);
  console.log("RLS enabled successfully.");

  // 2. Force RLS (critical because our connection string uses the 'postgres' superuser/owner)
  await prisma.$executeRawUnsafe(`ALTER TABLE "File" FORCE ROW LEVEL SECURITY;`);
  console.log("RLS forced successfully.");

  // 3. Drop existing policy if it exists
  await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS file_user_policy ON "File";`);
  
  // 4. Create the policy
  await prisma.$executeRawUnsafe(`
    CREATE POLICY file_user_policy ON "File"
      USING ("userId" = current_setting('app.current_user_id', true))
      WITH CHECK ("userId" = current_setting('app.current_user_id', true));
  `);
  console.log("RLS Policy 'file_user_policy' created successfully.");
  console.log("RLS setup completed successfully!");
}

main()
  .catch((e) => {
    console.error("Failed to enable RLS:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
