import { useState, type FormEvent } from "react";
import { Sprout, Leaf, ShieldCheck, Activity, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import type { AuthMode } from "@/lib/types";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const result = mode === "login" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === "signup") {
      setError(null);
      setMode("login");
      setEmail("");
      setPassword("");
      alert("Account created. You can now sign in.");
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-nature-700 p-12 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #66a284 0, transparent 40%), radial-gradient(circle at 80% 70%, #326b4f 0, transparent 45%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Sprout className="h-6 w-6" />
            </div>
            <span className="font-display text-xl font-semibold">Verdant</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Smart plant monitoring,<br />grown with precision.
          </h1>
          <p className="max-w-sm text-nature-100/90">
            Live soil moisture data, automatic watering, and full device control — all from one calm, reliable dashboard.
          </p>
          <div className="space-y-3 pt-4">
            <FeatureRow icon={<Activity className="h-4 w-4" />} text="Real-time soil moisture & pump status" />
            <FeatureRow icon={<Leaf className="h-4 w-4" />} text="Threshold-based automatic watering" />
            <FeatureRow icon={<ShieldCheck className="h-4 w-4" />} text="Secure, owner-only access" />
          </div>
        </div>
        <p className="relative text-xs text-nature-200/70">Connected to your Arduino + ESP8266 hardware.</p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center bg-nature-50 p-6 lg:p-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5 text-nature-700">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-nature-100">
                <Sprout className="h-6 w-6" />
              </div>
              <span className="font-display text-xl font-semibold">Verdant</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-neutral-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            {mode === "login" ? "Sign in to monitor your plants." : "Set up your single-owner account."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="input pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            {mode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
            <button
              type="button"
              className="font-medium text-nature-700 hover:text-nature-800 underline-offset-2 hover:underline"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-nature-50/90">
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">{icon}</div>
      <span>{text}</span>
    </div>
  );
}
