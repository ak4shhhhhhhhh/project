import { useState } from "react";
import { Sprout, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { NAV_ITEMS, type SectionId } from "@/app/navigation";

interface AppLayoutProps {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  children: React.ReactNode;
}

export function AppLayout({ active, onNavigate, children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = NAV_ITEMS.find((n) => n.id === active);

  function handleNav(id: SectionId) {
    onNavigate(id);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-neutral-200/70 bg-white">
        <SidebarContent active={active} onNavigate={handleNav} email={user?.email} onSignOut={signOut} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-neutral-900/30 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-white shadow-xl animate-slide-up">
            <button
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent active={active} onNavigate={handleNav} email={user?.email} onSignOut={signOut} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-200/70 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-nature-700 hover:bg-nature-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold text-neutral-900 truncate">{activeItem?.label}</h1>
            <p className="hidden text-xs text-neutral-500 sm:block">{activeItem?.description}</p>
          </div>
          <div className="ml-auto hidden items-center gap-2 text-sm text-neutral-500 sm:flex">
            <span className="max-w-[180px] truncate">{user?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  active,
  onNavigate,
  email,
  onSignOut,
}: {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  email?: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-nature-600 text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-semibold text-neutral-900">Verdant</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-nature-100 text-nature-800"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${isActive ? "text-nature-600" : "text-neutral-400"}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200/70 p-3">
        <div className="mb-2 px-3 text-xs text-neutral-400">
          <span className="block max-w-[180px] truncate">{email}</span>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <LogOut className="h-[18px] w-[18px] text-neutral-400" />
          Sign out
        </button>
      </div>
    </>
  );
}
