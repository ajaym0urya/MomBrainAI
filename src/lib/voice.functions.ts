import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";

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

export const processVoiceTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transcript: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const transcript = data.transcript.trim();
    if (!transcript) throw new Error("Empty transcript");

    // Save user message
    await supabase.from("messages").insert({ user_id: userId, role: "user", content: transcript });

    // Recent conversation
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

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

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

    const conversation = (history ?? []).reverse().map((m) => `${m.role}: ${m.content}`).join("\n");

    const { experimental_output } = await generateText({
      model,
      system,
      prompt: `Conversation so far:\n${conversation}\n\nProcess the latest user message and respond with JSON.`,
      experimental_output: Output.object({ schema: ResponseSchema }),
    });

    const parsed = experimental_output;

    // Save assistant reply
    await supabase.from("messages").insert({ user_id: userId, role: "assistant", content: parsed.reply });

    // Persist items if create
    const created: Array<{ id: string; kind: string; title: string; when_at: string | null }> = [];
    if (parsed.intent === "create" && !parsed.needsClarification) {
      for (const item of parsed.items) {
        const { data: row } = await supabase
          .from("items")
          .insert({
            user_id: userId,
            kind: item.kind,
            title: item.title,
            who: item.who ?? null,
            when_at: item.whenISO ?? null,
            recurrence: item.recurrence ?? null,
          })
          .select("id, kind, title, when_at")
          .single();
        if (row) created.push(row);
      }
    }

    if (parsed.intent === "complete") {
      // Best-effort: mark items matching titles done
      for (const item of parsed.items) {
        await supabase
          .from("items")
          .update({ status: "done" })
          .eq("user_id", userId)
          .ilike("title", `%${item.title}%`);
      }
    }

    return { reply: parsed.reply, intent: parsed.intent, created };
  });
