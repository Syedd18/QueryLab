from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Question, Submission
from app.schemas.schemas import ExecuteRequest, ExecuteResponse, SubmitRequest, SubmitResponse
from app.services.auth_service import get_current_user, get_optional_user
from app.services.sql_engine import execute_sql, compare_results
from typing import Optional

router = APIRouter(prefix="/api/sql", tags=["SQL Execution"])

# XP rewards by difficulty
XP_REWARDS = {
    "Easy": 10,
    "Medium": 25,
    "Hard": 50,
}


@router.post("/execute", response_model=ExecuteResponse)
def execute_query(
    body: ExecuteRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Execute a SQL query against the question's SQLite database.
    Returns the result without checking correctness.
    Open to guests so anyone can practice; grading (submit) still requires auth.
    """
    question = db.query(Question).filter(Question.id == body.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db_path = question.sqlite_db_path or f"{question.id}.db"
    result = execute_sql(body.sql, db_path)

    return ExecuteResponse(
        columns=result["columns"],
        rows=result["rows"],
        execution_time_ms=result["execution_time_ms"],
        error=result["error"],
        row_count=result["row_count"],
    )


@router.post("/submit", response_model=SubmitResponse)
def submit_query(
    body: SubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a SQL query for grading. Compares against expected output.
    Awards XP for first correct submission.
    """
    question = db.query(Question).filter(Question.id == body.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db_path = question.sqlite_db_path or f"{question.id}.db"

    # Execute user's query
    user_result = execute_sql(body.sql, db_path)

    if user_result["error"]:
        # Save failed submission
        submission = Submission(
            user_id=current_user.id,
            question_id=body.question_id,
            submitted_sql=body.sql,
            is_correct=False,
            execution_time_ms=user_result["execution_time_ms"],
            error_message=user_result["error"],
        )
        db.add(submission)
        db.commit()

        return SubmitResponse(
            is_correct=False,
            execution_time_ms=user_result["execution_time_ms"],
            error=user_result["error"],
            actual_columns=user_result["columns"],
            actual_rows=user_result["rows"],
            message="Your query produced an error.",
        )

    # Execute expected query
    expected_result = execute_sql(question.expected_query, db_path)

    if expected_result["error"]:
        return SubmitResponse(
            is_correct=False,
            error=f"Internal error with expected query: {expected_result['error']}",
            message="There was an error with the expected query. Please contact an admin.",
        )

    # Check if ORDER BY is present in user's query
    check_order = "ORDER BY" in body.sql.upper()

    # Compare results
    is_correct, message = compare_results(user_result, expected_result, check_order=check_order)

    # Save submission
    submission = Submission(
        user_id=current_user.id,
        question_id=body.question_id,
        submitted_sql=body.sql,
        is_correct=is_correct,
        execution_time_ms=user_result["execution_time_ms"],
        error_message=None if is_correct else message,
    )
    db.add(submission)

    # Award XP for first correct submission on this question
    xp_earned = 0
    if is_correct:
        already_solved = db.query(Submission).filter(
            Submission.user_id == current_user.id,
            Submission.question_id == body.question_id,
            Submission.is_correct == True,
            Submission.id != submission.id,
        ).first()

        if not already_solved:
            difficulty = question.difficulty.value if hasattr(question.difficulty, 'value') else question.difficulty
            xp_earned = XP_REWARDS.get(difficulty, 10)
            current_user.xp += xp_earned

            # Update streak
            today = datetime.utcnow().date()
            if current_user.last_active_date:
                last_active = current_user.last_active_date.date() if isinstance(current_user.last_active_date, datetime) else current_user.last_active_date
                delta = (today - last_active).days
                if delta == 1:
                    current_user.streak += 1
                elif delta > 1:
                    current_user.streak = 1
            else:
                current_user.streak = 1
            current_user.last_active_date = datetime.utcnow()

    db.commit()

    return SubmitResponse(
        is_correct=is_correct,
        execution_time_ms=user_result["execution_time_ms"],
        expected_columns=expected_result["columns"],
        expected_rows=expected_result["rows"][:10],  # Limit to 10 rows
        actual_columns=user_result["columns"],
        actual_rows=user_result["rows"][:10],
        xp_earned=xp_earned,
        message=message,
    )
