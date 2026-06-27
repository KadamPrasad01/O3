const prisma = require("./lib/prisma");

async function main() {
  console.log("Connecting to the database and querying 'File' table...");
  const files = await prisma.file.findMany();
  console.log(`Database query successful! Files count in database: ${files.length}`);
}

main()
  .catch((e) => {
    console.error("Database query failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });