import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface RehabSessionDetailPageProps {
  params: {
    id: string; // patientId
    sessionId: string;
  };
}

export default async function RehabSessionDetailPage({ params }: RehabSessionDetailPageProps) {
  const { id: patientId, sessionId } = params;

  const rehabSession = await prisma.rehabSession.findUnique({
    where: {
      id: parseInt(sessionId), // The URL param is a string, but the ID in the DB is an Int
    },
    include: {
      patient: true, // Include patient details for the header
      sessionExercises: {
        orderBy: [
          { startedAt: 'asc' },
          { id: 'asc' },
        ],
        include: {
          exerciseType: true, // Include the name of the exercise
          attempts: {
            orderBy: {
              startedAt: 'asc',
            },
          },
        },
      },
    },
  });

  // Security check: Ensure the session actually belongs to the patient from the URL
  if (!rehabSession || rehabSession.patientId !== patientId) {
    notFound();
  }

  return (
    <div className="home">
      <header className="hero">
        <span className="eyebrow">Patient: {rehabSession.patient.name}</span>
        <h1>復健ID: {rehabSession.id}</h1>
        <p>
          復健日期: {new Date(rehabSession.sessionDate).toLocaleDateString('zh-TW', {
            timeZone: 'Asia/Taipei',
            dateStyle: 'full',
          })}
        </p>
      </header>

      <section className="panel" aria-label="Session Exercises">
        <div className="panel-header">
          <h2>復健中的運動</h2>
          <span>{rehabSession.sessionExercises.length} 項運動</span>
        </div>

        {rehabSession.sessionExercises.length === 0 ? (
          <div className="empty-state">
            <h3>沒有找到復健</h3>
          </div>
        ) : (
          <ul className="project-list">
            {rehabSession.sessionExercises.map((sessionExercise) => (
              <li key={sessionExercise.id} className="project-list-item">
                <Link
                  href={`/patients/${patientId}/sessions/${sessionId}/exercises/${sessionExercise.id}`}
                  className="project-link"
                  style={{ width: '100%' }}
                >
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{sessionExercise.exerciseType.name}</h3>
                    <span>
                      開始時間:{' '}
                      {sessionExercise.startedAt
                        ? new Date(sessionExercise.startedAt).toLocaleTimeString('zh-TW', {
                            timeZone: 'Asia/Taipei',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '未有資料'}
                    </span>
                  </div>
                </Link>

                <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
                  {sessionExercise.attempts.length === 0
                    ? '沒有任何嘗試紀錄'
                    : `共有 ${sessionExercise.attempts.length} 次資料，點擊檢視詳情`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
