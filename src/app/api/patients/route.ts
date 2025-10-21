import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/apiAuth';

export async function GET(request: Request) {
  const authResult = await authenticateApiRequest(request);

  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const patients = await prisma.patient.findMany();
    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
