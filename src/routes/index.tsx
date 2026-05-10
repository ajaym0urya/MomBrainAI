import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Mic,
  Bell,
  ListTodo,
  CalendarPlus,
  ShieldCheck,
  Languages,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MomBrain — Voice-first AI family operating system" },
      {
        name: "description",
        content:
          "Speak naturally. MomBrain turns everyday conversation into tasks, reminders, and a calmer family life.",
      },
      { property: "og:title", content: "MomBrain — Voice-first family OS" },
      {
        property: "og:description",
        content: "Zero-interface AI that organizes your family from a single conversation.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="mic-btn rounded-full p-1.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xl font-display font-semibold">MomBrain</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="rounded-full">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full mic-btn border-0">
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-5 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground mb-6">
            <Zap className="h-3 w-3" /> Voice-first. Zero interface.
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-semibold tracking-tight leading-tight">
            Your family,
            <br />
            <span className="bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              organized by voice.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Just talk. MomBrain understands Hindi, English, and Hinglish — and quietly turns
            your day into reminders, tasks, and calendar events.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full mic-btn border-0 h-12 px-7 text-base">
                Get started free
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="ghost" className="rounded-full h-12 px-6 text-base">
                Sign in
              </Button>
            </Link>
          </div>

          <div className="mt-14 card-soft p-6 max-w-xl mx-auto text-left">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
              <Mic className="h-3.5 w-3.5" /> You say
            </div>
            <p className="text-lg font-medium">
              "Aryan ka cricket match Tuesday 5 baje, aur kal milk lena hai."
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
              <Sparkles className="h-3.5 w-3.5" /> MomBrain does
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Bell className="h-4 w-4 mt-0.5 text-primary" />
                Reminder · Aryan's cricket match · Tue 5:00 PM
              </li>
              <li className="flex items-start gap-2">
                <ListTodo className="h-4 w-4 mt-0.5 text-primary" />
                Task · Buy milk · Tomorrow
              </li>
            </ul>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <h2 className="text-3xl font-display font-semibold text-center mb-12">
            Built for the way families actually talk.
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            <Feature
              icon={<Mic className="h-5 w-5" />}
              title="Just speak"
              text="No forms, no menus. Tap once and tell MomBrain what's on your mind."
            />
            <Feature
              icon={<Languages className="h-5 w-5" />}
              title="Hinglish-native"
              text="Understands code-switched speech the way your family actually uses it."
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title="Understands context"
              text="Knows who 'Aryan' is, what 'kal' means, and when to ask a clarifying question."
            />
            <Feature
              icon={<Bell className="h-5 w-5" />}
              title="Smart reminders"
              text="Time-based reminders that surface at the right moment — never too early, never late."
            />
            <Feature
              icon={<CalendarPlus className="h-5 w-5" />}
              title="Calendar export"
              text="Send any item to your phone's calendar with one tap."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Private by design"
              text="Your family data stays scoped to your account. Nothing shared, nothing sold."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-5 py-20 text-center">
          <h2 className="text-4xl font-display font-semibold mb-4">
            Stop juggling. Start talking.
          </h2>
          <p className="text-muted-foreground mb-8">
            Free to start. Sign up with email and try MomBrain in under 30 seconds.
          </p>
          <Link to="/auth">
            <Button size="lg" className="rounded-full mic-btn border-0 h-12 px-8 text-base">
              Create your MomBrain
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MomBrain — Voice-first family OS
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="card-soft p-5">
      <div className="mic-btn rounded-full p-2 w-fit mb-3">{icon}</div>
      <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
