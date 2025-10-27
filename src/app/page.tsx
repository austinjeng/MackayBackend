import Link from 'next/link';
import { cookies, headers } from 'next/headers';

type PatientSummary = {
  id: string;
  name: string;
  dob: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadPatientData(): Promise<PatientSummary[]> {
  try {
    const headerList = headers();
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host');

    if (!host) {
      console.warn('Missing host header when loading patient data');
      return [];
    }

    const cookieStore = cookies();
    const response = await fetch(`${protocol}://${host}/api/admin/patients`, {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch patients via admin API:', response.statusText);
      return [];
    }

    const patients = (await response.json()) as PatientSummary[];
    return patients;
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

function calculateAge(dob: string | Date | null): number | null {
  if (!dob) return null;

  const birthDate = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const isBirthdayMonthPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());

  if (!isBirthdayMonthPassed) {
    age -= 1;
  }

  return age;
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
          <span>找到 {patients.length} 筆資料 </span>
        </div>
        {patients.length === 0 ? (
          <div className="empty-state">
            <h3>沒有病患</h3>
            <p>請檢查資料庫連線</p>
          </div>
        ) : (
          <ul className="project-list">  {/* Using existing class for some styling */}
            {patients.map((patient) => {
              const age = calculateAge(patient.dob);

              return (
                <li key={patient.id} className="project-list-item"> {/* Using existing class for some styling */}
                  <Link href={`/patients/${patient.id}/sessions`} className="project-link">
                    <div>
                      <h3>{patient.name}</h3>
                      <span>年齡: {age !== null ? `${age} 歲` : '未知'}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
