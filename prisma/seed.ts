
import { PrismaClient, Gender } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const patient1 = await prisma.patient.create({
    data: {
      name: 'John Doe',
      gender: Gender.MALE,
      age: 30,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Jane Smith',
      gender: Gender.FEMALE,
      age: 25,
    },
  });

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
