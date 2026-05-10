MomBrain — Voice-First AI Companion
MomBrain is a voice-first web app that turns everyday spoken thoughts (in Hindi, English, or Hinglish) into organized tasks and reminders. Built for busy parents and family managers, it removes the friction of typing, tapping through menus, or juggling separate calendar and to-do apps — just tap the mic and speak.

✨ What It Does
Speak naturally → MomBrain's AI understands intent → it creates structured tasks/reminders → reads the confirmation back to you → saves everything to your personal feed.

Example:

🎙️ "Ajay ka cricket match Tuesday 5 baje" ✅ Reminder · Ajay's cricket match · Tue 5:00 PM

🎙️ "Remind me to buy milk tomorrow" ✅ Task · Buy milk · Tomorrow

🚀 Key Features
Feature	Description
🎤 Voice-first input	Tap mic, speak in Hindi/English/Hinglish — Web Speech API handles transcription
🧠 AI intent parsing	Gemini 2.5 Flash classifies speech into create / clarify / list / complete / chat
🗣️ Spoken replies	Every assistant response is read aloud via SpeechSynthesis
💬 Clarification turns	If time/details are missing, MomBrain asks a short follow-up instead of guessing
📋 Unified feed	One clean screen showing all your tasks & reminders — no tabs, no clutter
📅 Calendar export	One-tap .ics download per item — opens in Google/Apple/Outlook calendar
🔐 Secure auth	Email + password sign-in with per-user data isolation (Row-Level Security)
💾 Persistent memory	Conversation history and items survive refresh, stored per user

🧭 User Flow
Landing page (/) — explains the product with hero, features, and CTAs
Sign Up / Sign In (/auth) — email + password
App (/app) — mic button + live feed of tasks and reminders
Sign out → returns to landing page

🛠️ Tech Stack
Framework: TanStack Start v1 (React 19, SSR-ready) + Vite 7
Styling: Tailwind CSS v4 with semantic design tokens (warm cream + plum palette)
Backend: Lovable Cloud (Postgres + Auth + RLS)
AI: Lovable AI Gateway → google/gemini-2.5-flash
Voice: Web Speech API (STT) + SpeechSynthesis (TTS)
Routing: File-based routes in src/routes/

🗄️ Data Model
items — id, user_id, kind (task|reminder), title, who, when_at, recurrence, status, created_at
messages — id, user_id, role (user|assistant), content, created_at (powers conversational memory)
RLS: Every row scoped to auth.uid() — users only see their own data

🔒 Security & Privacy
All data scoped per-user via Postgres Row-Level Security
Auth enforced on every server endpoint (/api/voice validates JWT before AI calls)
No third-party voice processing — STT runs in the browser
Server-side input validation via Zod schemas
🎯 Who It's For
Parents, caregivers, and family coordinators who think faster than they type — and need a single, calm place to capture the constant stream of "don't forget to…" without breaking flow.
