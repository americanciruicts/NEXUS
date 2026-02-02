"""
Database Helper Utilities
Provides transaction management and error handling helpers
"""

from functools import wraps
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


def with_transaction(func):
    """
    Decorator to wrap database operations in a transaction with automatic rollback on error
    Usage:
        @with_transaction
        async def my_endpoint(db: Session = Depends(get_db)):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Find the db session in kwargs
        db = kwargs.get('db')
        if not db:
            # Try to find it in args
            for arg in args:
                if isinstance(arg, Session):
                    db = arg
                    break

        if not db:
            raise ValueError("No database session found in function arguments")

        try:
            result = await func(*args, **kwargs)
            db.commit()
            return result
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Transaction error in {func.__name__}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return wrapper


def safe_query(query, error_message="Resource not found"):
    """
    Safely execute a query and return first result or raise 404
    """
    result = query.first()
    if not result:
        raise HTTPException(status_code=404, detail=error_message)
    return result


def validate_positive_number(value: float | int, field_name: str) -> None:
    """Validate that a number is positive"""
    if value < 0:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot be negative")


def validate_date_range(start_date, end_date, start_name="start_date", end_name="end_date") -> None:
    """Validate that end_date is after start_date"""
    if end_date and start_date and end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail=f"{end_name} must be after {start_name}"
        )
