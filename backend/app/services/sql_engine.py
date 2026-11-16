"""
Secure SQL Execution Engine

Provides a sandboxed SQLite environment for executing user SQL queries.
Only SELECT-type statements are allowed. All DDL/DML operations are rejected.
"""

import re
import time
import sqlite3
import os
from typing import Tuple, List, Optional

from app.config import get_settings

settings = get_settings()

# Allowed SQL keywords/patterns (read-only operations)
ALLOWED_PATTERNS = [
    r"^\s*SELECT\b",
    r"^\s*WITH\b",
]

# Explicitly forbidden SQL operations
FORBIDDEN_KEYWORDS = [
    "DELETE", "UPDATE", "DROP", "ALTER", "TRUNCATE",
    "INSERT", "CREATE", "REPLACE", "RENAME", "GRANT",
    "REVOKE", "EXEC", "EXECUTE", "ATTACH", "DETACH",
    "PRAGMA", "VACUUM", "REINDEX",
]

FORBIDDEN_PATTERN = re.compile(
    r"\b(" + "|".join(FORBIDDEN_KEYWORDS) + r")\b",
    re.IGNORECASE,
)


def validate_sql(sql: str) -> Tuple[bool, Optional[str]]:
    """
    Validate that the SQL query is safe to execute.
    Returns (is_valid, error_message).
    """
    cleaned = sql.strip()

    if not cleaned:
        return False, "SQL query cannot be empty"

    # Check for forbidden keywords
    match = FORBIDDEN_PATTERN.search(cleaned)
    if match:
        return False, f"Forbidden SQL operation: {match.group(0).upper()}"

    # Remove comments
    cleaned_no_comments = re.sub(r"--.*$", "", cleaned, flags=re.MULTILINE)
    cleaned_no_comments = re.sub(r"/\*.*?\*/", "", cleaned_no_comments, flags=re.DOTALL)
    cleaned_no_comments = cleaned_no_comments.strip()

    # Check if it starts with an allowed pattern
    is_allowed = any(
        re.match(pattern, cleaned_no_comments, re.IGNORECASE)
        for pattern in ALLOWED_PATTERNS
    )

    if not is_allowed:
        return False, "Only SELECT and WITH (CTE) queries are allowed"

    # Check for multiple statements (prevent injection via semicolons)
    # Allow semicolon at the end but not in the middle
    parts = [p.strip() for p in cleaned_no_comments.rstrip(";").split(";") if p.strip()]
    if len(parts) > 1:
        return False, "Multiple SQL statements are not allowed"

    return True, None


def execute_sql(
    sql: str,
    db_path: str,
    timeout: float = 5.0,
) -> dict:
    """
    Execute a SQL query against a SQLite database in read-only mode.
    
    Returns:
        dict with keys: columns, rows, execution_time_ms, error, row_count
    """
    # Validate SQL first
    is_valid, error_msg = validate_sql(sql)
    if not is_valid:
        return {
            "columns": [],
            "rows": [],
            "execution_time_ms": 0,
            "error": error_msg,
            "row_count": 0,
        }

    # Resolve database path
    full_path = os.path.join(settings.SANDBOX_DB_DIR, db_path) if not os.path.isabs(db_path) else db_path

    if not os.path.exists(full_path):
        return {
            "columns": [],
            "rows": [],
            "execution_time_ms": 0,
            "error": f"Database file not found: {db_path}",
            "row_count": 0,
        }

    try:
        # Open in read-only mode using URI
        uri = f"file:{full_path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=timeout)
        conn.execute("PRAGMA query_only = ON")
        cursor = conn.cursor()

        start_time = time.perf_counter()
        cursor.execute(sql)
        rows = cursor.fetchall()
        end_time = time.perf_counter()

        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        execution_time_ms = round((end_time - start_time) * 1000, 2)

        conn.close()

        return {
            "columns": columns,
            "rows": [list(row) for row in rows],
            "execution_time_ms": execution_time_ms,
            "error": None,
            "row_count": len(rows),
        }

    except sqlite3.OperationalError as e:
        return {
            "columns": [],
            "rows": [],
            "execution_time_ms": 0,
            "error": f"SQL Error: {str(e)}",
            "row_count": 0,
        }
    except Exception as e:
        return {
            "columns": [],
            "rows": [],
            "execution_time_ms": 0,
            "error": f"Execution error: {str(e)}",
            "row_count": 0,
        }


def compare_results(
    actual: dict,
    expected: dict,
    check_order: bool = False,
) -> Tuple[bool, str]:
    """
    Compare the user's query result against the expected output.
    
    Args:
        actual: Result from user's query
        expected: Result from expected query
        check_order: If True, row order must match
    
    Returns:
        (is_correct, message)
    """
    if actual.get("error"):
        return False, f"Query produced an error: {actual['error']}"

    actual_cols = [c.lower() for c in actual.get("columns", [])]
    expected_cols = [c.lower() for c in expected.get("columns", [])]

    if sorted(actual_cols) != sorted(expected_cols):
        return False, f"Column mismatch. Expected: {expected_cols}, Got: {actual_cols}"

    # Normalize rows to match column order
    if actual_cols != expected_cols:
        # Reorder actual rows to match expected column order
        col_mapping = {col: idx for idx, col in enumerate(actual_cols)}
        reordered_rows = []
        for row in actual.get("rows", []):
            reordered = [row[col_mapping[col]] for col in expected_cols]
            reordered_rows.append(reordered)
        actual_rows = reordered_rows
    else:
        actual_rows = actual.get("rows", [])

    expected_rows = expected.get("rows", [])

    if len(actual_rows) != len(expected_rows):
        return False, f"Row count mismatch. Expected {len(expected_rows)} rows, got {len(actual_rows)}"

    # Normalize values for comparison (handle None, floats, etc.)
    def normalize_row(row):
        return tuple(
            round(v, 6) if isinstance(v, float) else str(v).strip() if v is not None else None
            for v in row
        )

    if check_order:
        for i, (actual_row, expected_row) in enumerate(zip(actual_rows, expected_rows)):
            if normalize_row(actual_row) != normalize_row(expected_row):
                return False, f"Row {i + 1} mismatch"
    else:
        actual_set = sorted([normalize_row(r) for r in actual_rows])
        expected_set = sorted([normalize_row(r) for r in expected_rows])
        if actual_set != expected_set:
            return False, "Row values do not match the expected output"

    return True, "Correct! Your query produces the expected output."
