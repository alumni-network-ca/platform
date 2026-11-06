import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Arrows that sit in a line of text ("← Back", "See all →"), sized and aligned to the text around them. Decorative:
// the link's words carry the meaning (docs/design/ui-foundation.md, Icons).
const inline = "inline-block size-[1.1em] shrink-0 align-[-0.2em]";

export function BackArrow({ className }: { className?: string }) {
  return <ArrowLeft aria-hidden className={cn(inline, "mr-1", className)} />;
}

export function ForwardArrow({ className }: { className?: string }) {
  return <ArrowRight aria-hidden className={cn(inline, "ml-1", className)} />;
}
