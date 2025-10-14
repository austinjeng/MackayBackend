import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface AttemptsApiRouteProps {
  params: {
    sessionId: string;
    sessionExerciseId: string;
  };
}

// The request body will be an array of attempt objects
interface AttemptPayload {
  startedAt: string; // ISO 8601 date string
  endedAt?: string; // ISO 8601 date string
  outcome: 'success' | 'fail' | 'invalid';
  data?: Prisma.InputJsonValue;
}

export async function POST(request: Request, { params }: AttemptsApiRouteProps) {
  const { sessionExerciseId } = params;

  try {
    const body: { attempts: AttemptPayload[] } = await request.json();
    const { attempts } = body;

    // --- Validation ---
    if (!attempts || !Array.isArray(attempts) || attempts.length === 0) {
      return NextResponse.json({ error: 'Request body must be an array of attempts and cannot be empty.' }, { status: 400 });
    }

    // Basic validation for each attempt object
    for (const attempt of attempts) {
      if (!attempt.startedAt || !attempt.outcome) {
        return NextResponse.json({ error: 'Each attempt must have a startedAt and outcome.' }, { status: 400 });
      }
    }

    // --- Data Transformation ---
    const dataToCreate = attempts.map(attempt => ({
      sessionExerciseId: parseInt(sessionExerciseId),
      startedAt: new Date(attempt.startedAt),
      endedAt: attempt.endedAt ? new Date(attempt.endedAt) : null,
      outcome: attempt.outcome,
      data: attempt.data || Prisma.JsonNull,
    }));

    // --- Database Operation ---
    const result = await prisma.exerciseAttempt.createMany({
      data: dataToCreate,
    });

    // Return the count of created records
    return NextResponse.json({ count: result.count }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Error creating exercise attempts:', error);

    // Handle potential JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }

    // Handle Prisma-specific errors, e.g., foreign key violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') { // Foreign key constraint failed
        return NextResponse.json(
          { error: `Invalid sessionExerciseId: The specified session exercise does not exist.` },
          { status: 400 }
        );
      }
    }

    // Generic server error
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
