import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const patients = [
  { name: '王大明', id:"12345",dob: new Date('1955-03-12') },
  { name: '陳美玲', id:"123456",dob: new Date('1962-07-25') },
  { name: '李建華', id:"123451234",dob: new Date('1970-11-08') },
  { name: '林雅雯', id:"12345123",dob: new Date('1984-02-17') },
  { name: '張國榮', id:"12345123123",dob: new Date('1990-09-30') },
];

async function main() {
  console.log('Seeding minimal patient dataset...');

  await prisma.exerciseAttempt.deleteMany();
  await prisma.rehabSessionExercise.deleteMany();
  await prisma.rehabSession.deleteMany();
  await prisma.exerciseType.deleteMany();
  await prisma.rehabSession.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patient.deleteMany();

  await prisma.patient.createMany({
    data: patients,
  });

  const createdPatients = await prisma.patient.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log('Created patients:');
  createdPatients.forEach((patient) => {
    console.log(`- ${patient.name} (ID: ${patient.id}, API Key: ${patient.apiKey})`);
  });

  // Create Exercise Types
  const exerciseTypes = await prisma.$transaction([
    prisma.exerciseType.create({
      data: { code: 'alternating_knees', name: '雙膝交替抬高(側)' },
    }),
    prisma.exerciseType.create({
      data: { code: 'heel_to_toe_walk', name: '腳尖對腳跟' },
    }),
    prisma.exerciseType.create({
      data: { code: 'side_steps', name: '左右跨步' },
    }),
    prisma.exerciseType.create({
      data: { code: 'squat', name: '深蹲' },
    }),
    prisma.exerciseType.create({
      data: { code: 'tiptoe_stand', name: '墊腳尖站立' },
    }),
  ]);

  console.log('Created exercise types.');

  // Create sample sessions for each patient
  const today = new Date();
  const startOfDayUtc = (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const addMinutes = (date: Date, minutes: number) =>
    new Date(date.getTime() + minutes * 60 * 1000);

  for (const patient of createdPatients) {
    for (let offset = 0; offset < 3; offset += 1) {
      const sessionDate = new Date(today);
      sessionDate.setUTCDate(sessionDate.getUTCDate() - offset);

      const sessionStart = addMinutes(startOfDayUtc(sessionDate), 9 * 60 + 30); // 09:30 UTC

      const session = await prisma.rehabSession.create({
        data: {
          patientId: patient.id,
          sessionDate: startOfDayUtc(sessionDate),
          startedAt: sessionStart,
          status: 'open',
        },
      });

      const selectedExercises = exerciseTypes.slice(0, 3 + (offset % 2));

      for (let index = 0; index < selectedExercises.length; index += 1) {
        const exerciseType = selectedExercises[index];
        const exerciseStart = addMinutes(sessionStart, index * 20);

        const sessionExercise = await prisma.rehabSessionExercise.create({
          data: {
            sessionId: session.id,
            exerciseTypeId: exerciseType.id,
            status: 'open',
            startedAt: exerciseStart,
          },
        });

        await prisma.exerciseAttempt.createMany({
          data: [
            {
              sessionExerciseId: sessionExercise.id,
              startedAt: exerciseStart,
              endedAt: addMinutes(exerciseStart, 2),
              outcome: 'success',
              data: { angleDeg: 95 + Math.random() * 5 },
            },
            {
              sessionExerciseId: sessionExercise.id,
              startedAt: addMinutes(exerciseStart, 5),
              endedAt: addMinutes(exerciseStart, 7),
              outcome: 'fail',
              data: { angleDeg: 80 + Math.random() * 5 },
            },
            {
              sessionExerciseId: sessionExercise.id,
              startedAt: addMinutes(exerciseStart, 10),
              endedAt: addMinutes(exerciseStart, 12),
              outcome: 'success',
              data: { angleDeg: 92 + Math.random() * 4 },
            },
          ],
        });
      }
    }
  }

  console.log('Creating admin user...');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password', salt);

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


}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
