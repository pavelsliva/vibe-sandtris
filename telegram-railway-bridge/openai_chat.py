from __future__ import annotations

from dataclasses import dataclass
from typing import List

from openai import OpenAI

from config import Config
from session_store import ChatMessage


@dataclass(frozen=True)
class AssistantReply:
    text: str


class OpenAIChatAgent:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.client = OpenAI(api_key=config.openai_api_key)

    def reply(self, user_text: str, history: List[ChatMessage]) -> AssistantReply:
        input_items = [{"role": "system", "content": self.config.system_prompt}]
        for item in history:
            input_items.append({"role": item.role, "content": item.text})
        input_items.append({"role": "user", "content": user_text})

        response = self.client.responses.create(
            model=self.config.openai_model,
            reasoning={"effort": self.config.openai_reasoning_effort},
            input=input_items,
        )

        reply_text = getattr(response, "output_text", "").strip()
        if not reply_text:
            reply_text = "I processed that, but I do not have a clean final reply."
        return AssistantReply(text=reply_text)
