# Mackay Backend Dashboard

A minimal Next.js 14 dashboard that acts as the backend control surface for the Mackay application. It is built with the App Router, Prisma ORM, and PostgreSQL (Neon friendly) and is ready to deploy on Vercel.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure your environment**
   - Duplicate `.env.example` to `.env.local`.
   - Replace `DATABASE_URL` with the connection string from your Neon project (be sure to keep `sslmode=require`).
3. **Prepare the database**
   ```bash
   npx prisma migrate dev --name init
   ```
   This will create the `Project` table defined in `prisma/schema.prisma` and generate the Prisma client.
4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Prisma & Database Notes

- The Prisma client is exported from `src/lib/prisma.ts`, which keeps a single instance across hot reloads.
- The homepage (`src/app/page.tsx`) performs a lightweight health check (`SELECT 1`) to confirm the database connection and shows example metrics. If the `Project` table is empty, the counter displays `0`.
- Adjust `prisma/schema.prisma` as your domain evolves, then run `npx prisma migrate dev` locally or `npm run prisma:deploy` in production.

## Deploying to Vercel

1. Push this repo to GitHub (or another supported git provider).
2. In Vercel, create a new project and import the repository.
3. Set the `DATABASE_URL` environment variable in the Vercel dashboard (Project Settings -> Environment Variables).
4. Vercel will run `npm install`, `npm run build`, and `npm run prisma:deploy` automatically. The `postinstall` script will ensure the Prisma client is generated.

## Useful Scripts

- `npm run dev` - start the local development server.
- `npm run build` - create the production build.
- `npm run start` - run the production server locally.
- `npm run lint` - lint the project.
- `npm run prisma:generate` - regenerate the Prisma client.
- `npm run prisma:deploy` - apply pending migrations in production.
- `npm run prisma:studio` - open Prisma Studio to inspect data (requires a running database connection).

## Next Steps

- Build authenticated routes and API handlers under `src/app/api`.
- Flesh out dashboard modules (e.g., analytics, content management, user admin).
- Add UI primitives or component library of choice.
- Integrate real data visualisations once the schema is in place.