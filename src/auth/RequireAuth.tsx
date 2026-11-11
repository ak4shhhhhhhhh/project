import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import { AuthPage } from "@/auth/AuthPage";
import { AccessNotice } from "@/auth/AccessNotice";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3 text-neutral-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm">Loading your garden…</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, access } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;
  if (access === "loading") return <LoadingScreen />;
  if (access !== "owner") return <AccessNotice status={access} />;
  return <>{children}</>;
}
