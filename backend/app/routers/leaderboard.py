from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import User, Submission
from app.schemas.schemas import LeaderboardResponse, LeaderboardEntry
from app.services.auth_service import get_optional_user

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=LeaderboardResponse)
def get_leaderboard(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Get the global leaderboard ranked by XP."""
    # Get all users ordered by XP
    users = (
        db.query(User)
        .order_by(User.xp.desc(), User.streak.desc())
        .limit(limit)
        .all()
    )

    total_users = db.query(User).count()

    entries = []
    for rank, user in enumerate(users, 1):
        solved_count = (
            db.query(Submission.question_id)
            .filter(Submission.user_id == user.id, Submission.is_correct == True)
            .distinct()
            .count()
        )
        entries.append(LeaderboardEntry(
            rank=rank,
            user_id=user.id,
            name=user.name,
            avatar_url=user.avatar_url,
            xp=user.xp,
            streak=user.streak,
            solved_count=solved_count,
        ))

    # Get current user's rank
    current_user_rank = None
    if current_user:
        higher_xp_count = db.query(User).filter(User.xp > current_user.xp).count()
        current_user_rank = higher_xp_count + 1

    return LeaderboardResponse(
        entries=entries,
        total_users=total_users,
        current_user_rank=current_user_rank,
    )
