from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


def _load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def _parse_bool(value: Optional[str], default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_csv_ints(value: Optional[str]) -> List[int]:
    if not value:
        return []
    result: List[int] = []
    for item in value.split(","):
        item = item.strip()
        if item:
            result.append(int(item))
    return result


@dataclass(frozen=True)
class Config:
    telegram_bot_token: str
    openai_api_key: str
    openai_model: str
    openai_reasoning_effort: str
    allowed_chat_ids: List[int]
    database_path: Path
    public_base_url: str
    webhook_path: str
    webhook_secret_token: str
    max_history_messages: int
    system_prompt: str
    log_level: str
    auto_register_webhook: bool

    @property
    def webhook_url(self) -> str:
        base = self.public_base_url.rstrip("/")
        path = self.webhook_path if self.webhook_path.startswith("/") else f"/{self.webhook_path}"
        return f"{base}{path}"

    @classmethod
    def from_env(cls, env_path: Optional[Path] = None) -> "Config":
        _load_dotenv(env_path or Path(__file__).resolve().parent / ".env")

        telegram_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
        openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not telegram_bot_token:
            raise ValueError("Missing TELEGRAM_BOT_TOKEN")
        if not openai_api_key:
            raise ValueError("Missing OPENAI_API_KEY")

        database_path = Path(
            os.environ.get(
                "DATABASE_PATH",
                str(Path(__file__).resolve().parent / "data" / "bridge.db"),
            )
        )

        default_prompt = (
            "You are a concise, practical Telegram assistant for a single user. "
            "Answer clearly and briefly. Keep momentum high. "
            "If the request is ambiguous, ask one short clarifying question. "
            "Do not claim to have done local Mac actions. "
            "You are running in an always-on cloud bridge. "
            "You may help plan tasks that will later be handed to a local executor."
        )

        return cls(
            telegram_bot_token=telegram_bot_token,
            openai_api_key=openai_api_key,
            openai_model=os.environ.get("OPENAI_MODEL", "gpt-5.4-mini").strip(),
            openai_reasoning_effort=os.environ.get(
                "OPENAI_REASONING_EFFORT", "medium"
            ).strip(),
            allowed_chat_ids=_parse_csv_ints(os.environ.get("ALLOWED_CHAT_IDS")),
            database_path=database_path,
            public_base_url=os.environ.get("PUBLIC_BASE_URL", "").strip(),
            webhook_path=os.environ.get("WEBHOOK_PATH", "/telegram/webhook").strip(),
            webhook_secret_token=os.environ.get("WEBHOOK_SECRET_TOKEN", "").strip(),
            max_history_messages=int(os.environ.get("MAX_HISTORY_MESSAGES", "24").strip()),
            system_prompt=os.environ.get("SYSTEM_PROMPT", default_prompt).strip(),
            log_level=os.environ.get("LOG_LEVEL", "INFO").strip().upper(),
            auto_register_webhook=_parse_bool(
                os.environ.get("AUTO_REGISTER_WEBHOOK"),
                True,
            ),
        )
