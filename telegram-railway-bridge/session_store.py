from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass(frozen=True)
class ChatMessage:
    role: str
    text: str


class SessionStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                PRAGMA journal_mode=WAL;

                CREATE TABLE IF NOT EXISTS chats (
                    chat_id INTEGER PRIMARY KEY,
                    telegram_user_id INTEGER,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    text TEXT NOT NULL,
                    telegram_message_id INTEGER,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS updates (
                    update_id INTEGER PRIMARY KEY,
                    chat_id INTEGER,
                    status TEXT NOT NULL,
                    error_text TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )

    def claim_update(self, update_id: int, chat_id: Optional[int]) -> bool:
        now = _utc_now()
        with self._connect() as conn:
            try:
                conn.execute(
                    """
                    INSERT INTO updates (update_id, chat_id, status, created_at, updated_at)
                    VALUES (?, ?, 'processing', ?, ?)
                    """,
                    (update_id, chat_id, now, now),
                )
                return True
            except sqlite3.IntegrityError:
                return False

    def finish_update(self, update_id: int, status: str, error_text: str = "") -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE updates
                SET status = ?, error_text = ?, updated_at = ?
                WHERE update_id = ?
                """,
                (status, error_text, _utc_now(), update_id),
            )

    def upsert_chat(
        self,
        chat_id: int,
        telegram_user_id: Optional[int],
        username: str,
        first_name: str,
        last_name: str,
    ) -> None:
        now = _utc_now()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO chats (
                    chat_id, telegram_user_id, username, first_name, last_name, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(chat_id) DO UPDATE SET
                    telegram_user_id = excluded.telegram_user_id,
                    username = excluded.username,
                    first_name = excluded.first_name,
                    last_name = excluded.last_name,
                    updated_at = excluded.updated_at
                """,
                (chat_id, telegram_user_id, username, first_name, last_name, now, now),
            )

    def append_message(
        self,
        chat_id: int,
        role: str,
        text: str,
        telegram_message_id: Optional[int] = None,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO messages (chat_id, role, text, telegram_message_id, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (chat_id, role, text, telegram_message_id, _utc_now()),
            )

    def get_recent_messages(self, chat_id: int, limit: int) -> List[ChatMessage]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT role, text
                FROM messages
                WHERE chat_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (chat_id, limit),
            ).fetchall()
        ordered = list(reversed(rows))
        return [ChatMessage(role=row["role"], text=row["text"]) for row in ordered]

    def clear_chat_history(self, chat_id: int) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
