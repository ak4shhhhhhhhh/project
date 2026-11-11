import { useState } from "react";
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";

interface SecretRevealDialogProps {
  deviceName: string;
  secret: string;
  onClose: () => void;
}

export function SecretRevealDialog({ deviceName, secret, onClose }: SecretRevealDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="secret-dialog-title" className="card w-full max-w-lg animate-slide-up p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-nature-100 text-nature-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 id="secret-dialog-title" className="font-display text-xl font-semibold text-neutral-900">
              Device secret for {deviceName}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">Copy this secret into the device now. It is shown only once.</p>
          </div>
        </div>

        <div className="mt-6 break-all rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-sm text-neutral-800">
          {secret}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>If you close this window without copying, you will need to generate a new secret.</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy secret"}
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            I have saved it
          </button>
        </div>
      </div>
    </div>
  );
}
