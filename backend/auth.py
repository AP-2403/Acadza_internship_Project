"""
Simple in-memory auth utilities.
Token format: username_timestamp
"""
import time
from typing import Optional

# In-memory session store: token -> user dict
active_sessions: dict[str, dict] = {}


def create_token(username: str) -> str:
    token = f"{username}_{int(time.time() * 1000)}"
    return token


def store_session(token: str, user: dict) -> None:
    active_sessions[token] = user


def get_current_user(token: str) -> Optional[dict]:
    return active_sessions.get(token)


def remove_session(token: str) -> None:
    active_sessions.pop(token, None)
