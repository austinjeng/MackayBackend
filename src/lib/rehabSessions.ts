import { RehabSession, RehabSessionExercise } from '@prisma/client';
import prisma from '@/lib/prisma';

type EnsureDailySessionDeps = {
  prismaClient: typeof prisma;
  getCurrentDate: () => Date;
};

const defaultDeps: EnsureDailySessionDeps = {
  prismaClient: prisma,
  getCurrentDate: () => new Date(),
};

// 將日期正規化成 UTC 的「當日零點」，避免時區誤差導致多筆 Session
export function normalizeToDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function createEnsureDailySession(deps: EnsureDailySessionDeps = defaultDeps) {
  const { prismaClient, getCurrentDate } = deps;

  return async function ensureDailySession(patientId: string, date: Date = getCurrentDate()): Promise<RehabSession> {
    const sessionDate = normalizeToDay(date);

    return prismaClient.rehabSession.upsert({
      where: {
        patientId_sessionDate: {
          patientId,
          sessionDate,
        },
      },
      update: {},
      create: {
        patientId,
        sessionDate,
        startedAt: date,
        status: 'open',
      },
    });
  };
}

export const ensureDailySession = createEnsureDailySession();

type EnsureSessionExerciseDeps = {
  prismaClient: typeof prisma;
};

const defaultExerciseDeps: EnsureSessionExerciseDeps = {
  prismaClient: prisma,
};

export function createEnsureSessionExercise(deps: EnsureSessionExerciseDeps = defaultExerciseDeps) {
  const { prismaClient } = deps;

  return async function ensureSessionExercise(sessionId: number, exerciseTypeId: number): Promise<RehabSessionExercise> {
    return prismaClient.rehabSessionExercise.upsert({
      where: {
        sessionId_exerciseTypeId: {
          sessionId,
          exerciseTypeId,
        },
      },
      update: {},
      create: {
        sessionId,
        exerciseTypeId,
        status: 'open',
      },
    });
  };
}

export const ensureSessionExercise = createEnsureSessionExercise();
