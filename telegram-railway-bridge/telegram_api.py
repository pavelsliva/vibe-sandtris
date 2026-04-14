from __future__ import annotations

from typing import Any, Dict, List, Optional

import requests


class TelegramBotAPI:
    def __init__(self, bot_token: str) -> None:
        self.bot_token = bot_token
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
        self.session = requests.Session()

    def _call(
        self,
        method: str,
        payload: Optional[Dict[str, Any]] = None,
        timeout: int = 60,
    ) -> Any:
        response = self.session.post(
            f"{self.base_url}/{method}",
            json=payload or {},
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram API error in {method}: {data}")
        return data["result"]

    def get_me(self) -> Dict[str, Any]:
        return self._call("getMe")

    def get_webhook_info(self) -> Dict[str, Any]:
        return self._call("getWebhookInfo")

    def set_webhook(
        self,
        url: str,
        secret_token: str = "",
        allowed_updates: Optional[List[str]] = None,
    ) -> bool:
        payload: Dict[str, Any] = {"url": url}
        if secret_token:
            payload["secret_token"] = secret_token
        if allowed_updates:
            payload["allowed_updates"] = allowed_updates
        return bool(self._call("setWebhook", payload))

    def send_chat_action(self, chat_id: int, action: str) -> None:
        self._call("sendChatAction", {"chat_id": chat_id, "action": action})

    def send_message(
        self,
        chat_id: int,
        text: str,
        reply_to_message_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"chat_id": chat_id, "text": text}
        if reply_to_message_id is not None:
            payload["reply_parameters"] = {"message_id": reply_to_message_id}
        return self._call("sendMessage", payload)
