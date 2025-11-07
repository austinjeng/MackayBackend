import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { ratelimit } from '@/lib/ratelimit';

export type ValidateKeyRouteDeps = {
  authenticateRequest: typeof authenticateApiRequest;
  prismaClient: typeof prisma;
  rateLimiter: {
    limit: (identifier: string) => Promise<{
      success: boolean;
      limit: number;
      remaining: number;
      reset: number;
    }>;
  };
};

const defaultDeps: ValidateKeyRouteDeps = {
  authenticateRequest: authenticateApiRequest,
  prismaClient: prisma,
  rateLimiter: ratelimit,
};

export function createValidateKeyHandler(
  deps: ValidateKeyRouteDeps = defaultDeps,
) {
  const { authenticateRequest, prismaClient, rateLimiter } = deps;

  return async function GET(request: Request) {
    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';

    const rateLimitResult = await rateLimiter.limit(identifier);

    if (!rateLimitResult.success) {
      const retryAfter = Math.max(
        0,
        Math.ceil(rateLimitResult.reset - Date.now() / 1000),
      );

      return NextResponse.json(
        { ok: false, error: 'Too Many Requests' },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        },
      );
    }

    const authResult = await authenticateRequest(request);

    if ('response' in authResult) {
      return authResult.response;
    }

    try {
      const patient = await prismaClient.patient.findUnique({
        where: { id: authResult.patientId },
        select: {
          id: true,
          name: true,
          dob: true,
        },
      });

      if (!patient) {
        return NextResponse.json(
          { ok: false, error: 'Patient not found.' },
          { status: 404 },
        );
      }

      return NextResponse.json({ ok: true, patient });
    } catch (error) {
      console.error('Error validating API key:', error);
      return NextResponse.json(
        { ok: false, error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  };
}

export default createValidateKeyHandler;
