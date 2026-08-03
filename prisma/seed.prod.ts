import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const exerciseTypes = [
  { code: 'alternating_knees', name: '雙膝交替抬高(側)' },
  { code: 'heel_to_toe_walk', name: '腳尖對腳跟' },
  { code: 'side_steps', name: '左右跨步' },
  { code: 'squat', name: '深蹲' },
  { code: 'tiptoe_stand', name: '墊腳尖站立' },
];

async function ensureExerciseTypes() {
  for (const exercise of exerciseTypes) {
    await prisma.exerciseType.upsert({
      where: { code: exercise.code },
      update: { name: exercise.name },
      create: exercise,
    });
  }
}

async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error('Missing ADMIN_EMAIL, ADMIN_USERNAME, or ADMIN_PASSWORD environment variables.');
  }

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  const adminDisplayName = ADMIN_NAME || 'Admin';

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: adminDisplayName },
    create: {
      name: adminDisplayName,
      email: ADMIN_EMAIL,
    },
  });

  await prisma.admin.upsert({
    where: { userId: user.id },
    update: {
      username: ADMIN_USERNAME,
      passwordHash,
    },
    create: {
      userId: user.id,
      username: ADMIN_USERNAME,
      passwordHash,
    },
  });
}

async function main() {
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_ALLOW_PROD !== 'true') {
    throw new Error('Refusing to run production seed without NODE_ENV=production or SEED_ALLOW_PROD=true.');
  }

  console.log('Seeding exercise types and admin user (production-safe, no truncation)...');
  await ensureExerciseTypes();
  await ensureAdmin();
  console.log('Production seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
