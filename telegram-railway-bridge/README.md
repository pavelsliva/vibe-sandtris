# Telegram Railway Bridge

Always-on Telegram bot bridge for Railway.

This service is intentionally separate from:

- `tg-mcp-guarded` — agent access to the user's real Telegram account
- `telegram-voice-bot` — local bot prototype for the Mac

This project is the cloud ingress layer:

- Telegram `webhook` in
- OpenAI reply generation
- SQLite chat memory
- Telegram reply out

## MVP scope

- text in / text out
- webhook mode for Railway
- allowlist by `chat_id`
- persistent context in SQLite
- `/start`, `/help`, `/ping`, `/reset`

## What it does not do yet

- no local Mac actions
- no voice transcription
- no queued handoff to a local executor
- no multi-workspace routing

## Deploy on Railway

1. Create a Railway service from this repo.
2. Set the service Root Directory to:

`telegram-railway-bridge`

3. Add variables from `.env.example`:

- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `PUBLIC_BASE_URL`
- `WEBHOOK_SECRET_TOKEN`
- `ALLOWED_CHAT_IDS`

4. Deploy.

If `AUTO_REGISTER_WEBHOOK=1`, the service will register Telegram webhook on startup using:

`PUBLIC_BASE_URL + WEBHOOK_PATH`

## Local run

```bash
cd /Users/pavelsliva/Documents/VIBE/telegram-railway-bridge
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app:app --reload --port 8000
```

## Future extension

The next layer can add:

- background jobs table
- local executor polling queue
- voice support
- structured tool routing
