"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLoadingScreen, useRequireAuth } from "@/hooks/use-require-auth";

/** Loans feature retired — redirect bookmarks to dashboard. */
export default function LoansPage() {
  const { ready } = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready) router.replace("/dashboard");
  }, [ready, router]);

  return <AuthLoadingScreen />;
}
