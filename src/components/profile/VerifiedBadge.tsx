import { Check } from "lucide-react";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        "relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1D9BF0] shadow-[0_0_0_1px_rgba(29,155,240,0.35),0_2px_10px_rgba(29,155,240,0.25)] ring-1 ring-white/10 transition-transform duration-200 motion-safe:animate-[verifiedPop_380ms_ease-out] hover:scale-[1.06] " +
        (className || "")
      }
      aria-label="Usuario verificado"
    >
      <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent" />
      <Check className="relative h-3 w-3 text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]" />
    </span>
  );
}
