"""
ApexVision AI — Redis Streaming Client
Provides async Redis access with graceful in-memory fallback.
"""

import json
import asyncio
from typing import Optional, Dict, Any, List
import redis.asyncio as aioredis
from config.settings import settings

_redis: Optional[aioredis.Redis] = None
_fallback_store: Dict[str, Any] = {}  # in-memory fallback
_use_fallback = False


async def init_redis():
    global _redis, _use_fallback
    try:
        client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=False,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        await client.ping()
        _redis = client
        _use_fallback = False
    except Exception as e:
        _redis = None
        _use_fallback = True


async def close_redis():
    global _redis
    if _redis:
        try:
            await _redis.close()
        except Exception:
            pass
        _redis = None


class _MemoryRedis:
    """In-memory Redis substitute when Redis is unavailable."""

    async def get(self, key: str) -> Optional[bytes]:
        val = _fallback_store.get(key)
        if val is None:
            return None
        if isinstance(val, str):
            return val.encode()
        return val

    async def set(self, key: str, value: Any, ex: int = None) -> bool:
        if isinstance(value, bytes):
            value = value.decode()
        _fallback_store[key] = str(value)
        return True

    async def lpush(self, key: str, *values) -> int:
        lst = _fallback_store.setdefault(key, [])
        if not isinstance(lst, list):
            lst = []
            _fallback_store[key] = lst
        for v in values:
            if isinstance(v, bytes):
                v = v.decode()
            lst.insert(0, v)
        return len(lst)

    async def ltrim(self, key: str, start: int, stop: int) -> bool:
        lst = _fallback_store.get(key, [])
        if isinstance(lst, list):
            _fallback_store[key] = lst[start:stop + 1]
        return True

    async def lrange(self, key: str, start: int, stop: int) -> List[bytes]:
        lst = _fallback_store.get(key, [])
        if not isinstance(lst, list):
            return []
        sliced = lst[start:stop + 1] if stop >= 0 else lst[start:]
        return [v.encode() if isinstance(v, str) else v for v in sliced]

    async def expire(self, key: str, seconds: int) -> bool:
        return True

    async def ping(self) -> bool:
        return True


_mem_redis = _MemoryRedis()


async def get_redis():
    """Return Redis client or in-memory fallback — never raises."""
    global _redis, _use_fallback
    if _use_fallback or _redis is None:
        return _mem_redis
    try:
        await _redis.ping()
        return _redis
    except Exception:
        _use_fallback = True
        return _mem_redis
