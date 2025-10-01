import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeData = {
  connected: boolean;
  error?: string;
  total: number;
  recent: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
};

async function loadHomeData(): Promise<HomeData> {
  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      error: "Set DATABASE_URL in your environment to connect Neon.",
      total: 0,
      recent: []
    };
  }

  try {
    const [total, recentProjects] = await Promise.all([
      prisma.project.count(),
      prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true
        }
      })
    ]);

    const recent = recentProjects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    }));

    return {
      connected: true,
      total,
      recent
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      connected: false,
      error: message,
      total: 0,
      recent: []
    };
  }
}

export default async function HomePage() {
  const data = await loadHomeData();

  return (
    <div className="home">
      <header className="hero">
        <span className="eyebrow">Mackay Backend</span>
        <h1>Keep your Mackay operations on track</h1>
        <p>
          Monitor projects, sync data, and prepare new releases from a single dashboard. This starter
          pairs Next.js App Router with Prisma and Neon so you can ship quickly.
        </p>
        <div className="cta-row">
          <a className="cta primary" href="https://vercel.com/docs" rel="noreferrer" target="_blank">
            Deploy to Vercel
          </a>
          <a className="cta secondary" href="https://neon.tech/docs" rel="noreferrer" target="_blank">
            Neon docs
          </a>
        </div>
      </header>

      <section className="metrics" aria-label="Key metrics">
        <div className="metric">
          <span>Total projects</span>
          <strong>{data.total}</strong>
        </div>
        <div className="metric">
          <span>Database</span>
          <strong className={data.connected ? "status-ok" : "status-error"}>
            {data.connected ? "Connected" : "Not connected"}
          </strong>
        </div>
      </section>

      <section className="panel recent" aria-label="Recent projects">
        <div className="panel-header">
          <h2>Recent projects</h2>
          <span>{data.recent.length} shown</span>
        </div>

        {!data.connected && (
          <div className="callout warning">
            <strong>Database offline.</strong> {data.error}
          </div>
        )}

        {data.connected && data.recent.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>
              Create one with <code>npx prisma studio</code> or seed data via a migration script.
            </p>
          </div>
        ) : (
          <ul className="project-list">
            {data.recent.map((project) => (
              <li key={project.id} className="project-list-item">
                <div>
                  <h3>{project.name}</h3>
                  <span>{project.createdAt}</span>
                </div>
                <span className={`status-pill status-${project.status.toLowerCase()}`}>
                  {project.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}