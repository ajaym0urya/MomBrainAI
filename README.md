# MomBrain — Voice-First AI Family OS

MomBrain is a voice-first web app that turns everyday spoken thoughts (in Hindi, English, or Hinglish) into organized tasks and reminders. Built for busy parents and family managers, it removes the friction of typing, tapping through menus, or juggling separate calendar and to-do apps — just tap the mic and speak.

---

## ✨ What It Does

Speak naturally → MomBrain's AI understands intent → creates structured tasks/reminders → reads confirmation back to you → saves everything to your personal feed.

### Examples

```text
🎙️ "Aryan ka cricket match Tuesday 5 baje"
✅ Reminder · Aryan's cricket match · Tue 5:00 PM
```

```text
🎙️ "Remind me to buy milk tomorrow"
✅ Task · Buy milk · Tomorrow
```

---

# 🚀 Key Features

| Feature                    | Description                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| 🎤 **Voice-first input**   | Tap mic, speak in Hindi/English/Hinglish — Web Speech API handles transcription            |
| 🧠 **AI intent parsing**   | Gemini 2.5 Flash classifies speech into `create`, `clarify`, `list`, `complete`, or `chat` |
| 🗣️ **Spoken replies**     | Every assistant response is read aloud via `SpeechSynthesis`                               |
| 💬 **Clarification turns** | If time/details are missing, MomBrain asks a short follow-up instead of guessing           |
| 📋 **Unified feed**        | One clean screen showing all tasks & reminders — no tabs, no clutter                       |
| 📅 **Calendar export**     | One-tap `.ics` download per item — opens in Google/Apple/Outlook Calendar                  |
| 🔐 **Secure auth**         | Email + password sign-in with per-user data isolation (Row-Level Security)                 |
| 💾 **Persistent memory**   | Conversation history and items survive refresh, stored per user                            |

---

# 🧭 User Flow

```text
Landing Page (/)
 └─ Product hero, features, and CTAs

Authentication (/auth)
 └─ Email + password sign up / sign in

Application (/app)
 └─ Mic button + live feed of tasks and reminders

Sign Out
 └─ Returns user to landing page
```

---

# 🛠️ Tech Stack

| Layer         | Technology                                     |
| ------------- | ---------------------------------------------- |
| **Framework** | TanStack Start v1 (React 19 + Vite 7)          |
| **Styling**   | Tailwind CSS v4 with semantic design tokens    |
| **Backend**   | Lovable Cloud (Postgres + Auth + RLS)          |
| **AI**        | Lovable AI Gateway → `google/gemini-2.5-flash` |
| **Voice**     | Web Speech API (STT) + `SpeechSynthesis` (TTS) |
| **Routing**   | File-based routing in `src/routes/`            |

---

# 🗄️ Data Model

## `items`

```sql
id
user_id
kind          -- task | reminder
title
who
when_at
recurrence
status
created_at
```

## `messages`

```sql
id
user_id
role          -- user | assistant
content
created_at
```

### RLS Rules

* Every row is scoped to `auth.uid()`
* Users can only access their own data

---

# 🔒 Security & Privacy

* Per-user data isolation using Postgres Row-Level Security
* JWT validation enforced on every server endpoint
* No third-party voice processing — speech recognition runs in-browser
* Server-side input validation using Zod schemas

---

# 🎯 Who It's For

MomBrain is designed for:

* Parents
* Caregivers
* Family coordinators
* Anyone who thinks faster than they type

A calm, voice-first space to capture the endless stream of:

> “Don’t forget to…”

without breaking flow.

---

# 📌 Core Experience

```text
Tap mic → Speak naturally → AI understands intent →
Task/reminder created → Spoken confirmation →
Saved to your personal family feed
```

---

# 🧠 Example Interaction

```text
User:
"Doctor appointment Friday morning"

MomBrain:
"Got it — reminder set for Friday morning."
```

```text
User:
"Pick up Aarav from tuition"

MomBrain:
"What time should I remind you?"
```

---

# ⚡ Built With

* React 19
* TanStack Start
* Tailwind CSS v4
* Gemini 2.5 Flash
* Postgres
* Web Speech API
* SpeechSynthesis API
* Zod

---

# 📄 License

MIT License © MomBrain
