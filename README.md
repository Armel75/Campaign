# Campaign Manager SaaS

A full-stack marketing campaign management application built with a monorepo architecture.

## Tech Stack

- **Monorepo**: npm workspaces
- **Backend**: Node.js, Express, TypeScript, Prisma
- **Frontend**: React, Vite, TypeScript, TailwindCSS, Shadcn UI
- **Database**: SQL Server (Production) / SQLite (Dev/Preview)

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for SQL Server)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup Environment:
   - Copy `.env.example` to `.env` (already done in this template)
   - Adjust `DATABASE_URL` in `apps/api/.env` if needed.

3. Database Setup:
   - **For Preview/Dev (SQLite)**: The project is pre-configured to use SQLite.
     ```bash
     npm run prisma:migrate
     npm run prisma:seed
     ```
   - **For Production (SQL Server)**:
     - Start Docker: `docker-compose up -d`
     - Update `apps/api/prisma/schema.prisma` provider to `sqlserver`.
     - Update `.env` with SQL Server connection string.
     - Run migrations.

4. Start Development Server:
   ```bash
   npm run dev
   ```
   This will start both the API (port 3000) and Web (port 5173/random) concurrently.

## Features

- **Authentication**: JWT-based auth with Role-Based Access Control (RBAC).
- **Dashboard**: Real-time KPIs and charts.
- **Campaign Management**: Full CRUD for campaigns, objectives, channels.
- **Lead Tracking**: Manage leads and conversions.
- **Task Management**: Assign tasks to users.
- **Financials**: Track expenses and budgets.
