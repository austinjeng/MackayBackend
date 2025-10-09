import { PrismaClient, SessionStatus, SessionExerciseStatus, AttemptOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // 1. Clean up existing data in the correct order
  await prisma.exerciseAlternatingKneesAttempt.deleteMany();
  await prisma.sessionExercise.deleteMany();
  await prisma.session.deleteMany();
  await prisma.exerciseType.deleteMany();
  await prisma.patient.deleteMany();
  console.log('Cleaned up existing data.');

  // 2. Create ExerciseTypes
  const alternatingKnees = await prisma.exerciseType.create({
    data: {
      code: 'ALTERNATING_KNEES',
      name: '雙膝交互​抬​高(側)',
    },
  });
  console.log(`Created exercise type: ${alternatingKnees.name}`);

  // 3. Create a Patient
  const patient1 = await prisma.patient.create({
    data: {
      id: 'A123456789', // Example ID
      name: '王大明',
      dob: new Date('1968-01-15'),
    },
  });
  console.log(`Created patient: ${patient1.name}`);

  // 4. Create a Session for the Patient
  const session1 = await prisma.session.create({
    data: {
      patientId: patient1.id,
      startedAt: new Date(),
      status: SessionStatus.open,
    },
  });
  console.log(`Created session for patient ${patient1.name}`);

  // 5. Create a SessionExercise for the Session
  const sessionExercise1 = await prisma.sessionExercise.create({
    data: {
      sessionId: session1.id,
      exerciseTypeId: alternatingKnees.id,
      status: SessionExerciseStatus.open,
      startedAt: new Date(),
    },
  });
  console.log(`Added ${alternatingKnees.name} to the session.`);

  // 6. Create several ExerciseAlternatingKneesAttempt records
  await prisma.exerciseAlternatingKneesAttempt.create({
    data: {
      sessionExerciseId: sessionExercise1.id,
      startedAt: new Date(Date.now() - 10000), // 10 seconds ago
      endedAt: new Date(Date.now() - 5000),   // 5 seconds ago
      outcome: AttemptOutcome.success,
      angleDeg: 85.5,
    },
  });

  await prisma.exerciseAlternatingKneesAttempt.create({
    data: {
      sessionExerciseId: sessionExercise1.id,
      startedAt: new Date(Date.now() - 4000), // 4 seconds ago
      endedAt: new Date(Date.now() - 2000),   // 2 seconds ago
      outcome: AttemptOutcome.fail,
      angleDeg: 40.2,
    },
  });

  await prisma.exerciseAlternatingKneesAttempt.create({
    data: {
      sessionExerciseId: sessionExercise1.id,
      startedAt: new Date(Date.now() - 1000), // 1 second ago
      endedAt: new Date(),
      outcome: AttemptOutcome.success,
      angleDeg: 91.0,
    },
  });
  console.log(`Created 3 attempt records for ${alternatingKnees.name}.`);


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