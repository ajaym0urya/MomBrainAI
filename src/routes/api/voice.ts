import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ItemSchema = z.object({
  kind: z.enum(["task", "reminder"]),
  title: z.string().min(1),
  who: z.string().nullable().optional(),
  whenISO: z.string().nullable().optional(),
  recurrence: z.string().nullable().optional(),
});

const ResponseSchema = z.object({
  intent: z.enum(["create", "clarify", "list", "complete", "chat"]),
  items: z.array(ItemSchema).default([]),
  needsClarification: z.boolean().default(false),
  reply: z.string().min(1),
});

function extractJson(text: string): unknown {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  const endChar = start !== -1 && cleaned[start] === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(endChar);
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

export const Route = createFileRoute("/api/voice")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY)
            return Response.json({ error: "Backend not configured" }, { status: 500 });
          if (!apiKey) return Response.json({ error: "AI not configured" }, { status: 500 });

          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "");
          if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claims?.claims?.sub)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const userId = claims.claims.sub as string;

          const body = (await request.json()) as { transcript?: string };
          const transcript = (body.transcript || "").trim();
          if (!transcript) return Response.json({ error: "Empty transcript" }, { status: 400 });

          await supabase.from("messages").insert({ user_id: userId, role: "user", content: transcript });

          const { data: history } = await supabase
            .from("messages")
            .select("role, content")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20);

          const { data: pending } = await supabase
            .from("items")
            .select("kind, title, who, when_at, status")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("when_at", { ascending: true })
            .limit(30);

          const gateway = createLovableAiGatewayProvider(apiKey);
          const model = gateway("google/gemini-2.5-flash");
          const now = new Date().toISOString();

          const system = `You are MomBrain, a warm, helpful family coordinator. Users speak Hindi, English, or Hinglish. Convert their speech into TASKS or REMINDERS.

Output ONLY a single JSON object (no prose, no markdown fences) matching this exact shape:
{
  "intent": "create" | "clarify" | "list" | "complete" | "chat",
  "items": [{ "kind": "task" | "reminder", "title": string, "who": string|null, "whenISO": string|null, "recurrence": string|null }],
  "needsClarification": boolean,
  "reply": string
}

Rules:
- "create": new task/reminder. Fill items[]. Use ISO 8601 for whenISO assuming Asia/Kolkata timezone unless stated.
- "clarify": missing time/critical detail. Ask a short Hinglish-friendly question in "reply". items can be empty.
- "list": user asks what's pending. items empty; mention pending count in reply.
- "complete": user marked something done. Put matching titles in items[].
- "chat": general talk. items empty.
- "reply" is short (under 25 words), warm, will be SPOKEN ALOUD. Mirror the user's language.
- If user gives a clear action with a clear time, prefer "create" — do not over-clarify.
- Current time: ${now}
- Pending items: ${JSON.stringify(pending ?? [])}`;

          const conversation = (history ?? [])
            .reverse()
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

          const { text } = await generateText({
            model,
            system,
            prompt: `Conversation so far:\n${conversation}\n\nRespond now with the JSON object only.`,
          });

          let parsed: z.infer<typeof ResponseSchema>;
          try {
            const raw = extractJson(text);
            parsed = ResponseSchema.parse(raw);
          } catch (e: any) {
            console.error("voice parse error:", e?.message, "raw:", text?.slice(0, 500));
            const fallback = "Sorry, I didn't catch that clearly. Could you repeat?";
            await supabase.from("messages").insert({ user_id: userId, role: "assistant", content: fallback });
            return Response.json({ reply: fallback, intent: "chat" });
          }

          await supabase
            .from("messages")
            .insert({ user_id: userId, role: "assistant", content: parsed.reply });

          if (parsed.intent === "create" && !parsed.needsClarification && parsed.items.length > 0) {
            for (const item of parsed.items) {
              const { error: insErr } = await supabase.from("items").insert({
                user_id: userId,
                kind: item.kind,
                title: item.title,
                who: item.who ?? null,
                when_at: item.whenISO ?? null,
                recurrence: item.recurrence ?? null,
              });
              if (insErr) console.error("item insert error:", insErr.message);
            }
          }

          if (parsed.intent === "complete") {
            for (const item of parsed.items) {
              await supabase
                .from("items")
                .update({ status: "done" })
                .eq("user_id", userId)
                .ilike("title", `%${item.title}%`);
            }
          }

          return Response.json({ reply: parsed.reply, intent: parsed.intent });
        } catch (err: any) {
          console.error("voice route error:", err?.message || err);
          return Response.json({ error: err?.message || "Server error" }, { status: 500 });
        }
      },
    },
  },
});
