from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# ── User Schemas ──────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    xp: int = 0
    streak: int = 0
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)


# ── Category Schemas ──────────────────────────────────────────────────────────

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0
    question_count: int = 0
    solved_count: int = 0

    class Config:
        from_attributes = True


class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0


# ── Question Schemas ─────────────────────────────────────────────────────────

class QuestionListResponse(BaseModel):
    id: str
    title: str
    difficulty: str
    category_id: str
    category_name: Optional[str] = None
    tags: Optional[str] = None
    companies: Optional[str] = None
    external_url: Optional[str] = None
    is_solved: bool = False
    is_bookmarked: bool = False

    class Config:
        from_attributes = True


class QuestionDetailResponse(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    category_id: str
    category_name: Optional[str] = None
    schema_sql: str
    sample_data_sql: Optional[str] = None
    hint: Optional[str] = None
    tags: Optional[str] = None
    companies: Optional[str] = None
    external_url: Optional[str] = None
    expected_query: Optional[str] = None  # Only for admin
    is_solved: bool = False
    is_bookmarked: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=300)
    description: str = Field(..., min_length=10)
    difficulty: str = Field(..., pattern="^(Easy|Medium|Hard)$")
    category_id: str
    schema_sql: str
    sample_data_sql: Optional[str] = None
    expected_query: str
    hint: Optional[str] = None
    tags: Optional[str] = None
    companies: Optional[str] = None
    is_published: bool = True


class QuestionUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=300)
    description: Optional[str] = None
    difficulty: Optional[str] = Field(None, pattern="^(Easy|Medium|Hard)$")
    category_id: Optional[str] = None
    schema_sql: Optional[str] = None
    sample_data_sql: Optional[str] = None
    expected_query: Optional[str] = None
    hint: Optional[str] = None
    tags: Optional[str] = None
    companies: Optional[str] = None
    is_published: Optional[bool] = None


# ── Execution Schemas ────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    sql: str = Field(..., min_length=1)
    question_id: str


class ExecuteResponse(BaseModel):
    columns: List[str] = []
    rows: List[List] = []
    execution_time_ms: float = 0
    error: Optional[str] = None
    row_count: int = 0


class SubmitRequest(BaseModel):
    sql: str = Field(..., min_length=1)
    question_id: str


class SubmitResponse(BaseModel):
    is_correct: bool
    execution_time_ms: float = 0
    error: Optional[str] = None
    expected_columns: List[str] = []
    expected_rows: List[List] = []
    actual_columns: List[str] = []
    actual_rows: List[List] = []
    xp_earned: int = 0
    message: str = ""


# ── Dashboard Schemas ────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    total_solved: int = 0
    total_questions: int = 0
    current_streak: int = 0
    xp: int = 0
    accuracy: float = 0.0
    easy_solved: int = 0
    easy_total: int = 0
    medium_solved: int = 0
    medium_total: int = 0
    hard_solved: int = 0
    hard_total: int = 0
    weekly_activity: List[dict] = []
    activity_calendar: List[dict] = []
    recent_submissions: List[dict] = []


# ── Leaderboard Schemas ─────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    avatar_url: Optional[str] = None
    xp: int
    streak: int
    solved_count: int

    class Config:
        from_attributes = True


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry] = []
    total_users: int = 0
    current_user_rank: Optional[int] = None


# ── Bookmark Schemas ─────────────────────────────────────────────────────────

class BookmarkToggleRequest(BaseModel):
    question_id: str


class BookmarkResponse(BaseModel):
    id: str
    question_id: str
    question_title: Optional[str] = None
    question_difficulty: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Pagination ───────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List = []
    total: int = 0
    page: int = 1
    per_page: int = 20
    total_pages: int = 0


# Resolve forward references
TokenResponse.model_rebuild()


# ── Report Schemas ───────────────────────────────────────────────────────────

class ReportCreateRequest(BaseModel):
    question_id: Optional[str] = None
    category: str = Field(..., max_length=60)
    message: str = Field(..., min_length=3, max_length=2000)


class ReportResponse(BaseModel):
    id: str
    question_id: Optional[str] = None
    question_title: Optional[str] = None
    user_name: Optional[str] = None
    category: str
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|resolved)$")
