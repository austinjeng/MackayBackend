import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

// Define the shape of an exercise
interface Exercise {
  name: string;
  slug: string;
  description: string;
}

// This list can be expanded as you add more exercises and APIs
const availableExercises: Exercise[] = [
  {
    name: "Lift Leg",
    slug: "liftleg",
    description: "Patient lifts their leg to a specified angle.",
  },
  // {
  //   name: "Arm Raise",
  //   slug: "armraise",
  //   description: "Patient raises their arm to a specified height.",
  // },
];

export default async function PatientExercisesPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
  });

  if (!patient) {
    notFound();
  }

  return (
    <div className="home"> {/* Using existing class for some styling */}
      <header className="hero">
        <span className="eyebrow">Patient</span>
        <h1>{patient.name}</h1>
        <p>Available Exercises</p>
      </header>

      <section className="panel" aria-label="Exercises">
        <div className="panel-header">
          <h2>Exercise List</h2>
          <span>{availableExercises.length} shown</span>
        </div>

        {availableExercises.length === 0 ? (
          <div className="empty-state">
            <h3>No exercises available</h3>
            <p>This list will populate as new exercises are added.</p>
          </div>
        ) : (
          <ul className="project-list">
            {availableExercises.map((exercise) => (
              <li key={exercise.slug} className="project-list-item">
                <Link href={`/patients/${patient.id}/exercises/${exercise.slug}`} className="project-link">
                  <div>
                    <h3>{exercise.name}</h3>
                    <span>{exercise.description}</span>
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
