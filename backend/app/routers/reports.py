from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Report, Question, User
from app.schemas.schemas import ReportCreateRequest, ReportResponse, ReportStatusUpdate
from app.services.auth_service import get_optional_user, require_admin

router = APIRouter(prefix="/api/reports", tags=["Reports"])

ALLOWED_CATEGORIES = {
    "Incorrect expected output",
    "Question is unclear",
    "Schema or data issue",
    "Typo or wording",
    "Something else",
}


def _to_response(r: Report, db: Session) -> ReportResponse:
    q = db.query(Question).filter(Question.id == r.question_id).first() if r.question_id else None
    u = db.query(User).filter(User.id == r.user_id).first() if r.user_id else None
    return ReportResponse(
        id=r.id,
        question_id=r.question_id,
        question_title=q.title if q else None,
        user_name=u.name if u else None,
        category=r.category,
        message=r.message,
        status=r.status,
        created_at=r.created_at,
    )


@router.post("", response_model=ReportResponse, status_code=201)
def create_report(
    body: ReportCreateRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Submit a problem report. Open to everyone (guests included)."""
    category = body.category if body.category in ALLOWED_CATEGORIES else "Something else"
    report = Report(
        question_id=body.question_id,
        user_id=current_user.id if current_user else None,
        category=category,
        message=body.message.strip(),
        status="open",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return _to_response(report, db)


@router.get("", response_model=list[ReportResponse])
def list_reports(
    status: Optional[str] = Query(None, pattern="^(open|resolved)$"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all reports, newest first (admin only)."""
    query = db.query(Report).order_by(Report.created_at.desc())
    if status:
        query = query.filter(Report.status == status)
    return [_to_response(r, db) for r in query.all()]


@router.patch("/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: str,
    body: ReportStatusUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Mark a report open/resolved (admin only)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = body.status
    db.commit()
    db.refresh(report)
    return _to_response(report, db)
