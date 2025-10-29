import { PrismaClient, AttemptOutcome, RehabSessionExerciseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper function to generate random numbers in a range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper function to create a timestamp
const timeNow = () => new Date();
const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

async function main() {
  console.log('Seeding database...');

  // 1. Clean up existing data and reset all sequences
  console.log('Truncating tables and resetting sequences...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User", "Account", "Session", "VerificationToken", "Admin", "運動紀錄", "會話運動", "運動會話", "病患", "運動類型" RESTART IDENTITY;');

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
      id: '454523451325345', 
      name: '王大明',
      dob: new Date('1950-01-15T00:00:00.000Z'),
    },
  });

  console.log(`Created patient: ${patient.name}`);

  const patient2 = await prisma.patient.create({
    data: {
      id: '1241352513512414', 
      name: '李相赫',
      dob: new Date('1994-01-15T00:00:00.000Z'),
    },
  });

  console.log(`Created patient: ${patient2.name}`);

  const patient3 = await prisma.patient.create({
    data: {
      id: '124234523452345245', 
      name: '非洲奇異果',
      dob: new Date('2000-01-15T00:00:00.000Z'),
    },
  });

  console.log(`Created patient: ${patient3.name}`);

  // Log the API key for the test patient
  const createdPatient = await prisma.patient.findUnique({ where: { id: patient.id } });
  if (createdPatient) {
    console.log(`
!!! IMPORTANT !!!`);
    console.log(`API Key for ${patient.name}: ${createdPatient.apiKey}`);
    console.log(`Use this key in the 'X-API-Key' header for testing.
`);
  }

  // 4. Create a Session
  const sessionStartedAt = timeNow();
  const rehabSession = await prisma.rehabSession.create({
    data: {
      patientId: patient.id,
      sessionDate: startOfUtcDay(sessionStartedAt),
      startedAt: sessionStartedAt,
      status: 'open',
    },
  });

  console.log(`Created session ${rehabSession.id} for patient ${patient.name}.`);

  // 5. Create SessionExercises
  const rehabSessionExercises = await Promise.all([
    prisma.rehabSessionExercise.create({ data: { sessionId: rehabSession.id, exerciseTypeId: alternatingKnees.id } }),
    prisma.rehabSessionExercise.create({ data: { sessionId: rehabSession.id, exerciseTypeId: heelToToe.id } }),
    prisma.rehabSessionExercise.create({ data: { sessionId: rehabSession.id, exerciseTypeId: sideSteps.id } }),
    prisma.rehabSessionExercise.create({ data: { sessionId: rehabSession.id, exerciseTypeId: squat.id } }),
    prisma.rehabSessionExercise.create({ data: { sessionId: rehabSession.id, exerciseTypeId: tiptoeStand.id } }),
  ]);

  console.log('Created session exercises.');

  // 6. Create ExerciseAttempts with appropriate JSON data and timestamps

  // Attempts for Alternating Knees
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(70, 110) } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg:random(70, 110)  } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(55, 69) } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg:random(70, 110)  } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(55, 69) } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg:random(70, 110)  } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(55, 69) } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg:random(70, 110)  } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg:random(70, 110)  } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg:random(70, 110)  } },
      { sessionExerciseId: rehabSessionExercises[0].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(55, 69) } },
    ],
  });

  // Attempts for Heel-to-Toe Walk (example with steps)
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: rehabSessionExercises[1].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { steps: 10} },
      { sessionExerciseId: rehabSessionExercises[1].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { steps: 10} },
      { sessionExerciseId: rehabSessionExercises[1].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { steps: 10} },

    ],
  });

  // Attempts for Side Steps
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: rehabSessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 132) } },
      { sessionExerciseId: rehabSessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(102, 108) } },
      { sessionExerciseId: rehabSessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 132)} },
      { sessionExerciseId: rehabSessionExercises[2].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg: random(132, 138) } },


    ],
  });

  // Attempts for Squat
  await prisma.exerciseAttempt.createMany({
    data: [
      { sessionExerciseId: rehabSessionExercises[3].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 135) } },
      { sessionExerciseId: rehabSessionExercises[3].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'fail', data: { angleDeg:random(135, 162) } },
      { sessionExerciseId: rehabSessionExercises[3].id, startedAt: timeNow(), endedAt: timeNow(), outcome: 'success', data: { angleDeg: random(108, 135) } },
    ],
  });

  // Attempts for Tiptoe Stand
  await prisma.exerciseAttempt.createMany({
    data: [
      {
        sessionExerciseId: rehabSessionExercises[4].id,
        startedAt: timeNow(),
        endedAt: timeNow(),
        outcome: 'success',
        data: { angleDeg: random(20, 45), holdSeconds: random(3,6) },
      },
      {
        sessionExerciseId: rehabSessionExercises[4].id,
        startedAt: timeNow(),
        endedAt: timeNow(),
        outcome: 'fail',
        data: { angleDeg: random(5,15), holdSeconds: random(0, 3) },
      },
    ],
  });

  console.log('Created exercise attempts.');

  // 7. Create an Admin User
  console.log('Creating admin user...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password', salt);

  const user = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@example.com',
      admin: {
        create: {
          username: 'admin',
          passwordHash,
        },
      },
    },
  });

  console.log(`Created admin user: ${user.name}`);


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
