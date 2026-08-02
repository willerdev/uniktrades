"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  animate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecentPayoutsShowcase } from "@/components/marketing/recent-payouts-showcase";
import { InvestmentRules } from "@/components/marketing/investment-rules";
import { DailyCreditTimeText } from "@/components/daily-credit-time-text";
import { useAuthStore } from "@/stores/auth";

const PATH = [
  {
    title: "Fund",
    body: "Deposit USDT to your wallet. Capital stays yours until you allocate.",
  },
  {
    title: "Allocate",
    body: "Move into Smart Invest, pay the tiered fee, and set your size.",
  },
  {
    title: "Compound",
    body: "earn-daily",
  },
  {
    title: "Exit",
    body: "Withdraw after KYC — or auto-reinvest 90% and keep growing.",
  },
] as const;

function RisingMarketVisual() {
  const bars = [
    { x: 40, h: 48 },
    { x: 90, h: 72 },
    { x: 140, h: 58 },
    { x: 190, h: 96 },
    { x: 240, h: 84 },
    { x: 290, h: 128 },
    { x: 340, h: 110 },
    { x: 390, h: 156 },
    { x: 440, h: 138 },
    { x: 490, h: 188 },
    { x: 540, h: 168 },
    { x: 590, h: 220 },
  ];

  return (
    <svg
      viewBox="0 0 680 280"
      className="h-full w-full"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E676" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00E676" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00E676" stopOpacity="0" />
          <stop offset="50%" stopColor="#00E676" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#E8E8E8" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.line
        x1="0"
        y1="210"
        x2="680"
        y2="40"
        stroke="url(#beam)"
        strokeWidth="1.5"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />

      {bars.map((bar, i) => (
        <motion.rect
          key={bar.x}
          x={bar.x}
          width="18"
          rx="2"
          fill="url(#barFill)"
          initial={{ height: 0, y: 260 }}
          animate={{ height: bar.h, y: 260 - bar.h }}
          transition={{
            duration: 0.9,
            delay: 0.15 + i * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}

      <motion.polygon
        points="610,28 640,48 610,48"
        fill="#00E676"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
      />
    </svg>
  );
}

function YieldCounter() {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 22 });

  useEffect(() => {
    const controls = animate(mv, 8, {
      duration: 1.9,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.4,
    });
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = v.toFixed(1);
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [mv, spring]);

  return (
    <span ref={ref} className="tabular-nums">
      0.0
    </span>
  );
}

export default function HomePage() {
  const isLoggedIn = Boolean(useAuthStore((s) => s.token));
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroFade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const primaryHref = isLoggedIn ? "/invest" : "/register";
  const primaryLabel = isLoggedIn ? "Open Invest" : "Get started";

  return (
    <div className="relative overflow-hidden">
      {/* HERO — full-bleed brand composition */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] overflow-hidden"
      >
        <motion.div
          aria-hidden
          style={{ scale: heroScale }}
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-[#050505]" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(0,230,118,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(232,232,232,0.06), transparent 55%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-18deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)",
            }}
          />
          <motion.div
            className="absolute -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[100px]"
            animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.08, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.div
          style={{ opacity: heroFade }}
          className="mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-4 pb-16 pt-20 text-center sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uniktrades-logo.png"
              alt="UnikTrades"
              className="mx-auto h-[clamp(7rem,22vw,12rem)] w-auto max-w-[min(100%,36rem)] object-contain"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 max-w-3xl text-[clamp(1.75rem,4.2vw,3.1rem)] font-bold leading-[1.1] tracking-tight text-white"
          >
            Grow with clarity.
            <span className="block text-gradient">Withdraw with confidence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.55 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
          >
            Smart Invest pays daily USDT yield on eligible balance — transparent
            fees, a 24-hour hold on new capital, KYC before cash-out.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.55 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link href={primaryHref}>
              <Button size="lg" className="group gap-2 px-8">
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href={isLoggedIn ? "/wallet" : "/login"}>
              <Button size="lg" variant="secondary" className="px-8">
                {isLoggedIn ? "Open wallet" : "Sign in"}
              </Button>
            </Link>
          </motion.div>

          <motion.div
            style={{ y: visualY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="mt-14 w-full max-w-3xl"
          >
            <RisingMarketVisual />
          </motion.div>

          <motion.a
            href="#path"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-8 inline-flex flex-col items-center gap-1 text-[11px] uppercase tracking-[0.28em] text-muted transition-colors hover:text-foreground"
          >
            See the path
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="h-4 w-4" />
            </motion.span>
          </motion.a>
        </motion.div>
      </section>

      {/* Yield highlight — below fold */}
      <section className="border-y border-white/8 bg-white/[0.02] px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
              Platform daily yield
            </p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
              <YieldCounter />
              <span className="text-2xl text-primary sm:text-3xl">%</span>
            </p>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            VIP lifts daily yield to 10%, unlocks weekends, and removes wallet
            withdrawal fees while active.
          </p>
        </div>
      </section>

      {/* Path — vertical spine */}
      <section id="path" className="relative mx-auto max-w-2xl px-4 py-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Four moves. One loop.
          </h2>
          <p className="mt-4 max-w-md text-base text-muted">
            No ladder. No noise. Capital in, yield daily, exit when you&apos;re ready.
          </p>
        </motion.div>

        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute bottom-2 left-[1.15rem] top-2 w-px bg-gradient-to-b from-primary via-white/15 to-transparent"
          />

          <ol className="space-y-10">
            {PATH.map((item, i) => (
              <motion.li
                key={item.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  delay: 0.08 * i,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative grid grid-cols-[2.3rem_1fr] items-start gap-5"
              >
                <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-[#050505] font-mono text-xs font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.body === "earn-daily" ? (
                      <>
                        After the 24-hour hold, eligible balance earns yield{" "}
                        <DailyCreditTimeText variant="short" />.
                      </>
                    ) : (
                      item.body
                    )}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <InvestmentRules />

      <RecentPayoutsShowcase />

      {/* Closing CTA */}
      <section className="relative mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-20"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,230,118,0.16),transparent_65%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />

          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            Invite only
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted sm:text-lg">
            Use a member referral link, activate your account, and put capital
            on Smart Invest.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-8">
                Join UnikTrades
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="px-8">
                Sign in
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
