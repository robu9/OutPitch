import { prisma } from "@outpitch/db";

async function main() {
  const user = await prisma.user.findFirst({ include: { profile: true } });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

main();
