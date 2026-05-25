"""
ApexVision AI — Async Database Service
"""

import asyncio
import json
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from config.settings import settings


_engine = None
_session_factory = None


async def init_db():
    """Initialize async PostgreSQL connection."""
    global _engine, _session_factory
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from models import Base

        db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
        _engine = create_async_engine(db_url, pool_pre_ping=True, echo=False)
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        _session_factory = sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
        return True
    except Exception as e:
        return False


@asynccontextmanager
async def get_session():
    """Get an async database session."""
    if _session_factory is None:
        yield None
        return
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def log_commentary(session_id: str, lap: int, commentary: Dict) -> bool:
    """Persist commentary to database."""
    async with get_session() as db:
        if db is None:
            return False
        try:
            from models import CommentaryLog
            import uuid
            log = CommentaryLog(
                session_id=uuid.UUID(session_id) if len(session_id) == 36 else None,
                lap=lap,
                commentary=commentary.get("commentary", ""),
                event_type=commentary.get("event_type", "general"),
                excitement_level=commentary.get("excitement_level", 0.5),
                tactical_insight=commentary.get("tactical_insight"),
            )
            db.add(log)
            return True
        except Exception:
            return False
