import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const start = Date.now();

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        status: "pending",
        detail: "DATABASE_URL environment variable is not set"
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      status: "ok",
      latencyMs: Date.now() - start
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        status: "error",
        detail: message
      },
      { status: 500 }
    );
  }
}