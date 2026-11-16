from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case

from app.database.session import get_db
from app.models.models import User, Question, Submission, DifficultyLevel
from app.schemas.schemas import DashboardResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dashboard statistics for the current user."""
    user_id = current_user.id

    # Total solved (unique questions)
    solved_query = (
        db.query(Submission.question_id)
        .filter(Submission.user_id == user_id, Submission.is_correct == True)
        .distinct()
    )
    total_solved = solved_query.count()
    solved_ids = [r[0] for r in solved_query.all()]

    # Total questions
    total_questions = db.query(Question).filter(Question.is_published == True).count()

    # Accuracy
    total_submissions = db.query(Submission).filter(Submission.user_id == user_id).count()
    correct_submissions = db.query(Submission).filter(
        Submission.user_id == user_id,
        Submission.is_correct == True,
    ).count()
    accuracy = round((correct_submissions / total_submissions * 100), 1) if total_submissions > 0 else 0

    # Difficulty breakdown
    def count_by_difficulty(difficulty: DifficultyLevel, solved: bool = False):
        query = db.query(Question).filter(
            Question.is_published == True,
            Question.difficulty == difficulty,
        )
        if solved:
            query = query.filter(Question.id.in_(solved_ids))
        return query.count()

    easy_total = count_by_difficulty(DifficultyLevel.EASY)
    easy_solved = count_by_difficulty(DifficultyLevel.EASY, solved=True)
    medium_total = count_by_difficulty(DifficultyLevel.MEDIUM)
    medium_solved = count_by_difficulty(DifficultyLevel.MEDIUM, solved=True)
    hard_total = count_by_difficulty(DifficultyLevel.HARD)
    hard_solved = count_by_difficulty(DifficultyLevel.HARD, solved=True)

    # Activity history: one grouped query over the window, then derive the
    # 7-day strip and the ~26-week contribution calendar from the same map.
    today = datetime.utcnow().date()
    CALENDAR_DAYS = 26 * 7  # 182 days
    window_start = today - timedelta(days=CALENDAR_DAYS - 1)
    window_start_dt = datetime.combine(window_start, datetime.min.time())

    rows = (
        db.query(
            func.date(Submission.created_at).label("d"),
            func.count().label("c"),
        )
        .filter(
            Submission.user_id == user_id,
            Submission.created_at >= window_start_dt,
        )
        .group_by(func.date(Submission.created_at))
        .all()
    )

    def _key(d):
        return d.isoformat() if hasattr(d, "isoformat") else str(d)[:10]

    counts_by_day = {_key(r.d): int(r.c) for r in rows}

    weekly_activity = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        weekly_activity.append({
            "date": day.isoformat(),
            "day": day.strftime("%a"),
            "count": counts_by_day.get(day.isoformat(), 0),
        })

    activity_calendar = []
    for i in range(CALENDAR_DAYS - 1, -1, -1):
        day = today - timedelta(days=i)
        activity_calendar.append({
            "date": day.isoformat(),
            "count": counts_by_day.get(day.isoformat(), 0),
        })

    # Recent submissions (last 10)
    recent = (
        db.query(Submission)
        .filter(Submission.user_id == user_id)
        .order_by(Submission.created_at.desc())
        .limit(10)
        .all()
    )
    recent_submissions = []
    for sub in recent:
        q = db.query(Question).filter(Question.id == sub.question_id).first()
        recent_submissions.append({
            "id": sub.id,
            "question_title": q.title if q else "Unknown",
            "question_difficulty": q.difficulty.value if q and hasattr(q.difficulty, 'value') else str(q.difficulty) if q else "Unknown",
            "is_correct": sub.is_correct,
            "execution_time_ms": sub.execution_time_ms,
            "created_at": sub.created_at.isoformat(),
        })

    return DashboardResponse(
        total_solved=total_solved,
        total_questions=total_questions,
        current_streak=current_user.streak,
        xp=current_user.xp,
        accuracy=accuracy,
        easy_solved=easy_solved,
        easy_total=easy_total,
        medium_solved=medium_solved,
        medium_total=medium_total,
        hard_solved=hard_solved,
        hard_total=hard_total,
        weekly_activity=weekly_activity,
        activity_calendar=activity_calendar,
        recent_submissions=recent_submissions,
    )
