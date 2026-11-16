from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Question, Bookmark
from app.schemas.schemas import BookmarkToggleRequest, BookmarkResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/bookmarks", tags=["Bookmarks"])


@router.get("", response_model=list[BookmarkResponse])
def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all bookmarked questions for the current user."""
    bookmarks = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )

    result = []
    for b in bookmarks:
        q = db.query(Question).filter(Question.id == b.question_id).first()
        result.append(BookmarkResponse(
            id=b.id,
            question_id=b.question_id,
            question_title=q.title if q else None,
            question_difficulty=q.difficulty.value if q and hasattr(q.difficulty, 'value') else str(q.difficulty) if q else None,
            created_at=b.created_at,
        ))

    return result


@router.post("", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def toggle_bookmark(
    body: BookmarkToggleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle a bookmark on a question. If already bookmarked, removes it."""
    question = db.query(Question).filter(Question.id == body.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.question_id == body.question_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        # Return a response indicating removal
        return BookmarkResponse(
            id=existing.id,
            question_id=body.question_id,
            question_title=question.title,
            question_difficulty=question.difficulty.value if hasattr(question.difficulty, 'value') else str(question.difficulty),
            created_at=existing.created_at,
        )

    bookmark = Bookmark(
        user_id=current_user.id,
        question_id=body.question_id,
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)

    return BookmarkResponse(
        id=bookmark.id,
        question_id=bookmark.question_id,
        question_title=question.title,
        question_difficulty=question.difficulty.value if hasattr(question.difficulty, 'value') else str(question.difficulty),
        created_at=bookmark.created_at,
    )


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a bookmark from a question."""
    bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.question_id == question_id,
    ).first()

    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bookmark)
    db.commit()
