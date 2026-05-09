## MomBrain — Voice-First AI Family OS

A minimal, voice-first web app where users speak (Hindi/English/Hinglish) and the AI converts speech into Tasks or Reminders. Only one screen: a unified Tasks & Reminders feed. No tabs, no calendar UI, no grocery section.

### Stack
- TanStack Start (existing template) + Tailwind v4 design system
- Lovable Cloud (Supabase) for email auth + persistent storage
- Lovable AI Gateway (`google/gemini-3-flash-preview`) for intent + extraction + clarifications
- Browser Web Speech API for STT (mic) + SpeechSynthesis for TTS (speak responses out loud)
- ICS download per item for native calendar add (Android/iOS calendar import)

### Screens (only 3)
1. **/auth** — single screen with two clear buttons: **Sign In** and **Sign Up** (email + password). No magic link, no OTP, no phone.
2. **/** (after login) — Tasks & Reminders feed + a large mic button at the bottom. Tap mic → speak → AI parses → item appears in feed. AI's reply is spoken aloud and shown as a small chat bubble above the mic. Clarification turns supported.
3. Minimal header with sign-out.

### AI Pipeline (single server function)
- Input: user transcript + recent conversation history + current pending items
- Model returns structured JSON via AI SDK `Output.object`:
  - `intent`: "create" | "clarify" | "list" | "complete" | "chat"
  - `items[]`: `{ kind: "task"|"reminder", title, who?, whenISO?, recurrence?, needsClarification?, clarifyQuestion? }`
  - `reply`: short warm Hinglish/English message to speak aloud
- If `needsClarification`, no DB write — just speak the question and wait for next turn.

### Database (Lovable Cloud)
- `items` (id, user_id, kind, title, who, when_at, recurrence, status, created_at)
- `messages` (id, user_id, role, content, created_at) — persistent conversation memory per user (acts as the family workspace for MVP)
- RLS: users only see their own rows

### Voice
- `useSpeechRecognition` hook wrapping `webkitSpeechRecognition` with `lang="en-IN"` (handles Hinglish well), continuous=false, interimResults=true
- Robust mic handling: explicit permission request, clear error states ("mic blocked", "no speech detected"), retry button, visible recording indicator
- `speak(text)` helper using `speechSynthesis` — every AI reply is spoken
- Fallback: text input box always visible under the mic for when mic is unavailable

### Calendar (hidden, on-demand)
- Each scheduled item shows a tiny "Add to calendar" icon that downloads an `.ics` file → opens in native calendar on Android/iOS/desktop. No calendar UI, no sync dashboard.

### Design
- Warm, soft, family-friendly: cream background, deep plum primary, soft coral accent, rounded cards, generous spacing. Display font: Fraunces. Body: Inter. Subtle gradient on the mic button with a pulsing ring when listening.

### Deliverables this turn
1. Enable Lovable Cloud
2. DB migration: `items`, `messages` tables + RLS
3. Design tokens in `src/styles.css`
4. `/auth` route (sign in / sign up only)
5. `/` route: feed + mic + chat bubble + ICS download
6. `useSpeechRecognition` + `speak` hooks
7. Server function `processVoiceTurn` calling Lovable AI Gateway with structured output
8. Update root for auth gating