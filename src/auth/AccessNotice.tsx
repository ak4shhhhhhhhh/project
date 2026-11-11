import { Clock, ShieldX, AlertTriangle, LogOut, RotateCw, Sprout } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import type { AccessStatus } from "@/lib/types";

const NOTICES: Record<Exclude<AccessStatus, "loading" | "owner">, {
  icon: typeof Clock;
  title: string;
  body: string;
  tone: string;
}> = {
  pending: {
    icon: Clock,
    title: "Waiting for approval",
    body: "Your account was created, but the owner still needs to approve it before you can open the dashboard.",
    tone: "bg-amber-50 text-amber-700",
  },
  denied: {
    icon: ShieldX,
    title: "This dashboard is owner-only",
    body: "Your account does not have access to this garden. Sign out and use the owner account instead.",
    tone: "bg-red-50 text-red-700",
  },
  error: {
    icon: AlertTriangle,
    title: "We could not check your access",
    body: "Something went wrong while confirming your account. Please try again in a moment.",
    tone: "bg-red-50 text-red-700",
  },
};

export function AccessNotice({ status }: { status: Exclude<AccessStatus, "loading" | "owner"> }) {
  const { signOut } = useAuth();
  const notice = NOTICES[status];
  const Icon = notice.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-nature-50 p-6">
      <div className="card w-full max-w-md animate-slide-up p-8 text-center">
        <div className="mx-auto mb-5 flex items-center gap-2 text-nature-700">
          <Sprout className="h-6 w-6" />
          <span className="font-display text-lg font-semibold">Verdant</span>
        </div>
        <div className={`mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full ${notice.tone}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-semibold text-neutral-900">{notice.title}</h1>
        <p className="mt-2 text-sm text-neutral-500">{notice.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {status === "error" && (
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              <RotateCw className="h-4 w-4" />
              Try again
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
