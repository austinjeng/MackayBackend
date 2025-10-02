
import { PrismaClient, Gender } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Clean up existing data
  await prisma.liftLegExercise.deleteMany();
  await prisma.patient.deleteMany();

  const patient1 = await prisma.patient.create({
    data: {
      name: '王曉明',
      gender: Gender.MALE,
      age: 56,
    },
  });

  const exercise1 = await prisma.liftLegExercise.create({
    data: {
      patientId: patient1.id,
      correctCount: 10,
      incorrectCount: 2,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: '李曉強',
      gender: Gender.FEMALE,
      age: 64,
    },
  });

  console.log(`Created exercise with ID: ${exercise1.id}`);
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
