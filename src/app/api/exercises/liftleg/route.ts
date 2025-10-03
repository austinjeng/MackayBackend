import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, correctCount, incorrectCount } = body;

    // Validate that required fields are present
    if (!patientId || correctCount === undefined || incorrectCount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, correctCount, and incorrectCount are required.' },
        { status: 400 } // Bad Request
      );
    }

    // Create the new record in the database
    const newExerciseEntry = await prisma.liftLegExercise.create({
      data: {
        patientId,
        correctCount,
        incorrectCount,
      },
    });

    // Return the newly created record with a 201 status
    return NextResponse.json(newExerciseEntry, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Error creating exercise entry:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Foreign key constraint failed (e.g., patientId does not exist)
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: `Invalid patientId: The specified patient does not exist.` },
          { status: 400 } // Bad Request, as the client sent an invalid ID
        );
      }
    }

    // Generic error for other issues, like malformed JSON
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
