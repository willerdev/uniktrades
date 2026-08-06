import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NowPaymentsService } from './nowpayments.service';
import { BlockchainScannerService } from './blockchain-scanner.service';
import { resolvePublicApiBaseUrl } from '../common/public-url.util';

const CUSTODY_ORDER_PREFIX = 'custody:';

@Injectable()
export class CustodyDepositService {
  constructor(
    private prisma: PrismaService,
    private nowPayments: NowPaymentsService,
    private config: ConfigService,
    private blockchain: BlockchainScannerService,
  ) {}

  private ipnUrl() {
    return `${resolvePublicApiBaseUrl(this.config)}/api/v1/payments/ipn`;
  }

  custodyOrderId(depositId: string) {
    return `${CUSTODY_ORDER_PREFIX}${depositId}`;
  }

  isCustodyOrderId(orderId: string) {
    return orderId.startsWith(CUSTODY_ORDER_PREFIX);
  }

  depositIdFromOrderId(orderId: string) {
    return orderId.slice(CUSTODY_ORDER_PREFIX.length);
  }

  async getPlatformLedger() {
    const [deposited, withdrawnConfirmed, withdrawnPending] = await Promise.all([
      this.prisma.custodyDeposit.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.custodyWithdraw.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.custodyWithdraw.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const depositedTotal = Number(deposited._sum.amount ?? 0);
    const withdrawnTotal = Number(withdrawnConfirmed._sum.amount ?? 0);
    const pendingWithdrawTotal = Number(withdrawnPending._sum.amount ?? 0);
    const available = Math.max(
      0,
      Math.round((depositedTotal - withdrawnTotal - pendingWithdrawTotal) * 100) /
        100,
    );

    return {
      depositedTotal,
      withdrawnTotal,
      pendingWithdrawTotal,
      available,
      depositCount: deposited._count,
      withdrawCount: withdrawnConfirmed._count,
      pendingWithdrawCount: withdrawnPending._count,
    };
  }

  /**
   * Admin platform wallet (FEE_PROFIT, referral rewards, etc.) — separate from
   * the custody crypto ledger used for trader payouts.
   */
  private async getAdminPlatformWalletBalance(): Promise<{
    adminUserId: string | null;
    adminEmail: string | null;
    adminWalletBalance: number;
  }> {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL')?.trim();
    const byEmail = adminEmail
      ? await this.prisma.user.findUnique({
          where: { email: adminEmail },
          select: {
            id: true,
            email: true,
            role: true,
            platformWallet: { select: { availableBalance: true } },
          },
        })
      : null;
    const adminUser =
      byEmail?.role === 'ADMIN'
        ? byEmail
        : await this.prisma.user.findFirst({
            where: { role: 'ADMIN' },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              email: true,
              platformWallet: { select: { availableBalance: true } },
            },
          });

    return {
      adminUserId: adminUser?.id ?? null,
      adminEmail: adminUser?.email ?? null,
      adminWalletBalance: Number(
        adminUser?.platformWallet?.availableBalance ?? 0,
      ),
    };
  }

  async getWalletSummary() {
    const [ledger, adminWallet] = await Promise.all([
      this.getPlatformLedger(),
      this.getAdminPlatformWalletBalance(),
    ]);

    if (!this.nowPayments.isConfigured) {
      return {
        configured: false,
        payoutConfigured: false,
        message: 'Crypto payments are not configured on this server',
        /** Custody crypto ledger (confirmed deposits − withdrawals). */
        usdtBalance: ledger.available,
        platformUsdtBalance: ledger.available,
        /** Admin user platform wallet — enrollment FEE_PROFIT, referrals, etc. */
        adminWalletBalance: adminWallet.adminWalletBalance,
        adminWalletEmail: adminWallet.adminEmail,
        adminWalletUserId: adminWallet.adminUserId,
        gatewayUsdtBalance: 0,
        depositedTotal: ledger.depositedTotal,
        withdrawnTotal: ledger.withdrawnTotal,
        pendingWithdrawTotal: ledger.pendingWithdrawTotal,
        balances: {},
        pendingCryptoPayoutTotal: 0,
        pendingCryptoPayoutCount: 0,
      };
    }

    const payoutStatus = this.nowPayments.getPayoutConfigStatus();
    const missing: string[] = [];
    if (!payoutStatus.payoutEmailSet) missing.push('payout email');
    if (!payoutStatus.payoutPasswordSet) {
      missing.push('payout password');
    }

    const [balances, pendingAgg] = await Promise.all([
      this.nowPayments.getBalance(),
      this.prisma.payout.aggregate({
        where: {
          status: 'PENDING',
          payoutMethod: { not: 'MOBILE_MONEY' },
          walletAddress: { not: null },
        },
        _sum: { traderShare: true },
        _count: true,
      }),
    ]);

    const gatewayUsdtBalance = this.nowPayments.sumUsdtBalance(balances);

    return {
      configured: true,
      payoutConfigured: payoutStatus.payoutConfigured,
      payoutEmailSet: payoutStatus.payoutEmailSet,
      payoutPasswordSet: payoutStatus.payoutPasswordSet,
      message: payoutStatus.payoutConfigured
        ? undefined
        : `Wallet withdrawals need ${missing.join(' and ')} on the API service. Set them, then redeploy.`,
      /** Custody crypto ledger — deposits confirmed here for trader payouts. */
      usdtBalance: ledger.available,
      platformUsdtBalance: ledger.available,
      /** Admin platform wallet (FEE_PROFIT / referrals) — not custody crypto. */
      adminWalletBalance: adminWallet.adminWalletBalance,
      adminWalletEmail: adminWallet.adminEmail,
      adminWalletUserId: adminWallet.adminUserId,
      gatewayUsdtBalance,
      depositedTotal: ledger.depositedTotal,
      withdrawnTotal: ledger.withdrawnTotal,
      pendingWithdrawTotal: ledger.pendingWithdrawTotal,
      balances,
      pendingCryptoPayoutTotal: Number(pendingAgg._sum.traderShare ?? 0),
      pendingCryptoPayoutCount: pendingAgg._count,
    };
  }

  async createDeposit(adminId: string, amount: number, network: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    const deposit = await this.prisma.custodyDeposit.create({
      data: {
        adminId,
        amount,
        network: network.toUpperCase(),
      },
    });

    if (!this.nowPayments.isConfigured) {
      return {
        depositId: deposit.id,
        amount,
        network: deposit.network,
        configured: false,
        message: 'Crypto payments are not configured on this server',
      };
    }

    const orderId = this.custodyOrderId(deposit.id);
    const npPayment = await this.nowPayments.createPayment({
      amount,
      orderId,
      network: deposit.network,
      description: 'UnikTrades payout custody top-up',
      ipnCallbackUrl: this.ipnUrl(),
    });

    await this.prisma.custodyDeposit.update({
      where: { id: deposit.id },
      data: {
        gatewayId: String(npPayment.payment_id),
        gatewayResponse: {
          ...(npPayment as object),
          gateway: 'Crypto',
        } as object,
        payAddress: npPayment.pay_address,
        payAmount: npPayment.pay_amount,
      },
    });

    return {
      depositId: deposit.id,
      amount,
      network: deposit.network,
      payCurrency: npPayment.pay_currency,
      payAmount: npPayment.pay_amount,
      payAddress: npPayment.pay_address,
      gatewayPaymentId: npPayment.payment_id,
      liveStatus: npPayment.payment_status,
      invoiceUrl: npPayment.invoice_url,
      configured: true,
      message:
        'Send the exact pay amount to the address below. Funds credit your UnikTrades custody balance for trader payouts.',
    };
  }

  async listDeposits(
    limit = 20,
    options?: { status?: string; syncPending?: boolean },
  ) {
    if (options?.syncPending) {
      await this.syncAllPendingDeposits();
    }

    const take = Math.min(Math.max(limit, 1), 50);
    const where = options?.status
      ? { status: options.status as 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' }
      : {};

    const [items, pendingCount, confirmedAgg] = await Promise.all([
      this.prisma.custodyDeposit.findMany({
        where,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { email: true, displayName: true } },
        },
      }),
      this.prisma.custodyDeposit.count({ where: { status: 'PENDING' } }),
      this.prisma.custodyDeposit.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      items: items.map((d) => this.formatDeposit(d)),
      pendingCount,
      confirmedCount: confirmedAgg._count,
      confirmedTotalUsdt: Number(confirmedAgg._sum.amount ?? 0),
    };
  }

  private formatDeposit(
    deposit: {
      id: string;
      amount: { toString(): string };
      currency: string;
      network: string;
      status: string;
      gatewayId?: string | null;
      gatewayResponse: unknown;
      payAddress?: string | null;
      payAmount?: { toString(): string } | null;
      txHash?: string | null;
      confirmedAt?: Date | null;
      createdAt: Date;
      admin?: { email: string | null; displayName: string };
    },
  ) {
    const stored = deposit.gatewayResponse as Record<string, unknown> | null;
    const liveStatus =
      typeof stored?.payment_status === 'string'
        ? stored.payment_status
        : typeof stored?.blockchain === 'object' && stored.blockchain
          ? 'blockchain_confirmed'
          : undefined;

    return {
      id: deposit.id,
      amount: deposit.amount.toString(),
      currency: deposit.currency,
      network: deposit.network,
      status: deposit.status,
      gatewayId: deposit.gatewayId,
      payAddress:
        deposit.payAddress || (stored?.pay_address as string | undefined),
      payAmount:
        deposit.payAmount != null
          ? Number(deposit.payAmount)
          : stored?.pay_amount != null
            ? Number(stored.pay_amount)
            : Number(deposit.amount),
      txHash: deposit.txHash,
      liveStatus,
      confirmedAt: deposit.confirmedAt?.toISOString() ?? null,
      createdAt: deposit.createdAt.toISOString(),
      admin: deposit.admin,
    };
  }

  async syncDeposit(depositId: string) {
    const before = await this.prisma.custodyDeposit.findUnique({
      where: { id: depositId },
    });
    if (!before) throw new NotFoundException('Custody deposit not found');

    if (before.status === 'PENDING') {
      await this.syncPendingDeposit(depositId);
    }

    return this.getDepositStatus(depositId);
  }

  async getDepositStatus(depositId: string) {
    const deposit = await this.prisma.custodyDeposit.findUnique({
      where: { id: depositId },
      include: {
        admin: { select: { email: true, displayName: true } },
      },
    });
    if (!deposit) throw new NotFoundException('Custody deposit not found');

    if (deposit.status === 'PENDING') {
      await this.syncPendingDeposit(depositId);
    }

    const refreshed = await this.prisma.custodyDeposit.findUniqueOrThrow({
      where: { id: depositId },
      include: {
        admin: { select: { email: true, displayName: true } },
      },
    });

    const stored = refreshed.gatewayResponse as Record<string, unknown> | null;
    const payAddress =
      refreshed.payAddress || (stored?.pay_address as string | undefined);
    const payAmount =
      refreshed.payAmount != null
        ? Number(refreshed.payAmount)
        : stored?.pay_amount != null
          ? Number(stored.pay_amount)
          : Number(refreshed.amount);
    const liveStatus =
      typeof stored?.payment_status === 'string'
        ? stored.payment_status
        : refreshed.txHash
          ? 'confirmed'
          : undefined;

    return {
      deposit: this.formatDeposit(refreshed),
      liveStatus,
      payAddress,
      payAmount,
      confirmed: refreshed.status === 'CONFIRMED',
      wallet: refreshed.status === 'CONFIRMED'
        ? await this.getWalletSummary().catch(() => null)
        : null,
    };
  }

  private extractTxHash(gatewayPayload: object): string | undefined {
    const p = gatewayPayload as Record<string, unknown>;
    if (typeof p.txHash === 'string') return p.txHash;
    const chain = p.blockchain as { txHash?: string } | undefined;
    if (chain?.txHash) return chain.txHash;
    if (typeof p.payin_hash === 'string') return p.payin_hash;
    if (typeof p.outcome_hash === 'string') return p.outcome_hash;
    return undefined;
  }

  private async confirmDeposit(
    depositId: string,
    gatewayPayload: object,
    gatewayId?: string,
  ) {
    const txHash = this.extractTxHash(gatewayPayload);
    await this.prisma.custodyDeposit.update({
      where: { id: depositId },
      data: {
        status: 'CONFIRMED',
        gatewayId: gatewayId ?? undefined,
        gatewayResponse: gatewayPayload,
        txHash: txHash ?? undefined,
        confirmedAt: new Date(),
      },
    });
    return { status: 'confirmed', depositId, txHash };
  }

  async handleIpn(payload: {
    payment_id?: number;
    payment_status?: string;
    order_id?: string;
  }) {
    const orderId = payload.order_id;
    if (!orderId || !this.isCustodyOrderId(orderId)) {
      return { ignored: true };
    }

    const depositId = this.depositIdFromOrderId(orderId);
    const deposit = await this.prisma.custodyDeposit.findUnique({
      where: { id: depositId },
    });
    if (!deposit) return { ignored: true };

    const status = payload.payment_status?.toLowerCase();
    const confirmed = ['finished', 'confirmed', 'sent'].includes(status || '');

    if (confirmed) {
      return this.confirmDeposit(
        deposit.id,
        payload as object,
        String(payload.payment_id ?? deposit.gatewayId),
      );
    }

    if (status === 'failed' || status === 'expired') {
      await this.prisma.custodyDeposit.update({
        where: { id: deposit.id },
        data: {
          status: status === 'failed' ? 'FAILED' : 'EXPIRED',
          gatewayResponse: payload as object,
        },
      });
    }

    return { status: payload.payment_status, depositId: deposit.id };
  }

  async syncAllPendingDeposits() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pending = await this.prisma.custodyDeposit.findMany({
      where: {
        status: 'PENDING',
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    let confirmed = 0;
    for (const deposit of pending) {
      const result = await this.syncPendingDeposit(deposit.id);
      if (result?.confirmed) confirmed += 1;
    }

    return { scanned: pending.length, confirmed };
  }

  async syncPendingDeposit(depositId: string) {
    const deposit = await this.prisma.custodyDeposit.findUnique({
      where: { id: depositId },
    });
    if (!deposit || deposit.status !== 'PENDING') return null;

    const stored = deposit.gatewayResponse as Record<string, unknown> | null;
    const payAddress =
      deposit.payAddress || (stored?.pay_address as string | undefined);
    const payAmount =
      deposit.payAmount != null
        ? Number(deposit.payAmount)
        : stored?.pay_amount != null
          ? Number(stored.pay_amount)
          : Number(deposit.amount);

    const gatewayId = deposit.gatewayId;

    if (gatewayId && this.nowPayments.isConfigured) {
      try {
        const live = await this.nowPayments.getPaymentStatus(gatewayId);
        const status = live.payment_status?.toLowerCase();
        const confirmed = ['finished', 'confirmed', 'sent'].includes(
          status || '',
        );

        if (confirmed) {
          await this.confirmDeposit(deposit.id, live as object, gatewayId);
          return { confirmed: true, source: 'nowpayments' as const };
        }

        if (status === 'failed' || status === 'expired') {
          await this.prisma.custodyDeposit.update({
            where: { id: deposit.id },
            data: {
              status: status === 'failed' ? 'FAILED' : 'EXPIRED',
              gatewayResponse: live as object,
            },
          });
          return { confirmed: false };
        }

        await this.prisma.custodyDeposit.update({
          where: { id: deposit.id },
          data: {
            gatewayResponse: live as object,
            payAddress: live.pay_address ?? deposit.payAddress ?? undefined,
            payAmount: live.pay_amount ?? deposit.payAmount ?? undefined,
          },
        });
      } catch {
        /* fall through to blockchain */
      }
    }

    if (!payAddress) return { confirmed: false };

    const chainMatch = await this.blockchain.findUsdtDeposit({
      network: deposit.network,
      payAddress,
      expectedAmount: payAmount,
      since: deposit.createdAt,
    });

    if (chainMatch) {
      await this.confirmDeposit(
        deposit.id,
        {
          blockchain: chainMatch,
          pay_address: payAddress,
          pay_amount: payAmount,
          actually_paid: chainMatch.amount,
        },
        gatewayId ?? undefined,
      );
      return { confirmed: true, source: 'blockchain' as const };
    }

    return { confirmed: false };
  }

  async createWithdraw(
    adminId: string,
    amount: number,
    address: string,
    network: string,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Withdraw amount must be greater than zero');
    }
    const dest = address.trim();
    if (dest.length < 10) {
      throw new BadRequestException('Enter a valid destination wallet address');
    }
    if (!this.nowPayments.isConfigured) {
      throw new BadRequestException('Crypto payments are not configured');
    }
    const payoutStatus = this.nowPayments.getPayoutConfigStatus();
    if (!payoutStatus.payoutConfigured) {
      const missing = [
        !payoutStatus.payoutEmailSet ? 'payout email' : null,
        !payoutStatus.payoutPasswordSet ? 'payout password' : null,
      ].filter(Boolean);
      throw new BadRequestException(
        `Wallet withdrawals need ${missing.join(' and ')} on the API service.`,
      );
    }

    const summary = await this.getWalletSummary();
    if (amount > summary.platformUsdtBalance) {
      throw new BadRequestException(
        `Insufficient UnikTrades custody balance (available $${summary.platformUsdtBalance.toFixed(2)} USDT). Deposit from this admin first.`,
      );
    }
    if (amount > summary.gatewayUsdtBalance) {
      throw new BadRequestException(
        `Insufficient gateway balance (available $${summary.gatewayUsdtBalance.toFixed(2)} USDT)`,
      );
    }

    const currency = this.nowPayments.mapNetworkToCurrency(network || 'TRC20');
    let result: { id: string };
    try {
      result = await this.nowPayments.createPayout({
        address: dest,
        amount,
        currency,
        ipnCallbackUrl: this.ipnUrl(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Payout failed';
      throw new BadRequestException(
        `Could not queue withdrawal: ${message}`,
      );
    }

    const row = await this.prisma.custodyWithdraw.create({
      data: {
        adminId,
        amount,
        network: (network || 'TRC20').toUpperCase(),
        address: dest,
        status: 'PENDING',
        gatewayPayoutId: result.id,
        gatewayResponse: { payoutId: result.id } as object,
      },
    });

    return {
      payoutId: result.id,
      withdrawId: row.id,
      amount,
      address: dest,
      network: row.network,
      needsVerification: true,
      message:
        'Withdrawal queued. Enter the verification code from your email to confirm.',
    };
  }

  async verifyWithdraw(payoutId: string, code: string) {
    const trimmed = code?.trim();
    if (!trimmed) {
      throw new BadRequestException('Verification code is required');
    }
    if (!payoutId?.trim()) {
      throw new BadRequestException('Payout id is required');
    }
    try {
      await this.nowPayments.verifyPayout(payoutId.trim(), trimmed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Verification failed';
      throw new BadRequestException(message);
    }

    await this.prisma.custodyWithdraw.updateMany({
      where: { gatewayPayoutId: payoutId.trim(), status: 'PENDING' },
      data: {
        status: 'CONFIRMED',
        verifiedAt: new Date(),
      },
    });

    return {
      ok: true as const,
      payoutId: payoutId.trim(),
      message: 'Withdrawal verified and sent.',
      wallet: await this.getWalletSummary().catch(() => null),
    };
  }

  async listWithdrawals(limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const items = await this.prisma.custodyWithdraw.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { email: true, displayName: true } },
      },
    });
    return {
      items: items.map((w) => ({
        id: w.id,
        amount: w.amount.toString(),
        currency: w.currency,
        network: w.network,
        address: w.address,
        status: w.status,
        gatewayPayoutId: w.gatewayPayoutId,
        verifiedAt: w.verifiedAt?.toISOString() ?? null,
        createdAt: w.createdAt.toISOString(),
        admin: w.admin,
      })),
    };
  }
}
