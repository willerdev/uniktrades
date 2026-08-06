"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { AuthLoadingScreen, useRequireAuth } from "@/hooks/use-require-auth";
import {
  ContractEnrollFlow,
  useChainEnrollment,
} from "@/components/blockchain/contract-enroll-flow";
import { BlockchainErrorBoundary } from "@/components/blockchain/error-boundary";

/** Heavy ethers dashboard — load only after enrollment is ACTIVE. */
const LiveBlockchainShell = dynamic(
  () =>
    import("@/components/blockchain/live-blockchain-shell").then((m) => ({
      default: m.LiveBlockchainShell,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  },
);

function BlockchainGate() {
  const { enrollment, setEnrollment, loading, error } = useChainEnrollment();

  if (loading && !enrollment) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !enrollment) {
    return (
      <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        {error}
      </p>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!enrollment.canAccessLiveDashboard) {
    return (
      <BlockchainErrorBoundary fallbackTitle="Verification hit a snag">
        <ContractEnrollFlow enrollment={enrollment} onUpdated={setEnrollment} />
      </BlockchainErrorBoundary>
    );
  }

  return (
    <BlockchainErrorBoundary fallbackTitle="Vault dashboard hit a snag">
      <LiveBlockchainShell
        enrollment={enrollment}
        onEnrollmentChange={setEnrollment}
      />
    </BlockchainErrorBoundary>
  );
}

export default function BlockchainPage() {
  const { ready } = useRequireAuth();

  if (!ready) return <AuthLoadingScreen />;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6 xl:px-8 xl:py-8">
      <BlockchainGate />
    </div>
  );
}
