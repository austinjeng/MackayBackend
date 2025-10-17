import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type AuthSuccess = {
  patientId: string;
};

type AuthFailure = {
  response: NextResponse;
};

export async function authenticateApiRequest(request: Request): Promise<AuthSuccess | AuthFailure> {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('X-API-Key');

  if (!apiKey) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized: API key is required.' },
        { status: 401 }
      ),
    };
  }

  const patient = await prisma.patient.findUnique({
    where: { apiKey },
    select: { id: true },
  });

  if (!patient) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized: Invalid API key.' },
        { status: 401 }
      ),
    };
  }

  return { patientId: patient.id };
}
