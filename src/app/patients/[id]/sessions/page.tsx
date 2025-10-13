import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PatientSessionsListPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!patient) {
    notFound();
  }

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
          <ul className="project-list">
            {patient.sessions.map((session) => (
              <li key={session.id} className="project-list-item">
                <Link href={`/patients/${patient.id}/sessions/${session.id}`} className="project-link" style={{ width: '100%' }}>
                  <div>
                    <h3>復健ID: {session.id}</h3>
                    <span>
                      建立時間: {new Date(session.createdAt).toLocaleString('zh-TW', {
                        timeZone: 'Asia/Taipei',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
