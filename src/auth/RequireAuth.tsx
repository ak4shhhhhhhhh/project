import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import { AuthPage } from "@/auth/AuthPage";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm">Loading your garden…</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <>{children}</>;
}
