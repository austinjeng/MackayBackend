import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Fragment } from "react";

export default async function PatientSessionsListPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        orderBy: [
          { sessionDate: "desc" },
          { startedAt: "desc" },
        ],
      },
    },
  });

  if (!patient) {
    notFound();
  }

  const sessionsGroupedByDate = patient.sessions.reduce<Record<string, typeof patient.sessions[number][]>>(
    (acc, session) => {
      const key = session.sessionDate?.toISOString() ?? session.startedAt.toISOString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(session);
      return acc;
    },
    {},
  );

  const sessionDateOrder = Object.keys(sessionsGroupedByDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime(),
  );

  const formatDateLabel = (dateIso: string) =>
    new Date(dateIso).toLocaleDateString("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatTimeLabel = (date: Date) =>
    new Date(date).toLocaleTimeString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <div className="home">
      <header className="hero">
        <span className="eyebrow">病患</span>
        <h1>{patient.name}</h1>
        <p>復健歷史</p>
      </header>

      <section className="panel" aria-label="Sessions">
        <div className="panel-header">
          <h2>所有復健</h2>
          <span>找到 {patient.sessions.length} 筆復健資料</span>
        </div>

        {patient.sessions.length === 0 ? (
          <div className="empty-state">
            <h3>沒有復健資料</h3>
            <p>這個病患還沒有進行任何復健</p>
          </div>
        ) : (
          <div className="project-list">
            {sessionDateOrder.map((dateIso) => (
              <Fragment key={dateIso}>
                <h3 style={{ marginTop: "1.5rem" }}>{formatDateLabel(dateIso)}</h3>
                <ul className="project-list" style={{ marginTop: "0.5rem" }}>
                  {sessionsGroupedByDate[dateIso].map((rehabSession) => (
                    <li key={rehabSession.id} className="project-list-item">
                      <Link
                        href={`/patients/${patient.id}/sessions/${rehabSession.id}`}
                        className="project-link"
                        style={{ width: "100%" }}
                      >
                        <div>
                          <h4 style={{ marginBottom: "0.25rem" }}>復健ID: {rehabSession.id}</h4>
                          <span>
                            開始時間: {formatTimeLabel(rehabSession.startedAt)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Fragment>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
