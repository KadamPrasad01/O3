const prisma = require("../src/lib/prisma");

async function main() {
  console.log("Enforcing RLS on connection user by disabling BYPASSRLS attribute...");
  await prisma.$executeRawUnsafe(`ALTER ROLE postgres NOBYPASSRLS;`);
  console.log("BYPASSRLS disabled successfully for 'postgres' role!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
