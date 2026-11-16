from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import User, Question, Category, Submission, Bookmark, DifficultyLevel
from app.schemas.schemas import (
    QuestionListResponse,
    QuestionDetailResponse,
    QuestionCreateRequest,
    QuestionUpdateRequest,
    PaginatedResponse,
)
from app.services.auth_service import get_current_user, get_optional_user, require_admin

router = APIRouter(prefix="/api/questions", tags=["Questions"])


@router.get("", response_model=PaginatedResponse)
def list_questions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    difficulty: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List all published questions with pagination and filters."""
    query = db.query(Question).filter(Question.is_published == True)

    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if category_id:
        query = query.filter(Question.category_id == category_id)
    if company:
        query = query.filter(Question.companies.ilike(f"%{company}%"))
    if search:
        query = query.filter(Question.title.ilike(f"%{search}%"))

    total = query.count()
    total_pages = (total + per_page - 1) // per_page
    questions = query.order_by(Question.sort_order, Question.created_at).offset((page - 1) * per_page).limit(per_page).all()

    # Get solved/bookmarked status for current user
    solved_ids = set()
    bookmarked_ids = set()
    if current_user:
        solved_ids = set(
            r[0] for r in db.query(Submission.question_id)
            .filter(Submission.user_id == current_user.id, Submission.is_correct == True)
            .distinct()
            .all()
        )
        bookmarked_ids = set(
            r[0] for r in db.query(Bookmark.question_id)
            .filter(Bookmark.user_id == current_user.id)
            .all()
        )

    items = []
    for q in questions:
        cat_name = q.category.name if q.category else None
        items.append(QuestionListResponse(
            id=q.id,
            title=q.title,
            difficulty=q.difficulty.value if hasattr(q.difficulty, 'value') else q.difficulty,
            category_id=q.category_id,
            category_name=cat_name,
            tags=q.tags,
            companies=q.companies,
            external_url=q.external_url,
            is_solved=q.id in solved_ids,
            is_bookmarked=q.id in bookmarked_ids,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{question_id}", response_model=QuestionDetailResponse)
def get_question(
    question_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Get detailed information about a specific question."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_solved = False
    is_bookmarked = False
    if current_user:
        is_solved = db.query(Submission).filter(
            Submission.user_id == current_user.id,
            Submission.question_id == question_id,
            Submission.is_correct == True,
        ).first() is not None
        is_bookmarked = db.query(Bookmark).filter(
            Bookmark.user_id == current_user.id,
            Bookmark.question_id == question_id,
        ).first() is not None

    cat_name = question.category.name if question.category else None

    # Only show expected_query to admins
    expected_query = None
    if current_user and current_user.is_admin:
        expected_query = question.expected_query

    return QuestionDetailResponse(
        id=question.id,
        title=question.title,
        description=question.description,
        difficulty=question.difficulty.value if hasattr(question.difficulty, 'value') else question.difficulty,
        category_id=question.category_id,
        category_name=cat_name,
        schema_sql=question.schema_sql,
        sample_data_sql=question.sample_data_sql,
        hint=question.hint,
        tags=question.tags,
        companies=question.companies,
        external_url=question.external_url,
        expected_query=expected_query,
        is_solved=is_solved,
        is_bookmarked=is_bookmarked,
        created_at=question.created_at,
    )


@router.get("/{question_id}/solution")
def get_question_solution(
    question_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Return the reference solution(s) for a question, revealed on demand."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    solutions = [question.expected_query] if question.expected_query else []
    return {"question_id": question.id, "solutions": solutions}


@router.post("", response_model=QuestionDetailResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    body: QuestionCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new question (admin only)."""
    category = db.query(Category).filter(Category.id == body.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    question = Question(
        title=body.title,
        description=body.description,
        difficulty=DifficultyLevel(body.difficulty),
        category_id=body.category_id,
        schema_sql=body.schema_sql,
        sample_data_sql=body.sample_data_sql,
        expected_query=body.expected_query,
        hint=body.hint,
        tags=body.tags,
        companies=body.companies,
        is_published=body.is_published,
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return QuestionDetailResponse(
        id=question.id,
        title=question.title,
        description=question.description,
        difficulty=question.difficulty.value,
        category_id=question.category_id,
        category_name=category.name,
        schema_sql=question.schema_sql,
        sample_data_sql=question.sample_data_sql,
        hint=question.hint,
        tags=question.tags,
        companies=question.companies,
        expected_query=question.expected_query,
        is_solved=False,
        is_bookmarked=False,
        created_at=question.created_at,
    )


@router.put("/{question_id}", response_model=QuestionDetailResponse)
def update_question(
    question_id: str,
    body: QuestionUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a question (admin only)."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    update_data = body.model_dump(exclude_unset=True)
    if "difficulty" in update_data:
        update_data["difficulty"] = DifficultyLevel(update_data["difficulty"])

    for key, value in update_data.items():
        setattr(question, key, value)

    db.commit()
    db.refresh(question)

    cat_name = question.category.name if question.category else None
    return QuestionDetailResponse(
        id=question.id,
        title=question.title,
        description=question.description,
        difficulty=question.difficulty.value if hasattr(question.difficulty, 'value') else question.difficulty,
        category_id=question.category_id,
        category_name=cat_name,
        schema_sql=question.schema_sql,
        sample_data_sql=question.sample_data_sql,
        hint=question.hint,
        tags=question.tags,
        companies=question.companies,
        expected_query=question.expected_query,
        is_solved=False,
        is_bookmarked=False,
        created_at=question.created_at,
    )


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a question (admin only)."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
