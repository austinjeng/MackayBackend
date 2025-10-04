import { Patient } from '@prisma/client';
import prisma from "@/lib/prisma";
import Link from 'next/link';

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
        <span className="eyebrow">馬偕復健後端</span>
        <h1>復健患者運動資料主控台</h1>
        <p>病患列表</p>
      </header>

      <section className="panel" aria-label="Patients">
        <div className="panel-header">
          <h2>病患列表</h2>
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
                <Link href={`/patients/${patient.id}/exercises`} className="project-link">
                  <div>
                    <h3>{patient.name}</h3>
                    <span>年齡: {patient.age}, 性別: {patient.gender}</span>
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