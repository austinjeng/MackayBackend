import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextResponse } from 'next/server';
import type prisma from '@/lib/prisma';

test('validate-key route returns patient details when API key is valid', async () => {
  const { createValidateKeyHandler } = await import('@/app/api/patients/validate-key/handler');

  const handler = createValidateKeyHandler({
    authenticateRequest: async () => ({ patientId: 'patient-1' }),
    prismaClient: {
      patient: {
        findUnique: async () => ({
          id: 'patient-1',
          name: 'Alice',
          dob: null,
        }),
      },
    } as unknown as typeof prisma,
    rateLimiter: {
      limit: async () => ({
        success: true,
        limit: 3,
        remaining: 2,
        reset: Math.floor(Date.now() / 1000) + 10,
      }),
    },
  });

  const response = await handler(new Request('http://test.local/api/patients/validate-key'));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.patient.id, 'patient-1');
  assert.equal(body.patient.name, 'Alice');
});

test('validate-key route forwards authentication failures', async () => {
  const { createValidateKeyHandler } = await import('@/app/api/patients/validate-key/handler');

  const authFailure = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const handler = createValidateKeyHandler({
    authenticateRequest: async () => ({ response: authFailure }),
    prismaClient: {
      patient: {
        findUnique: async () => {
          throw new Error('Should not be called');
        },
      },
    } as unknown as typeof prisma,
    rateLimiter: {
      limit: async () => ({
        success: true,
        limit: 3,
        remaining: 2,
        reset: Math.floor(Date.now() / 1000) + 10,
      }),
    },
  });

  const response = await handler(new Request('http://test.local/api/patients/validate-key'));
  assert.equal(response.status, 401);
});

test('validate-key route enforces rate limiting', async () => {
  const { createValidateKeyHandler } = await import('@/app/api/patients/validate-key/handler');

  const handler = createValidateKeyHandler({
    authenticateRequest: async () => {
      throw new Error('Should not be called when rate limited');
    },
    prismaClient: {
      patient: {
        findUnique: async () => {
          throw new Error('Should not be reached');
        },
      },
    } as unknown as typeof prisma,
    rateLimiter: {
      limit: async () => ({
        success: false,
        limit: 3,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 5,
      }),
    },
  });

  const response = await handler(new Request('http://test.local/api/patients/validate-key'));
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, 'Too Many Requests');
});
