import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

// Helper component to add some basic styling for the table
const TableStyles = () => (
  <style>{`
    .dynamic-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .dynamic-table th, .dynamic-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .dynamic-table thead th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .dynamic-table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .dynamic-table tbody tr:hover {
      background-color: #f1f1f1;
    }
    td.outcome-success, .stat-card p.outcome-success { color: #28a745; }
    td.outcome-fail, .stat-card p.outcome-fail { color: #dc3545; }
    td.outcome-invalid { color: #6c757d; }
    .stats-container {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      flex-grow: 1;
      text-align: center;
    }
    .stat-card h4 {
      margin: 0 0 8px 0;
      font-size: 1em;
      color: #555;
    }
    .stat-card p {
      margin: 0;
      font-size: 2em;
      font-weight: bold;
      color: #333;
    }
  `}</style>
);

interface RehabExerciseDetailPageProps {
  params: {
    id: string; // patientId
    sessionId: string;
    rehabSessionExerciseId: string;
  };
}

export default async function RehabSessionExerciseDetailPage({ params }: RehabExerciseDetailPageProps) {
  const { id: patientId, sessionId, rehabSessionExerciseId } = params;

  const sessionExercise = await prisma.rehabSessionExercise.findUnique({
    where: { id: parseInt(rehabSessionExerciseId) },
    include: {
      session: { include: { patient: true } },
      exerciseType: true,
      attempts: { orderBy: { startedAt: 'asc' } },
    },
  });

  if (!sessionExercise || sessionExercise.session.id !== parseInt(sessionId) || sessionExercise.session.patient.id !== patientId) {
    notFound();
  }

  const { exerciseType, attempts } = sessionExercise;

  // Mappings for localization
  const headerLocalizationMap: { [key: string]: string } = {
    angleDeg: '角度',
    holdSeconds: '維持秒數',
    steps: '步數',
    deviations: '偏移次數',
    reason: '原因',
  };

  const outcomeLocalizationMap: { [key: string]: string } = {
    success: '成功',
    fail: '失敗',
    invalid: '無效',
  };


  // Logic to determine dynamic columns from the JSON data
  const allDataKeys = new Set<string>();
  attempts.forEach(attempt => {
    if (attempt.data && typeof attempt.data === 'object' && !Array.isArray(attempt.data)) {
      Object.keys(attempt.data).forEach(key => allDataKeys.add(key));
    }
  });
  const dynamicHeaders = Array.from(allDataKeys);

  // Calculate statistics
  const stats = attempts.reduce((acc, attempt) => {
    if (attempt.outcome === 'success') acc.success++;
    if (attempt.outcome === 'fail') acc.fail++;
    return acc;
  }, { success: 0, fail: 0 });

  const totalValidAttempts = stats.success + stats.fail;
  const successRate = totalValidAttempts > 0 ? (stats.success / totalValidAttempts) * 100 : 0;


  return (
    <div className="home">
      <TableStyles />
      <header className="hero">
        <span className="eyebrow">運動詳細資料</span>
        <h1>{exerciseType.name}</h1>
        <p>病患名稱: {sessionExercise.session.patient.name}</p>
      </header>

      <section className="panel" aria-label="Exercise Attempts">
        <div className="panel-header">
          <h2>所有嘗試</h2>
          <span>找到 {attempts.length} 筆嘗試資料</span>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <h4>成功次數</h4>
            <p className="outcome-success">{stats.success}</p>
          </div>
          <div className="stat-card">
            <h4>失敗次數</h4>
            <p className="outcome-fail">{stats.fail}</p>
          </div>
          <div className="stat-card">
            <h4>成功率</h4>
            <p>{successRate.toFixed(1)}%</p>
          </div>
        </div>


        {attempts.length === 0 ? (
          <div className="empty-state">
            <h3>這個運動沒有任何嘗試紀錄</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dynamic-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>結果</th>
                  <th>紀錄時間</th>
                  {/* Dynamic headers from JSON data */}
                  {dynamicHeaders.map(header => <th key={header}>{headerLocalizationMap[header] || header}</th>)}
                </tr>
              </thead>
              <tbody>
                {attempts.map(attempt => {
                  return (
                    <tr key={attempt.id}>
                      <td>{attempt.id}</td>
                      <td className={`outcome-${attempt.outcome}`}>{outcomeLocalizationMap[attempt.outcome] || attempt.outcome}</td>
                      <td>
                        {new Date(attempt.startedAt).toLocaleTimeString('zh-TW', {
                          timeZone: 'Asia/Taipei',
                          hour: 'numeric',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      {/* Dynamic cells for JSON data */}
                      {dynamicHeaders.map(header => {
                        const value = (attempt.data as any)?.[header];
                        return <td key={header}>{value !== undefined ? String(value) : '−'}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
