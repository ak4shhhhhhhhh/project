import type { LucideIcon } from "lucide-react";

interface PlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights: { label: string; detail: string }[];
}

export function PagePlaceholder({ icon: Icon, title, description, highlights }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="card p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-nature-100 text-nature-600">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-neutral-900">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">{description}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((h) => (
          <div key={h.label} className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-nature-600">{h.label}</p>
            <p className="mt-2 text-sm text-neutral-600">{h.detail}</p>
          </div>
        ))}
      </div>

      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-nature-50 text-nature-500">
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-neutral-700">Coming in a later milestone</p>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">
          This section is part of the project roadmap and will be built in a future milestone.
        </p>
      </div>
    </div>
  );
}
