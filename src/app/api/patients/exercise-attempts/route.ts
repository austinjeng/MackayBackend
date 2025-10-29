import { NextResponse } from 'next/server';
import { Prisma, AttemptOutcome } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/apiAuth';
import {
  ensureDailySession,
  ensureSessionExercise,
  normalizeToDay,
} from '@/lib/rehabSessions';

const allowedOutcomes: AttemptOutcome[] = ['success', 'fail', 'invalid'];

type ExerciseAttemptPayload = {
  startedAt: unknown;
  endedAt?: unknown;
  outcome: unknown;
  data?: Prisma.InputJsonValue;
};

type UploadPayload = {
  sessionDate?: unknown;
  exerciseCode?: unknown;
  attempts?: ExerciseAttemptPayload[];
};

export type ExerciseAttemptsRouteDeps = {
  prismaClient: typeof prisma;
  authenticateRequest: typeof authenticateApiRequest;
  ensureSession: typeof ensureDailySession;
  ensureSessionExercise: typeof ensureSessionExercise;
};

const defaultDeps: ExerciseAttemptsRouteDeps = {
  prismaClient: prisma,
  authenticateRequest: authenticateApiRequest,
  ensureSession: ensureDailySession,
  ensureSessionExercise,
};

function isAttemptOutcome(value: unknown): value is AttemptOutcome {
  return typeof value === 'string' && (allowedOutcomes as string[]).includes(value);
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function createExerciseAttemptsHandler(
  deps: ExerciseAttemptsRouteDeps = defaultDeps,
) {
  const { prismaClient, authenticateRequest, ensureSession, ensureSessionExercise: ensureExercise } =
    deps;

  return async function POST(request: Request) {
    const authResult = await authenticateRequest(request);

    if ('response' in authResult) {
      return authResult.response;
    }

    let payload: UploadPayload;

    try {
      payload = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
      }
      throw error;
    }

    const { exerciseCode, sessionDate, attempts } = payload;

    if (typeof exerciseCode !== 'string' || exerciseCode.trim().length === 0) {
      return NextResponse.json({ error: 'exerciseCode is required.' }, { status: 400 });
    }

    if (!Array.isArray(attempts) || attempts.length === 0) {
      return NextResponse.json({ error: 'attempts must be a non-empty array.' }, { status: 400 });
    }

    const patientId = authResult.patientId;

    const exerciseType = await prismaClient.exerciseType.findUnique({
      where: { code: exerciseCode },
    });

    if (!exerciseType) {
      return NextResponse.json({ error: 'Invalid exerciseCode.' }, { status: 400 });
    }

    let earliestStartedAt: Date | null = null;

    const parsedAttempts: {
      startedAt: Date;
      endedAt: Date | null;
      outcome: AttemptOutcome;
      data: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
    }[] = [];

    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      const startedAt = parseIsoDate(attempt?.startedAt);

      if (!startedAt) {
        return NextResponse.json(
          { error: `attempts[${index}].startedAt must be an ISO8601 timestamp.` },
          { status: 400 },
        );
      }

      const endedAtValue = attempt?.endedAt;
      let endedAt: Date | null = null;

      if (endedAtValue !== undefined && endedAtValue !== null) {
        const parsedEndedAt = parseIsoDate(endedAtValue);
        if (!parsedEndedAt) {
          return NextResponse.json(
            { error: `attempts[${index}].endedAt must be an ISO8601 timestamp when provided.` },
            { status: 400 },
          );
        }
        endedAt = parsedEndedAt;
      }

      if (!isAttemptOutcome(attempt?.outcome)) {
        return NextResponse.json(
          { error: `attempts[${index}].outcome must be one of: ${allowedOutcomes.join(', ')}.` },
          { status: 400 },
        );
      }

      if (!earliestStartedAt || startedAt < earliestStartedAt) {
        earliestStartedAt = startedAt;
      }

      parsedAttempts.push({
        startedAt,
        endedAt,
        outcome: attempt.outcome,
        data: attempt?.data ?? Prisma.JsonNull,
      });
    }

    const sessionAnchorDate = sessionDate ? parseIsoDate(sessionDate) : earliestStartedAt;

    if (!sessionAnchorDate) {
      return NextResponse.json(
        { error: 'sessionDate must be a valid ISO8601 date string when provided.' },
        { status: 400 },
      );
    }

    if (!earliestStartedAt) {
      return NextResponse.json(
        { error: 'attempts must include at least one item with a valid startedAt timestamp.' },
        { status: 400 },
      );
    }

    const normalizedSessionDate = normalizeToDay(sessionAnchorDate);

    if (normalizeToDay(earliestStartedAt).getTime() !== normalizedSessionDate.getTime()) {
      return NextResponse.json(
        { error: 'attempt timestamps must fall on the same day as sessionDate.' },
        { status: 400 },
      );
    }

    const rehabSession = await ensureSession(patientId, earliestStartedAt);

    if (rehabSession.sessionDate.getTime() !== normalizedSessionDate.getTime()) {
      return NextResponse.json(
        { error: 'Conflicting sessionDate for the provided attempts.' },
        { status: 400 },
      );
    }

    let sessionExercise = await ensureExercise(rehabSession.id, exerciseType.id);

    if (!sessionExercise.startedAt || sessionExercise.startedAt > earliestStartedAt) {
      sessionExercise = await prismaClient.rehabSessionExercise.update({
        where: { id: sessionExercise.id },
        data: { startedAt: earliestStartedAt },
      });
    }

    const dataToCreate = parsedAttempts.map((attempt) => ({
      sessionExerciseId: sessionExercise.id,
      startedAt: attempt.startedAt,
      endedAt: attempt.endedAt,
      outcome: attempt.outcome,
      data: attempt.data ?? Prisma.JsonNull,
    }));

    try {
      const result = await prismaClient.exerciseAttempt.createMany({
        data: dataToCreate,
      });

      return NextResponse.json(
        {
          sessionId: rehabSession.id,
          sessionExerciseId: sessionExercise.id,
          count: result.count,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error('Error creating exercise attempts:', error);

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid session or exercise reference.' },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

export const POST = createExerciseAttemptsHandler();
