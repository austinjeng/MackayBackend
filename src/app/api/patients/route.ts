import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/apiAuth';

// Dependency Injection
type PatientsRouteDeps = {
  authenticateRequest: typeof authenticateApiRequest;
  prismaClient: typeof prisma;
};

const defaultDeps: PatientsRouteDeps = {
  authenticateRequest: authenticateApiRequest,
  prismaClient: prisma,
};

export function createPatientsHandler(
  deps: PatientsRouteDeps = defaultDeps,
) {
  const { authenticateRequest, prismaClient } = deps;

  return async function GET(request: Request) {
    const authResult = await authenticateRequest(request);

    //驗證失敗
    if ('response' in authResult) {
      return authResult.response;
    }

    const { patientId } = authResult;

    try {
      const patient = await prismaClient.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      return NextResponse.json(patient);
    } catch (error) {
      console.error('Error fetching patients:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

export const GET = createPatientsHandler();
