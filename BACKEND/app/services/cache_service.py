from typing import Dict, Tuple, Any
import time

class TranslationCache:
    def __init__(self):
        self._store: Dict[str, Tuple[float, Any]] = {}
        self.hits = 0
        self.misses = 0
        self.ttl_seconds = 3600

    def _key(self, release: str | None, direction: str, identifier: str) -> str:
        return f"{release or 'none'}|{direction}|{identifier}".lower()

    def get(self, release: str | None, direction: str, identifier: str):
        k = self._key(release, direction, identifier)
        tup = self._store.get(k)
        if not tup:
            self.misses += 1
            return None
        ts, val = tup
        if time.time() - ts > self.ttl_seconds:
            self._store.pop(k, None)
            self.misses += 1
            return None
        self.hits += 1
        return val

    def set(self, release: str | None, direction: str, identifier: str, value: Any):
        k = self._key(release, direction, identifier)
        self._store[k] = (time.time(), value)

    def stats(self):
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": (self.hits / total) if total else 0,
            "entries": len(self._store)
        }

translation_cache = TranslationCache()
