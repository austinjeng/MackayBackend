import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

interface ExerciseDetailPageProps {
  params: {
    id: string; // patientId
    sessionId: string;
    sessionExerciseId: string;
  };
}

export default async function SessionExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { id: patientId, sessionId, sessionExerciseId } = params;

  const sessionExercise = await prisma.sessionExercise.findUnique({
    where: {
      id: parseInt(sessionExerciseId),
    },
    include: {
      session: {
        include: {
          patient: true,
        },
      },
      exerciseType: true,
      ExerciseAlternatingKneesAttempt: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  // Security checks
  if (
    !sessionExercise ||
    sessionExercise.session.id !== parseInt(sessionId) ||
    sessionExercise.session.patient.id !== patientId
  ) {
    notFound();
  }

  const { exerciseType, ExerciseAlternatingKneesAttempt: attempts } = sessionExercise;

  return (
    <div className="home">
      <header className="hero">
        <span className="eyebrow">{exerciseType.name}</span>
        <h1>運動詳細資料</h1>
        <p>病患名稱: {sessionExercise.session.patient.name}</p>
      </header>

      <section className="panel" aria-label="Exercise Attempts">
        <div className="panel-header">
          <h2>所有嘗試</h2>
          <span>{attempts.length} 嘗試 found</span>
        </div>

        {attempts.length === 0 ? (
          <div className="empty-state">
            <h3>No attempts were recorded for this exercise.</h3>
          </div>
        ) : (
          <ul className="project-list">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="project-list-item">
                <div>
                  <h3>結果: {attempt.outcome}</h3>
                  <span>角度: {attempt.angleDeg.toString()}°</span>
                  <br />
                  <span>
                    建立時間: {new Date(attempt.createdAt).toLocaleTimeString('zh-TW', {
                      timeZone: 'Asia/Taipei',
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
