import { Patient } from '@prisma/client';
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadPatientData(): Promise<Patient[]> {
  try {
    const patients = await prisma.patient.findMany();
    return patients;
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

export default async function HomePage() {
  const patients = await loadPatientData();

  return (
    <div className="home">
      <header className="hero">
        <span className="eyebrow">Mackay Backend</span>
        <h1>Patient Dashboard</h1>
        <p>A list of patients in the system.</p>
      </header>

      <section className="panel" aria-label="Patients">
        <div className="panel-header">
          <h2>Patients</h2>
          <span>{patients.length} shown</span>
        </div>

        {patients.length === 0 ? (
          <div className="empty-state">
            <h3>No patients found</h3>
            <p>You can seed the database to add some patients.</p>
          </div>
        ) : (
          <ul className="project-list">  {/* Using existing class for some styling */}
            {patients.map((patient) => (
              <li key={patient.id} className="project-list-item"> {/* Using existing class for some styling */}
                <div>
                  <h3>{patient.name}</h3>
                  <span>Age: {patient.age}, Gender: {patient.gender}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}