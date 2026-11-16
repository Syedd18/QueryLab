# 🗃️ SQL Practice Platform

A production-ready SQL practice platform similar to LeetCode + StrataScratch, featuring real SQL execution, JWT authentication, progress tracking, XP system, leaderboard, and a full admin panel.

![SQL Practice Platform](https://img.shields.io/badge/Status-Production--Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Python](https://img.shields.io/badge/Python-3.12-yellow)

---

## ✨ Features

### Core
- 🔐 **JWT Authentication** — Secure signup, login, and protected routes
- 📝 **100+ SQL Challenges** — From basic SELECT to advanced window functions
- ⚡ **Real SQL Execution** — Execute queries against a sandboxed SQLite database
- 📊 **Instant Feedback** — Compare results against expected output
- 🏆 **XP & Streak System** — Earn points and maintain daily streaks

### UI/UX
- 🌗 **Dark/Light Mode** — Premium theme with glassmorphism
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile
- 🎨 **Monaco SQL Editor** — Syntax highlighting, autocomplete, Ctrl+Enter
- 📈 **Dashboard Analytics** — Weekly activity, difficulty breakdown, accuracy
- 🥇 **Leaderboard** — Top-3 podium with global rankings

### Admin
- ➕ **CRUD Questions** — Create, edit, delete questions
- 📂 **Manage Categories** — Organize questions by SQL topic
- 🔍 **Search & Filter** — Find questions quickly

---

## 📸 Screenshots

> Screenshots placeholder — run the app locally to see the UI

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Monaco Editor | SQL editor |
| TanStack Query | Server state |
| Framer Motion | Animations |
| Lucide Icons | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | API framework |
| SQLAlchemy | ORM |
| Pydantic | Data validation |
| JWT (python-jose) | Authentication |
| Alembic | Migrations |
| SQLite | SQL sandbox |

### Database
| Technology | Purpose |
|---|---|
| Supabase PostgreSQL | Main database |
| SQLite (read-only) | Query sandbox |

---

## 📁 Project Structure

```
sql-practice/
├── frontend/                # Next.js 15 frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (app)/       # Authenticated layout
│   │   │   │   ├── dashboard/
│   │   │   │   ├── practice/
│   │   │   │   ├── categories/
│   │   │   │   ├── bookmarks/
│   │   │   │   ├── leaderboard/
│   │   │   │   ├── profile/
│   │   │   │   └── admin/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── page.tsx     # Landing page
│   │   ├── components/      # Reusable components
│   │   └── lib/             # Utilities & API client
│   └── package.json
│
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── routers/         # API route handlers
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── database/        # DB config & seeds
│   │   ├── config.py        # Settings
│   │   └── main.py          # App entry point
│   ├── sandbox_dbs/         # SQLite databases
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18
- **Python** >= 3.10
- **PostgreSQL** (or Supabase account)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/sql-practice.git
cd sql-practice
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Seed the database
python -m app.database.seed

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# .env.local is already configured for local development

# Start dev server
npm run dev
```

### 4. Access the app
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/docs
- **Demo login**: `demo@sqlpractice.com` / `demo123`
- **Admin login**: `admin@sqlpractice.com` / `admin123`

---

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/sql_practice
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000
SANDBOX_DB_DIR=./sandbox_dbs
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🌐 Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Import project in Vercel
3. Set root directory to `frontend`
4. Add `NEXT_PUBLIC_API_URL` environment variable
5. Deploy

### Backend (Render)
1. Create a new Web Service on Render
2. Set root directory to `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

### Database (Supabase)
1. Create a new project on Supabase
2. Copy the PostgreSQL connection string
3. Set `DATABASE_URL` in your backend environment

---

## 📚 API Documentation

When the backend is running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/questions` | List questions |
| GET | `/api/questions/{id}` | Get question detail |
| POST | `/api/sql/execute` | Run SQL query |
| POST | `/api/sql/submit` | Submit for grading |
| GET | `/api/dashboard` | User dashboard stats |
| GET | `/api/leaderboard` | Global rankings |
| GET | `/api/categories` | List categories |
| POST | `/api/bookmarks` | Toggle bookmark |

---

## 🔒 Security

- **JWT Authentication** with bcrypt password hashing
- **SQL Validation** — Only SELECT/WITH queries allowed
- **Read-only SQLite** — Sandbox databases opened in read-only mode
- **Rate Limiting** — API rate limiting via SlowAPI
- **Input Sanitization** — Pydantic validation on all inputs
- **CORS** — Configurable allowed origins

---

## 📝 License

MIT License — feel free to use this project for learning and development.
