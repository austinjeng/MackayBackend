import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextResponse } from 'next/server';
import type prisma from '@/lib/prisma';

test('patients route returns the authenticated patient record', async () => {
  const { createPatientsHandler } = await import('@/app/api/patients/route');
  const handler = createPatientsHandler({
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
  });

  const response = await handler(new Request('http://test.local/api/patients'));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.id, 'patient-1');
  assert.equal(body.name, 'Alice');
});

test('patients route forwards authentication failures', async () => {
  const { createPatientsHandler } = await import('@/app/api/patients/route');
  const authFailureResponse = NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 },
  );

  const handler = createPatientsHandler({
    authenticateRequest: async () => ({ response: authFailureResponse }),
    prismaClient: {
      patient: {
        findUnique: async () => {
          throw new Error('Should not be called');
        },
      },
    } as unknown as typeof prisma,
  });

  const response = await handler(new Request('http://test.local/api/patients'));
  assert.equal(response.status, 401);
});

test('patients route returns 404 when no record exists for patientId', async () => {
  const { createPatientsHandler } = await import('@/app/api/patients/route');
  const handler = createPatientsHandler({
    authenticateRequest: async () => ({ patientId: 'missing-patient' }),
    prismaClient: {
      patient: {
        findUnique: async () => null,
      },
    } as unknown as typeof prisma,
  });

  const response = await handler(new Request('http://test.local/api/patients'));
  assert.equal(response.status, 404);
});

test('admin patients route enforces admin role', async () => {
  const { createAdminPatientsHandler } = await import('@/app/api/admin/patients/route');
  const adminHandler = createAdminPatientsHandler({
    getSession: (async () =>
      ({
        user: { role: 'admin' },
      })) as any,
    prismaClient: {
      patient: {
        findMany: async () => [
          { id: 'patient-1', name: 'Alice' },
          { id: 'patient-2', name: 'Bob' },
        ],
      },
    } as unknown as typeof prisma,
    getAuthOptions: async () => ({}),
  });

  const adminResponse = await adminHandler();
  assert.equal(adminResponse.status, 200);

  const adminBody = await adminResponse.json();
  assert.equal(adminBody.length, 2);

  const nonAdminHandler = createAdminPatientsHandler({
    getSession: (async () => null) as any,
    prismaClient: {
      patient: {
        findMany: async () => {
          throw new Error('Should not be called');
        },
      },
    } as unknown as typeof prisma,
    getAuthOptions: async () => ({}),
  });

  const nonAdminResponse = await nonAdminHandler();
  assert.equal(nonAdminResponse.status, 403);
});
