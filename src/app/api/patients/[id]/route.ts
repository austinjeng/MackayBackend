import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/apiAuth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateApiRequest(request);

  if ('response' in authResult) {
    return authResult.response;
  }

  const { patientId } = authResult;
  const id = params.id;

  if (patientId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        sessions: true,
      },
    });
    if (patient) {
      return NextResponse.json(patient);
    } else {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
