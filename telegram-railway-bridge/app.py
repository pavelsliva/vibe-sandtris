from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request

from config import Config
from openai_chat import OpenAIChatAgent
from session_store import SessionStore
from telegram_api import TelegramBotAPI


LOGGER = logging.getLogger("telegram_railway_bridge")

CONFIG = Config.from_env()
logging.basicConfig(
    level=getattr(logging, CONFIG.log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

TELEGRAM = TelegramBotAPI(CONFIG.telegram_bot_token)
STORE = SessionStore(CONFIG.database_path)
AGENT = OpenAIChatAgent(CONFIG)
APP = FastAPI(title="Telegram Railway Bridge")


def extract_message(update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return update.get("message")


def extract_text_message(message: Dict[str, Any]) -> str:
    return (message.get("text") or message.get("caption") or "").strip()


def help_text() -> str:
    return (
        "Telegram Codex Bridge is running.\n\n"
        "Current MVP supports:\n"
        "- text in / text out\n"
        "- persistent chat context\n"
        "- Railway webhook mode\n\n"
        "Commands:\n"
        "/start\n"
        "/help\n"
        "/ping\n"
        "/reset"
    )


def unauthorized_reply() -> str:
    return "This chat is not authorized for this bot."


@APP.on_event("startup")
def on_startup() -> None:
    STORE.init_db()
    me = TELEGRAM.get_me()
    LOGGER.info("Connected to bot @%s", me.get("username"))
    if CONFIG.auto_register_webhook and CONFIG.public_base_url:
        try:
            TELEGRAM.set_webhook(
                url=CONFIG.webhook_url,
                secret_token=CONFIG.webhook_secret_token,
                allowed_updates=["message"],
            )
            LOGGER.info("Webhook registered at %s", CONFIG.webhook_url)
        except Exception:  # noqa: BLE001
            LOGGER.exception("Webhook registration failed at startup for %s", CONFIG.webhook_url)
    elif CONFIG.auto_register_webhook:
        LOGGER.info("PUBLIC_BASE_URL is empty; skipping webhook registration")


@APP.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}


@APP.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_telegram_bot_api_secret_token: Optional[str] = Header(default=None),
) -> Dict[str, bool]:
    if CONFIG.webhook_secret_token:
        if x_telegram_bot_api_secret_token != CONFIG.webhook_secret_token:
            raise HTTPException(status_code=401, detail="invalid telegram secret token")

    update = await request.json()
    background_tasks.add_task(process_update, update)
    return {"ok": True}


def process_update(update: Dict[str, Any]) -> None:
    update_id = int(update.get("update_id", 0))
    message = extract_message(update)
    if not message:
        return

    chat = message["chat"]
    chat_id = int(chat["id"])
    telegram_user = message.get("from") or {}
    message_id = int(message["message_id"])

    if not STORE.claim_update(update_id, chat_id):
        LOGGER.info("Skipping duplicate update_id=%s", update_id)
        return

    try:
        STORE.upsert_chat(
            chat_id=chat_id,
            telegram_user_id=telegram_user.get("id"),
            username=telegram_user.get("username", "") or "",
            first_name=telegram_user.get("first_name", "") or "",
            last_name=telegram_user.get("last_name", "") or "",
        )

        if CONFIG.allowed_chat_ids and chat_id not in CONFIG.allowed_chat_ids:
            TELEGRAM.send_message(
                chat_id,
                unauthorized_reply(),
                reply_to_message_id=message_id,
            )
            STORE.finish_update(update_id, "done")
            return

        text = extract_text_message(message)
        if not text:
            TELEGRAM.send_message(
                chat_id,
                "This MVP supports text messages for now.",
                reply_to_message_id=message_id,
            )
            STORE.finish_update(update_id, "done")
            return

        if text in {"/start", "/help"}:
            TELEGRAM.send_message(chat_id, help_text(), reply_to_message_id=message_id)
            STORE.finish_update(update_id, "done")
            return

        if text == "/ping":
            TELEGRAM.send_message(chat_id, "pong", reply_to_message_id=message_id)
            STORE.finish_update(update_id, "done")
            return

        if text == "/reset":
            STORE.clear_chat_history(chat_id)
            TELEGRAM.send_message(
                chat_id,
                "Chat history reset for this Telegram chat.",
                reply_to_message_id=message_id,
            )
            STORE.finish_update(update_id, "done")
            return

        STORE.append_message(
            chat_id=chat_id,
            role="user",
            text=text,
            telegram_message_id=message_id,
        )
        history = STORE.get_recent_messages(chat_id, CONFIG.max_history_messages)

        TELEGRAM.send_chat_action(chat_id, "typing")
        reply = AGENT.reply(user_text=text, history=history[:-1])
        sent = TELEGRAM.send_message(
            chat_id,
            reply.text,
            reply_to_message_id=message_id,
        )
        STORE.append_message(
            chat_id=chat_id,
            role="assistant",
            text=reply.text,
            telegram_message_id=int(sent.get("message_id", 0)) or None,
        )
        STORE.finish_update(update_id, "done")
    except Exception as exc:  # noqa: BLE001
        LOGGER.exception("Failed to process update_id=%s", update_id)
        try:
            TELEGRAM.send_message(
                chat_id,
                f"Sorry, something failed: {exc}",
                reply_to_message_id=message_id,
            )
        except Exception:  # noqa: BLE001
            LOGGER.exception("Failed to send Telegram error reply")
        STORE.finish_update(update_id, "failed", str(exc))


app = APP
