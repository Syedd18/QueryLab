# QueryLab

QueryLab is a full-stack SQL practice workspace for learning, practicing, and
evaluating SQL against realistic sandbox databases. It combines a FastAPI API,
a Next.js interface, Supabase PostgreSQL persistence, and isolated SQLite
databases for query execution.

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
2. Build command:

   ```bash
   pip install -r requirements.txt
   ```

3. Start command:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. Configure `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`,
   `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, and `SANDBOX_DB_DIR`.
5. Add the deployed frontend origin to `CORS_ORIGINS`.

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
