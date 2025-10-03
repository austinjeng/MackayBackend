
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

interface ExerciseDetailPageProps {
  params: {
    id: string; // patientId
    exerciseSlug: string;
  };
}

export default async function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { id: patientId, exerciseSlug } = params;

  // For now, we only handle "liftleg" exercises.
  // In a real application, you would dynamically query based on exerciseSlug.
  if (exerciseSlug !== "liftleg") {
    notFound(); // Or redirect to a generic exercise not found page
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    notFound();
  }

  const liftLegExercises = await prisma.liftLegExercise.findMany({
    where: {
      patientId: patientId,
    },
    orderBy: {
      createdAt: "desc", // Order by creation date, newest first
    },
  });

  return (
    <div className="home">
      <header className="hero">
        <span className="eyebrow">Patient: {patient.name}</span>
        <h1>Exercise: {exerciseSlug.charAt(0).toUpperCase() + exerciseSlug.slice(1)}</h1>
        <p>Details for {exerciseSlug} exercises</p>
      </header>

      <section className="panel" aria-label="Exercise Data">
        <div className="panel-header">
          <h2>Recorded Sessions</h2>
          <span>{liftLegExercises.length} sessions found</span>
        </div>

        {liftLegExercises.length === 0 ? (
          <div className="empty-state">
            <h3>No sessions recorded</h3>
            <p>There is no data for this exercise yet.</p>
          </div>
        ) : (
          <ul className="project-list">
            {liftLegExercises.map((session) => (
              <li key={session.id} className="project-list-item">
                <div>
                  <h3>Session ID: {session.id}</h3>
                  <p>Correct Count: {session.correctCount}</p>
                  <p>Incorrect Count: {session.incorrectCount}</p>
                  <p>Date: {new Date(session.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
