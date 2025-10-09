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
        <span className="eyebrow">Patient</span>
        <h1>{patient.name}</h1>
        <p>Session History</p>
      </header>

      <section className="panel" aria-label="Sessions">
        <div className="panel-header">
          <h2>All Sessions</h2>
          <span>{patient.sessions.length} sessions found</span>
        </div>

        {patient.sessions.length === 0 ? (
          <div className="empty-state">
            <h3>No sessions recorded</h3>
            <p>This patient does not have any exercise session history yet.</p>
          </div>
        ) : (
          <ul className="project-list">
            {patient.sessions.map((session) => (
              <li key={session.id} className="project-list-item">
                <Link href={`/patients/${patient.id}/sessions/${session.id}`} className="project-link" style={{ width: '100%' }}>
                  <div>
                    <h3>Session ID: {session.id}</h3>
                    <span>
                      Recorded on: {new Date(session.createdAt).toLocaleString('zh-TW', {
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
