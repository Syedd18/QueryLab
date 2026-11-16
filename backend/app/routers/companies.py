import re
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Question

router = APIRouter(prefix="/api/companies", tags=["Companies"])


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@router.get("")
def list_companies(db: Session = Depends(get_db)):
    """Aggregate the companies referenced by published questions, with counts."""
    rows = (
        db.query(Question.companies)
        .filter(Question.is_published == True, Question.companies.isnot(None))
        .all()
    )
    counter: Counter = Counter()
    for (comp,) in rows:
        if not comp:
            continue
        for name in comp.split(","):
            n = name.strip()
            if n:
                counter[n] += 1

    data = [
        {"name": name, "slug": _slug(name), "question_count": count}
        for name, count in counter.items()
    ]
    data.sort(key=lambda x: (-x["question_count"], x["name"]))
    return {"companies": data, "total": len(data)}
