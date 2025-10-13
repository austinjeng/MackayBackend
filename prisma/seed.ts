import { PrismaClient, AttemptOutcome } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate random numbers in a range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper function to create a timestamp
const timeNow = () => new Date();

async function main() {
  console.log('Seeding database...');

  // 1. Clean up existing data and reset all sequences
  console.log('Truncating tables and resetting sequences...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "運動紀錄", "會話運動", "運動會話", "病患", "運動類型" RESTART IDENTITY;');

  // 2. Create Exercise Types
  const alternatingKnees = await prisma.exerciseType.create({
    data: {
      code: 'alternating_knees',
      name: '雙膝交替抬高(側)',
    },
  });

  const heelToToe = await prisma.exerciseType.create({
    data: {
      code: 'heel_to_toe_walk',
      name: '腳尖對腳跟',
    },
  });

  const sideSteps = await prisma.exerciseType.create({
    data: {
      code: 'side_steps',
      name: '左右跨步',
    },
  });

  const squat = await prisma.exerciseType.create({
    data: {
      code: 'squat',
      name: '深蹲',
    },
  });

  const tiptoeStand = await prisma.exerciseType.create({
    data: {
      code: 'tiptoe_stand',
      name: '墊腳尖站立',
    },
  });

  console.log('Created exercise types.');

  // 3. Create a Patient
  const patient = await prisma.patient.create({
    data: {
      id: 'clxsm1o2w000008l4c1g2h3j4', // Example CUID
      name: '王大明',
      dob: new Date('1950-01-15T00:00:00.000Z'),
    },
  });

  console.log(`Created patient: ${patient.name}`);

  // 4. Create a Session
  const session = await prisma.session.create({
    data: {
      patientId: patient.id,
      startedAt: timeNow(),
      status: 'open',
    },
  });

  console.log(`Created session ${session.id} for patient ${patient.name}.`);

  // 5. Create SessionExercises
  const sessionExercises = await Promise.all([
    prisma.sessionExercise.create({ data: { sessionId: session.id, exerciseTypeId: alternatingKnees.id } }),
    prisma.sessionExercise.create({ data: { sessionId: session.id, exerciseTypeId: heelToToe.id } }),
    prisma.sessionExercise.create({ data: { sessionId: session.id, exerciseTypeId: sideSteps.id } }),
    prisma.sessionExercise.create({ data: { sessionId: session.id, exerciseTypeId: squat.id } }),
    prisma.sessionExercise.create({ data: { sessionId: session.id, exerciseTypeId: tiptoeStand.id } }),
  ]);

  console.log('Created session exercises.');

  // 6. Create ExerciseAttempts with appropriate JSON data and timestamps

  // Attempts for Alternating Knees
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: sessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(70, 110) } },
      { sessionExerciseId: sessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg:random(70, 110)  } },
      { sessionExerciseId: sessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(55, 69) } },
    ],
  });

  // Attempts for Heel-to-Toe Walk (example with steps)
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: sessionExercises[1].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { steps: 10} },
      { sessionExerciseId: sessionExercises[1].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { steps: 10} },
      { sessionExerciseId: sessionExercises[1].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { steps: 10} },

    ],
  });

  // Attempts for Side Steps
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: sessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 132) } },
      { sessionExerciseId: sessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(102, 108) } },
      { sessionExerciseId: sessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 132)} },
      { sessionExerciseId: sessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(132, 138) } },


    ],
  });

  // Attempts for Squat
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: sessionExercises[3].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 135) } },
      { sessionExerciseId: sessionExercises[3].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg:random(135, 162) } },
      { sessionExerciseId: sessionExercises[3].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 135) } },
    ],
  });

  // Attempts for Tiptoe Stand
  await prisma.exerciseAttempt.createMany({
    data: [
      {
        sessionExerciseId: sessionExercises[4].id,
        startedAt: timeNow(),
        endedAt: timeNow(),
        outcome: 'success',
        data: { angleDeg: random(20, 45), holdSeconds: random(3,6) },
      },
      {
        sessionExerciseId: sessionExercises[4].id,
        startedAt: timeNow(),
        endedAt: timeNow(),
        outcome: 'fail',
        data: { angleDeg: random(5,15), holdSeconds: random(0, 3) },
      },
    ],
  });

  console.log('Created exercise attempts.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });