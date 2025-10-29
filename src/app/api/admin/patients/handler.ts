import { NextResponse } from 'next/server';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import prisma from '@/lib/prisma';

export type AdminPatientsRouteDeps = {
  getSession: typeof getServerSession;
  prismaClient: typeof prisma;
  getAuthOptions: () => Promise<NextAuthOptions> | NextAuthOptions;
};

const defaultDeps: AdminPatientsRouteDeps = {
  getSession: getServerSession,
  prismaClient: prisma,
  getAuthOptions: async () => {
    const authModule = await import('@/lib/auth');
    return authModule.authOptions;
  },
};

export function createAdminPatientsHandler(
  deps: AdminPatientsRouteDeps = defaultDeps,
) {
  const { getSession, prismaClient, getAuthOptions } = deps;

  return async function GET() {
    const options = await getAuthOptions();
    const session = await getSession(options);
    const role = session?.user ? (session.user as { role?: string }).role : undefined;

    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      const patients = await prismaClient.patient.findMany({
        include: {
          sessions: true,
        },
      });

      return NextResponse.json(patients);
    } catch (error) {
      console.error('Error fetching patients for admin:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

export default createAdminPatientsHandler;
