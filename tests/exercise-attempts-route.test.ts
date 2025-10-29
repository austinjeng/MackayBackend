import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AttemptOutcome, Prisma } from '@prisma/client';
import type { ExerciseAttemptsRouteDeps } from '@/app/api/patients/exercise-attempts/route';

test('exercise attempts route creates attempts and ensures session hierarchy', async () => {
  const {
    createExerciseAttemptsHandler,
  } = await import('@/app/api/patients/exercise-attempts/route');

  const attemptsPayload = [
    {
      startedAt: '2025-10-10T10:00:01Z',
      endedAt: '2025-10-10T10:00:03Z',
      outcome: 'success' as AttemptOutcome,
      data: { angleDeg: 92.5 },
    },
    {
      startedAt: '2025-10-10T10:05:01Z',
      outcome: 'fail' as AttemptOutcome,
    },
  ];

  const createManyCalls: Prisma.ExerciseAttemptCreateManyInput[][] = [];

  const handler = createExerciseAttemptsHandler({
    authenticateRequest: async () => ({ patientId: 'patient-1' }),
    ensureSession: async (patientId, date) => {
      assert.equal(patientId, 'patient-1');
      assert.equal(date.toISOString(), '2025-10-10T10:00:01.000Z');
      return {
        id: 101,
        patientId,
        sessionDate: new Date('2025-10-10T00:00:00.000Z'),
        startedAt: date,
        endedAt: null,
        status: 'open',
        createdAt: date,
        updatedAt: date,
      };
    },
    ensureSessionExercise: async (sessionId, exerciseTypeId) => {
      assert.equal(sessionId, 101);
      assert.equal(exerciseTypeId, 11);
      return {
        id: 202,
        sessionId,
        exerciseTypeId,
        status: 'open',
        startedAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
    prismaClient: {
      exerciseType: {
        findUnique: async ({ where: { code } }: any) => {
          assert.equal(code, 'alternating_knees');
          return { id: 11, code, name: 'Alternating Knees' };
        },
      },
      rehabSessionExercise: {
        update: async ({ where: { id }, data: { startedAt } }: any) => {
          assert.equal(id, 202);
          assert.ok(startedAt instanceof Date);
          return {
            id,
            sessionId: 101,
            exerciseTypeId: 11,
            status: 'open',
            startedAt,
            endedAt: null,
            createdAt: startedAt,
            updatedAt: startedAt,
          };
        },
      },
      exerciseAttempt: {
        createMany: async ({ data }: Prisma.ExerciseAttemptCreateManyArgs) => {
          createManyCalls.push(data as Prisma.ExerciseAttemptCreateManyInput[]);
          return { count: (data as Prisma.ExerciseAttemptCreateManyInput[]).length };
        },
      },
    } as ExerciseAttemptsRouteDeps['prismaClient'],
  });

  const response = await handler(
    new Request('http://test.local/api/patients/exercise-attempts', {
      method: 'POST',
      body: JSON.stringify({
        exerciseCode: 'alternating_knees',
        sessionDate: '2025-10-10T00:00:00Z',
        attempts: attemptsPayload,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );

  assert.equal(response.status, 201);

  const body = await response.json();
  assert.equal(body.sessionId, 101);
  assert.equal(body.sessionExerciseId, 202);
  assert.equal(body.count, 2);
  assert.equal(createManyCalls.length, 1);
  assert.equal(createManyCalls[0].length, 2);
});

test('exercise attempts route returns 400 when exerciseCode is invalid', async () => {
  const {
    createExerciseAttemptsHandler,
  } = await import('@/app/api/patients/exercise-attempts/route');

  const handler = createExerciseAttemptsHandler({
    authenticateRequest: async () => ({ patientId: 'patient-1' }),
    ensureSession: async () => {
      throw new Error('should not be called');
    },
    ensureSessionExercise: async () => {
      throw new Error('should not be called');
    },
    prismaClient: {
      exerciseType: {
        findUnique: async () => null,
      },
    } as any,
  });

  const response = await handler(
    new Request('http://test.local/api/patients/exercise-attempts', {
      method: 'POST',
      body: JSON.stringify({
        exerciseCode: 'unknown',
        attempts: [
          {
            startedAt: '2025-10-10T10:00:01Z',
            outcome: 'success',
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, 'Invalid exerciseCode.');
});
