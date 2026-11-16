const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type FetchOptions = RequestInit & {
  token?: string | null;
};

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (typeof window !== "undefined") {
    const stored = localStorage.getItem("token");
    if (stored) {
      headers["Authorization"] = `Bearer ${stored}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      data?.detail || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  if (response.status === 204) return null as T;
  return response.json();
}

// ── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (data: { name: string; email: string; password: string }) =>
    fetchApi<{ access_token: string; user: User }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchApi<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => fetchApi<User>("/auth/me"),

  updateMe: (data: { name?: string; bio?: string; avatar_url?: string }) =>
    fetchApi<User>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ── Questions API ───────────────────────────────────────────────────────────

export const questionsApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    difficulty?: string;
    category_id?: string;
    company?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.difficulty) query.set("difficulty", params.difficulty);
    if (params?.category_id) query.set("category_id", params.category_id);
    if (params?.company) query.set("company", params.company);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return fetchApi<PaginatedResponse<QuestionListItem>>(`/questions${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => fetchApi<QuestionDetail>(`/questions/${id}`),

  solution: (id: string) =>
    fetchApi<{ question_id: string; solutions: string[] }>(`/questions/${id}/solution`),

  create: (data: QuestionCreateData) =>
    fetchApi<QuestionDetail>("/questions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<QuestionCreateData>) =>
    fetchApi<QuestionDetail>(`/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/questions/${id}`, { method: "DELETE" }),
};

// ── SQL Execution API ───────────────────────────────────────────────────────

export const sqlApi = {
  execute: (data: { sql: string; question_id: string }) =>
    fetchApi<ExecuteResult>("/sql/execute", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submit: (data: { sql: string; question_id: string }) =>
    fetchApi<SubmitResult>("/sql/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Dashboard API ───────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => fetchApi<DashboardData>("/dashboard"),
};

// ── Leaderboard API ─────────────────────────────────────────────────────────

export const leaderboardApi = {
  get: (limit?: number) =>
    fetchApi<LeaderboardData>(`/leaderboard${limit ? `?limit=${limit}` : ""}`),
};

// ── Categories API ──────────────────────────────────────────────────────────

export const companiesApi = {
  list: () => fetchApi<{ companies: CompanyData[]; total: number }>("/companies"),
};

export const REPORT_CATEGORIES = [
  "Incorrect expected output",
  "Question is unclear",
  "Schema or data issue",
  "Typo or wording",
  "Something else",
] as const;

export interface ReportData {
  id: string;
  question_id: string | null;
  question_title: string | null;
  user_name: string | null;
  category: string;
  message: string;
  status: "open" | "resolved" | string;
  created_at: string;
}

export const reportsApi = {
  create: (data: { question_id?: string; category: string; message: string }) =>
    fetchApi<ReportData>("/reports", { method: "POST", body: JSON.stringify(data) }),
  list: (status?: "open" | "resolved") =>
    fetchApi<ReportData[]>(`/reports${status ? `?status=${status}` : ""}`),
  updateStatus: (id: string, status: "open" | "resolved") =>
    fetchApi<ReportData>(`/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

export interface CompanyData {
  name: string;
  slug: string;
  question_count: number;
}

export const categoriesApi = {
  list: () => fetchApi<CategoryData[]>("/categories"),
  create: (data: CategoryCreateData) =>
    fetchApi<CategoryData>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Bookmarks API ───────────────────────────────────────────────────────────

export const bookmarksApi = {
  list: () => fetchApi<BookmarkData[]>("/bookmarks"),
  toggle: (question_id: string) =>
    fetchApi<BookmarkData>("/bookmarks", {
      method: "POST",
      body: JSON.stringify({ question_id }),
    }),
  remove: (question_id: string) =>
    fetchApi<void>(`/bookmarks/${question_id}`, { method: "DELETE" }),
};

// ── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  xp: number;
  streak: number;
  is_admin: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface QuestionListItem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category_id: string;
  category_name: string;
  tags: string | null;
  companies: string | null;
  is_solved: boolean;
  is_bookmarked: boolean;
}

export interface QuestionDetail {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category_id: string;
  category_name: string;
  schema_sql: string;
  sample_data_sql?: string | null;
  hint?: string | null;
  tags?: string | null;
  companies?: string | null;
  expected_query?: string | null;
  is_solved: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

export interface QuestionCreateData {
  title: string;
  description: string;
  difficulty: string;
  category_id: string;
  schema_sql: string;
  sample_data_sql?: string;
  expected_query: string;
  hint?: string;
  tags?: string;
  companies?: string;
  is_published?: boolean;
}

export interface ExecuteResult {
  columns: string[];
  rows: unknown[][];
  execution_time_ms: number;
  error: string | null;
  row_count: number;
}

export interface SubmitResult {
  is_correct: boolean;
  execution_time_ms: number;
  error: string | null;
  expected_columns: string[];
  expected_rows: unknown[][];
  actual_columns: string[];
  actual_rows: unknown[][];
  xp_earned: number;
  message: string;
}

export interface DashboardData {
  total_solved: number;
  total_questions: number;
  current_streak: number;
  xp: number;
  accuracy: number;
  easy_solved: number;
  easy_total: number;
  medium_solved: number;
  medium_total: number;
  hard_solved: number;
  hard_total: number;
  weekly_activity: { date: string; day: string; count: number }[];
  activity_calendar: { date: string; count: number }[];
  recent_submissions: {
    id: string;
    question_title: string;
    question_difficulty: string;
    is_correct: boolean;
    execution_time_ms: number;
    created_at: string;
  }[];
}

export interface LeaderboardData {
  entries: {
    rank: number;
    user_id: string;
    name: string;
    avatar_url: string | null;
    xp: number;
    streak: number;
    solved_count: number;
  }[];
  total_users: number;
  current_user_rank: number | null;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  question_count: number;
  solved_count: number;
}

export interface CategoryCreateData {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface BookmarkData {
  id: string;
  question_id: string;
  question_title: string | null;
  question_difficulty: string | null;
  created_at: string;
}
