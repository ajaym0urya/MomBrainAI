import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSpeechRecognition, speak } from "@/hooks/use-voice";
import { Mic, MicOff, LogOut, CalendarPlus, Check, Sparkles, Send, Bell, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadICS } from "@/lib/ics";
import type { Tables } from "@/integrations/supabase/types";

type Item = Tables<"items">;

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "MomBrain — Voice-first family OS" },
      { name: "description", content: "Speak. MomBrain turns your day into tasks and reminders." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [reply, setReply] = useState<string>("Hi! Tap the mic and tell me what's on your mind.");
  const [busy, setBusy] = useState(false);
  const [textInput, setTextInput] = useState("");
  const speech = useSpeechRecognition({ lang: "en-IN" });
  const lastSubmittedRef = useRef("");

  useEffect(() => {
    if (!user) return;
    refresh();
    const ch = supabase
      .channel("items-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "items", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-submit when listening stops with a final transcript
  useEffect(() => {
    if (!speech.isListening && speech.transcript && speech.transcript !== lastSubmittedRef.current) {
      const t = speech.transcript;
      lastSubmittedRef.current = t;
      submit(t);
      speech.setTranscript("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.isListening, speech.transcript]);

  useEffect(() => {
    if (speech.error) toast.error(speech.error);
  }, [speech.error]);

  async function refresh() {
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("when_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
  }

  async function submit(text: string) {
    const transcript = text.trim();
    if (!transcript) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in again");
      const r = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcript }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res?.error || "Request failed");
      setReply(res.reply);
      speak(res.reply, "en-IN");
      await refresh();
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      toast.error(msg);
      setReply("Sorry, I couldn't process that. Try again?");
      speak("Sorry, I couldn't process that. Try again?");
    } finally {
      setBusy(false);
    }
  }

  async function markDone(id: string) {
    await supabase.from("items").update({ status: "done" }).eq("id", id);
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const active = items.filter((i) => i.status === "active");
  const done = items.filter((i) => i.status === "done");

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen pb-56">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="mic-btn rounded-full p-1.5"><Sparkles className="h-4 w-4" /></div>
            <h1 className="text-xl font-display font-semibold">MomBrain</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full">
            <LogOut className="h-4 w-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-6">
        {active.length === 0 && done.length === 0 ? (
          <div className="card-soft p-8 text-center">
            <h2 className="text-2xl font-display mb-2">Your family, organized.</h2>
            <p className="text-muted-foreground">
              Tap the mic and say things like <span className="italic">"Aryan ka cricket match Tuesday 5 baje"</span> or{" "}
              <span className="italic">"kal milk lena hai"</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.length > 0 && (
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold pl-1">Upcoming</h2>
            )}
            {active.map((it) => (
              <ItemCard key={it.id} item={it} onDone={() => markDone(it.id)} />
            ))}

            {done.length > 0 && (
              <details className="mt-8">
                <summary className="text-xs uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer pl-1">
                  Completed ({done.length})
                </summary>
                <div className="space-y-2 mt-3 opacity-70">
                  {done.map((it) => (
                    <ItemCard key={it.id} item={it} onDone={() => markDone(it.id)} done />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </main>

      {/* Voice dock */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-2xl mx-auto px-5 pb-6 pt-4">
          {(reply || speech.interim || speech.transcript) && (
            <div className="card-soft px-4 py-3 mb-3 text-sm">
              {speech.isListening ? (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Listening… </span>
                  {speech.transcript} <span className="opacity-60">{speech.interim}</span>
                </p>
              ) : (
                <p>
                  <span className="text-accent-foreground font-medium">MomBrain: </span>
                  {busy ? "Thinking…" : reply}
                </p>
              )}
            </div>
          )}

          <div className="card-soft p-3 flex items-center gap-2">
            <button
              onClick={() => (speech.isListening ? speech.stop() : speech.start())}
              disabled={busy}
              className={`relative h-14 w-14 rounded-full mic-btn flex items-center justify-center transition active:scale-95 ${
                speech.isListening ? "pulse-ring" : ""
              }`}
              aria-label={speech.isListening ? "Stop listening" : "Start listening"}
            >
              {speech.isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInput.trim()) {
                  const t = textInput;
                  setTextInput("");
                  submit(t);
                }
              }}
              placeholder="Or type… e.g. 'kal 5pm doctor'"
              className="flex-1 bg-transparent outline-none px-2 text-sm placeholder:text-muted-foreground"
            />
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              disabled={!textInput.trim() || busy}
              onClick={() => {
                const t = textInput;
                setTextInput("");
                submit(t);
              }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onDone, done }: { item: Item; onDone: () => void; done?: boolean }) {
  const Icon = item.kind === "reminder" ? Bell : ListTodo;
  const when = item.when_at ? new Date(item.when_at) : null;
  return (
    <div className="card-soft p-4 flex items-start gap-3">
      <div className={`shrink-0 rounded-full p-2 ${item.kind === "reminder" ? "bg-secondary" : "bg-muted"}`}>
        <Icon className="h-4 w-4 text-secondary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${done ? "line-through" : ""}`}>{item.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {item.who && <span>👤 {item.who}</span>}
          {when && (
            <span>
              {when.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          {item.recurrence && <span>↻ {item.recurrence}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {when && !done && (
          <button
            title="Add to calendar"
            onClick={() => downloadICS({ title: item.title, whenISO: when.toISOString() })}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          >
            <CalendarPlus className="h-4 w-4" />
          </button>
        )}
        {!done && (
          <button
            title="Mark done"
            onClick={onDone}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
