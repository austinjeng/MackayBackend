import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
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
