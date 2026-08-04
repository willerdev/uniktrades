import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  sidebar = false,
}: {
  className?: string;
  compact?: boolean;
  /** Collapsed sidebar: icon mark; expands to full wordmark on hover */
  sidebar?: boolean;
}) {
  if (sidebar) {
    return (
      <>
        <span
          className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl",
            "bg-black ring-1 ring-primary/30",
            className,
          )}
          aria-hidden
        >
          <Image
            src="/uniktrades-mark.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
        </span>
        <span
          className={cn(
            "ml-3 overflow-hidden whitespace-nowrap font-bold tracking-tight text-foreground transition-all duration-300",
            "max-w-0 opacity-0",
            "group-hover/sidebar:max-w-[11rem] group-hover/sidebar:opacity-100",
            "group-focus-within/sidebar:max-w-[11rem] group-focus-within/sidebar:opacity-100",
          )}
        >
          Unik<span className="text-accent">Trades</span>
        </span>
      </>
    );
  }

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 font-bold tracking-tight text-primary",
          className,
        )}
      >
        <Image
          src="/uniktrades-mark.png"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-md object-contain"
        />
        Unik<span className="text-accent">Trades</span>
      </span>
    );
  }

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <Image
        src="/uniktrades-logo.png"
        alt="UnikTrades"
        width={320}
        height={86}
        className="h-8 w-auto max-w-[11rem] object-contain object-left sm:h-9 sm:max-w-[14rem]"
        priority
      />
    </span>
  );
}
