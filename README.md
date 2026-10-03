# Suhbatdosh: AI mock interviews in Uzbek

Practise job interviews out loud, in Uzbek or English. Questions are read aloud and you answer on camera while your speech is transcribed. You then get a scored report with feedback written in Uzbek, plus tools to keep practising: an AI coach, an answer workshop and a question bank.

## Run it

```bash
npm install
cp .env.example .env         # optional keys, see below
npm run dev                  # http://localhost:3000 → /register
```

| Env var | What it enables | Without it |
|---|---|---|
| `UZBEKVOICE_API_KEY` | [UzbekVoice.ai](https://uzbekvoice.ai): natural Uzbek text-to-speech and accurate Uzbek speech-to-text in every browser | The browser's own voice and Web Speech recognition |
| `ANTHROPIC_API_KEY` | A server-wide default AI (Claude) for questions, follow-ups and grading | Each user can connect their own AI in Settings; otherwise the built-in offline engine is used |
| `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` | Azure neural voices (Uzbek and English) | — |
| `APP_SECRET` | The key used to encrypt users' AI tokens | A random secret generated once in `data/.secret` |
| `DATA_FILE` | A custom location for the JSON database | `./data/db.json` |

## AI providers

In **Sozlamalar → Sun’iy intellekt** each user can connect their own AI with an API token. It is stored AES-256-GCM encrypted on the server, and only its last 4 characters are ever sent back to the browser.

- **Free tiers:** Google Gemini (`gemini-flash-latest`), Groq, OpenRouter (`:free` models), Mistral.
- **Paid:** Anthropic Claude, OpenAI, DeepSeek.
- **Any OpenAI-compatible server:** for example Ollama or LM Studio, via a custom base URL.

Each provider has a connection test and a live model list. Busy models (503/429) are retried, and Gemini falls back to `gemini-flash-lite-latest`. Every AI feature falls back to the offline engine if the provider fails.

## Voice in Uzbek

- **Speech-to-text:** with UzbekVoice, the mic is recorded in the browser and cut into phrases at natural pauses. Each phrase is sent as a 16 kHz WAV to `/api/stt` (`enhanced-stt` model), so text appears phrase by phrase and silence is never uploaded. Without the key, the browser's Web Speech API is used (best in Chrome).
- **Text-to-speech:** order of preference for Uzbek: UzbekVoice (`lola` / `jasur`), then the browser's Uzbek voice, then a Turkish voice. For English, the browser voice comes first, then Azure. The next question's audio is prefetched.

## Features

- **Interview wizard:** type → role, level, company and focus topics → language, interviewer strictness, number of questions, answer time limit, follow-ups → review.
- **Live interview:** questions are read aloud and the mic starts automatically. It shows live speaking pace and filler-word count, and has an answer timer.
- **Report:** overall and category scores, speech analysis, strengths and weaknesses, and a better model answer for every question.
- **AI murabbiy:** a chat coach that can use your last report as context.
- **Javob ustaxonasi:** review a single answer with a score, improvements and a rewritten version.
- **Savollar banki:** 45 common questions with tips and progress tracking.
- **Dashboard:** stats, score trend, weekly activity and streak, and history with filters.

## Accounts

- **Sign-up and login:** done at `/register` and `/login`. Passwords are hashed with **scrypt**.
- **Sessions:** a random token is kept in an httpOnly, SameSite=Lax cookie that lasts 30 days. Only its SHA-256 hash is stored.
- **Login protection:** after 8 failed logins per email and IP, login is blocked for 15 minutes.
- **What's protected:** all pages under `(app)` and every API except auth and status require a session.

The JSON-file database (`src/lib/server/db.ts`) suits one Node process. Before running several instances or a serverless deploy, replace it with Postgres or a similar database.

## Structure

```
src/app/
  (auth)/login, (auth)/register     auth pages with the artwork panel
  (app)/page.tsx                    dashboard
  (app)/new                         interview wizard
  (app)/interview/[id]              device check → live interview → report
  (app)/coach, workshop, questions  preparation tools
  (app)/interviews, settings        history, settings (AI provider, voice, defaults, export)
  api/                              auth, interviews, questions, follow-up, feedback, tts, stt,
                                    coach, workshop, ai-settings (+ test, models), status
src/components/   shell/ (sidebar), ui/, auth/, dashboard/, interview/, report/, settings/
src/hooks/        useVoice, useDictation (UzbekVoice / Web Speech), useServerStt, useMediaStream
src/lib/          ai/ (multi-provider client, prompts), demo/ (offline engine + coach),
                  server/ (db, auth, tts/stt, secret), speech.ts, questionBank.ts, catalog.ts
```
