<p align="center">
  <img src="./assets/querylab-wordmark.svg" alt="QueryLab logo" width="420" />
</p>

# QueryLab

QueryLab is a full-stack SQL practice platform built for learning, mastering, and
applying SQL through realistic industry-inspired exercises. The application
combines a modern Next.js frontend, a FastAPI backend, Supabase PostgreSQL data
storage, and isolated SQLite execution sandboxes for safe query evaluation.

## Overview

QueryLab helps developers and data enthusiasts practice SQL with structured
categories, company-based scenarios, guided challenges, and dashboard tracking.
Users can solve questions, run queries against sandbox databases, review results,
track progress, and benchmark their performance over time.

## Features

- SQL practice library with categories, difficulty levels, companies, tags, and search
- Monaco-powered SQL editor with syntax highlighting and `Ctrl+Enter` execution
- Query execution and result comparison against expected solutions
- JWT authentication with password hashing and protected user features
- Dashboard progress tracking, XP, streaks, activity history, and leaderboard
- Bookmarks, reports, profile management, and admin question management
- Responsive light and dark themes
- API rate limiting and configurable CORS

## Architecture

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Data fetching | TanStack Query |
| Editor | Monaco Editor |
| Backend | FastAPI, Uvicorn, SQLAlchemy |
| Main database | PostgreSQL through Supabase |
| Query sandbox | SQLite |
| Authentication | JWT, Passlib/Bcrypt |

## Repository layout

```text
QueryLab/
├── backend/
│   ├── app/
│   │   ├── database/       # Database session and seed logic
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # API endpoints
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Authentication and SQL execution
│   │   └── main.py         # FastAPI application
│   ├── scripts/            # Dataset and Supabase setup scripts
│   └── requirements.txt
├── frontend/
│   ├── src/app/            # Next.js routes and layouts
│   ├── src/components/     # Shared UI and product components
│   ├── src/lib/            # API client and application context
│   └── package.json
└── README.md
```

## Requirements

- Node.js 18 or newer
- Python 3.10 or newer
- A PostgreSQL database; Supabase is recommended

## Local development

### 1. Clone the repository

```bash
git clone https://github.com/Syedd18/QueryLab.git
cd QueryLab
```

### 2. Configure the backend

Create a virtual environment and install the Python dependencies:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Set the following values in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@<pooler-host>:6543/postgres?sslmode=require
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000
SANDBOX_DB_DIR=./sandbox_dbs
```

Never commit `.env` or database credentials. The repository ignores local
environment files, virtual environments, databases, and build output.

### 3. Prepare the database

Create the tables on the configured PostgreSQL database:

```powershell
.\venv\Scripts\python.exe scripts\create_supabase_tables.py
```

To load the bundled dataset and seed data:

```powershell
.\venv\Scripts\python.exe -m app.database.seed
```

### 4. Start the backend

From `backend/`:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The backend is available at `http://localhost:8000`.

### 5. Configure and start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Start Next.js:

```powershell
npm run dev
```

The application is available at `http://localhost:3000`.

## Frontend scripts

Run these commands from `frontend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## API documentation

With the backend running:

- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`
- Health check: `http://localhost:8000/api/health`

Important API areas include:

- `/api/auth` — signup, login, and current-user information
- `/api/questions` — question listing, details, and administration
- `/api/sql` — query execution and submissions
- `/api/dashboard` — progress and activity data
- `/api/categories` — SQL categories
- `/api/companies` — company filters
- `/api/leaderboard` — rankings
- `/api/bookmarks` — saved questions
- `/api/reports` — question reports

## Deployment

### Frontend on Vercel

1. Import the GitHub repository into Vercel.
2. Set the project root directory to `frontend`.
3. Set `NEXT_PUBLIC_API_URL` to the deployed backend API URL, including `/api`.
4. Deploy the project.

### Backend on Render or another Python host

1. Create a Python web service using the `backend` directory as its root.
2. Set the service's Python version to **3.12.10**. The repository's
   `.python-version` file pins Render to this version. Remove any
   `PYTHON_VERSION` override in the Render environment, or set it to `3.12.10`.
   Python 3.14 currently causes the pinned `pydantic-core==2.23.4` dependency
   to build from source during deployment.
3. Set the build command to install dependencies and generate the SQLite
   sandbox databases:

   ```bash
   pip install -r requirements.txt && python scripts/prepare_sandboxes.py
   ```

4. Start command:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

5. Configure `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`,
   `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, and `SANDBOX_DB_DIR`.
6. Add the deployed frontend origin to `CORS_ORIGINS`.

The sandbox-preparation command creates `practice.db`, `practice_v2.db`, and
`practice_tech.db` inside `SANDBOX_DB_DIR` and validates the company question
queries against the generated databases. The files are intentionally excluded
from Git and are generated as part of the backend build, so they are present in
the deployed app without relying on a persistent disk. Keep the same
`SANDBOX_DB_DIR` value for the build and runtime.

Before the first deployment, initialize the PostgreSQL database and load the
question records once from the backend directory:

```bash
python -m app.database.seed
python scripts/build_company_bank.py --apply
```

These are database-writing setup commands, not build commands. Run them
deliberately against the intended database: the company-bank script updates
question records and hides surplus existing questions. The deployment build
only creates and validates local SQLite files; it does not write to PostgreSQL.

### Supabase

Use the PostgreSQL connection string from Supabase as `DATABASE_URL`. For
pooler connections, use the port and host supplied by the Supabase dashboard
and URL-encode special characters in the password.

## Security notes

- Use a unique, long `SECRET_KEY` in every deployed environment.
- Store credentials only in deployment-provider secrets or local ignored files.
- Restrict `CORS_ORIGINS` to known frontend origins.
- Do not expose the PostgreSQL connection string to the browser.
- The SQL sandbox is separate from the primary PostgreSQL persistence database.

## License

This project is available under the MIT License.
