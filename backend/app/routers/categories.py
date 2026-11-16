from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Category, Question, Submission, User
from app.schemas.schemas import CategoryResponse, CategoryCreateRequest
from app.services.auth_service import get_optional_user, require_admin

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List all categories with question counts."""
    categories = db.query(Category).order_by(Category.sort_order, Category.name).all()

    # Get solved question IDs for current user
    solved_ids = set()
    if current_user:
        solved_ids = set(
            r[0] for r in db.query(Submission.question_id)
            .filter(Submission.user_id == current_user.id, Submission.is_correct == True)
            .distinct()
            .all()
        )

    result = []
    for cat in categories:
        q_count = db.query(Question).filter(
            Question.category_id == cat.id,
            Question.is_published == True,
        ).count()

        solved_count = 0
        if current_user:
            questions_in_cat = db.query(Question.id).filter(
                Question.category_id == cat.id,
                Question.is_published == True,
            ).all()
            solved_count = sum(1 for q in questions_in_cat if q[0] in solved_ids)

        result.append(CategoryResponse(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            description=cat.description,
            icon=cat.icon,
            color=cat.color,
            sort_order=cat.sort_order,
            question_count=q_count,
            solved_count=solved_count,
        ))

    return result


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new category (admin only)."""
    existing = db.query(Category).filter(Category.slug == body.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category with this slug already exists")

    category = Category(
        name=body.name,
        slug=body.slug,
        description=body.description,
        icon=body.icon,
        color=body.color,
        sort_order=body.sort_order,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return CategoryResponse(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        icon=category.icon,
        color=category.color,
        sort_order=category.sort_order,
        question_count=0,
        solved_count=0,
    )
