import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ItemSchema = z.object({
  kind: z.enum(["task", "reminder"]),
  title: z.string(),
  who: z.string().nullable().optional(),
  whenISO: z.string().nullable().optional(),
  recurrence: z.string().nullable().optional(),
});

const ResponseSchema = z.object({
  intent: z.enum(["create", "clarify", "list", "complete", "chat"]),
  items: z.array(ItemSchema).default([]),
  needsClarification: z.boolean().default(false),
  reply: z.string(),
});

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
          const model = gateway("google/gemini-3-flash-preview");
          const now = new Date().toISOString();
          const system = `You are MomBrain, a warm, helpful family coordinator. Users speak Hindi, English, or Hinglish. Convert their speech into TASKS or REMINDERS.

Rules:
- Output ONLY JSON matching the schema.
- Decide intent: "create" (new task/reminder), "clarify" (missing time/details — ask one short question), "list" (user wants to know pending items), "complete" (mark done), or "chat" (general talk).
- If the user mentions an action without a clear time, set intent="clarify" and ask for the time in your reply (Hinglish friendly). Do NOT create the item yet.
- For "create": fill items[]. Use ISO 8601 for whenISO in user's local context (assume IST/Asia/Kolkata if unspecified). Use "task" for action items, "reminder" for time-based alerts.
- "reply" is a short, warm message that will be SPOKEN ALOUD. Keep it under 25 words. Mirror the user's language (Hinglish if they used Hinglish).
- Current time: ${now}
- Pending items: ${JSON.stringify(pending ?? [])}`;

          const conversation = (history ?? [])
            .reverse()
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

          const { experimental_output } = await generateText({
            model,
            system,
            prompt: `Conversation so far:\n${conversation}\n\nProcess the latest user message and respond with JSON.`,
            experimental_output: Output.object({ schema: ResponseSchema }),
          });

          const parsed = experimental_output;
          await supabase
            .from("messages")
            .insert({ user_id: userId, role: "assistant", content: parsed.reply });

          if (parsed.intent === "create" && !parsed.needsClarification) {
            for (const item of parsed.items) {
              await supabase.from("items").insert({
                user_id: userId,
                kind: item.kind,
                title: item.title,
                who: item.who ?? null,
                when_at: item.whenISO ?? null,
                recurrence: item.recurrence ?? null,
              });
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
          console.error("voice route error:", err);
          return Response.json({ error: err?.message || "Server error" }, { status: 500 });
        }
      },
    },
  },
});
