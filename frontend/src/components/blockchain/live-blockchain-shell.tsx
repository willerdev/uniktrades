"use client";

import type { ChainContractEnrollment } from "@/lib/api";
import { BlockchainProvider } from "@/hooks/use-blockchain";
import { BlockchainDashboard } from "@/components/blockchain/blockchain-dashboard";

/** Client-only live vault shell (ethers + wallet). Loaded after ACTIVE enrollment. */
export function LiveBlockchainShell({
  enrollment,
  onEnrollmentChange,
}: {
  enrollment: ChainContractEnrollment;
  onEnrollmentChange?: (next: ChainContractEnrollment) => void;
}) {
  return (
    <BlockchainProvider>
      <BlockchainDashboard
        enrollment={enrollment}
        onEnrollmentChange={onEnrollmentChange}
      />
    </BlockchainProvider>
  );
}
