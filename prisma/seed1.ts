import { PrismaClient } from '@prisma/client';

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

  await prisma.rehabSession.deleteMany();
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
