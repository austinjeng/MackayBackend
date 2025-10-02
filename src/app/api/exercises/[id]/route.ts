import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const body = await request.json();
    const { correctCount, incorrectCount } = body;

    const updatedExercise = await prisma.liftLegExercise.update({
      where: { id },
      data: {
        correctCount,
        incorrectCount,
      },
    });

    return NextResponse.json(updatedExercise);
  } catch (error) {
    console.error('Error updating exercise:', error);
    // @ts-ignore
    if (error.code === 'P2025') { // Prisma error code for record not found
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
