import httpx

from app.core.config import Settings


class TelegramClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def send_message(self, chat_id: int, text: str) -> None:
        if not self.settings.telegram_bot_token:
            return
        response = httpx.post(
            f"https://api.telegram.org/bot{self.settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
        response.raise_for_status()
