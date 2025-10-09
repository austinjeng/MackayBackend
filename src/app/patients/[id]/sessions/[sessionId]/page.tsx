import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface SessionDetailPageProps {
  params: {
    id: string; // patientId
    sessionId: string;
  };
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id: patientId, sessionId } = params;

  const session = await prisma.session.findUnique({
    where: {
      id: parseInt(sessionId), // The URL param is a string, but the ID in the DB is an Int
    },
    include: {
      patient: true, // Include patient details for the header
      sessionExercises: {
        orderBy: {
          id: 'asc', // Order exercises by their ID
        },
        include: {
          exerciseType: true, // Include the name of the exercise
        },
      },
    },
  });

  // Security check: Ensure the session actually belongs to the patient from the URL
  if (!session || session.patientId !== patientId) {
    notFound();
  }

  return (
    <div className="home">
      <header className="hero">
        <span className="eyebrow">Patient: {session.patient.name}</span>
        <h1>復健ID: {session.id}</h1>
        <p>
          建立時間: {new Date(session.createdAt).toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        </p>
      </header>

      <section className="panel" aria-label="Session Exercises">
        <div className="panel-header">
          <h2>復健中的運動</h2>
          <span>{session.sessionExercises.length} 運動 found</span>
        </div>

        {session.sessionExercises.length === 0 ? (
          <div className="empty-state">
            <h3>沒有找到復健</h3>
          </div>
        ) : (
          <ul className="project-list">
            {session.sessionExercises.map((sessionExercise) => (
              <li key={sessionExercise.id} className="project-list-item">
                <Link href={`/patients/${patientId}/sessions/${sessionId}/exercises/${sessionExercise.id}`} className="project-link" style={{ width: '100%' }}>
                  <div>
                    <h3>{sessionExercise.exerciseType.name}</h3>
                    {/* You can add more details about the session exercise here if needed */}
                    <span>狀態: {sessionExercise.status}</span>
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
