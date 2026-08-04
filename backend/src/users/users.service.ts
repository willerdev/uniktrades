import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateProfileDto,
  UpdateAddressDto,
  SubmitKycDto,
  UpdatePaymentDetailsDto,
  UpdateTradingAccountDto,
  UpdateDisplayCurrencyDto,
} from '../common/dto';
import { currentWeekYear } from '../common/week.util';
import { assertAllowedDisplayName } from '../common/display-name.util';
import { isValidTrc20Address } from '../common/payout.util';
import { MetaApiService } from '../metaapi/metaapi.service';
import { getPayoutRewardStatus, getWeeklyTierPayoutsEnabled } from '../payouts/payout-reward-tier.util';
import {
  hasActiveTradingAccess,
  tradingAccessDaysRemaining,
} from '../common/weekly-access.util';
import { ProfitShareService } from '../profit-share/profit-share.service';
import { Mt5PoolService } from '../mt5-sync/mt5-pool.service';
import { resolveAdminPermissions } from '../admin/admin-permissions.util';
import {
  DISPLAY_CURRENCY_OPTIONS,
  isSupportedDisplayCurrency,
  normalizeCurrencyCode,
  resolvePreferredDisplayCurrency,
} from '../fx/country-currency.util';
import { FxRatesService } from '../fx/fx-rates.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private metaApi: MetaApiService,
    private profitShare: ProfitShareService,
    private mt5Pool: Mt5PoolService,
    private fxRates: FxRatesService,
  ) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        virtualAccount: true,
        kyc: true,
        profile: true,
        _count: { select: { signals: true } },
      },
    });

    if (!user) return null;

    const { weekNumber, year } = currentWeekYear();

    const rank = await this.prisma.leaderboard.findUnique({
      where: { userId_year_weekNumber: { userId, year, weekNumber } },
    });

    const recentSignals = await this.prisma.signal.findMany({
      where: {
        userId,
        status: { notIn: ['ARCHIVED', 'CANCELLED', 'REJECTED_DUPLICATE'] },
      },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    });

    const walletTransactions = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const [payoutRewardBase, weeklyPayoutsEnabled, profitShare] = await Promise.all([
      getPayoutRewardStatus(this.prisma, userId),
      getWeeklyTierPayoutsEnabled(this.prisma),
      this.profitShare.getStatus(userId),
    ]);
    const payoutReward = { ...payoutRewardBase, weeklyPayoutsEnabled };

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        registrationPaid: user.registrationPaid,
        accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
        tradingAccessActive: hasActiveTradingAccess(user),
        tradingDaysRemaining: tradingAccessDaysRemaining(user.accessExpiresAt),
        adminPermissions: resolveAdminPermissions(user),
      },
      onboarding: {
        emailVerified: user.emailVerified,
        registrationPaid: user.registrationPaid,
        accountActive: user.status === 'ACTIVE',
        kycStatus: user.kyc?.status ?? 'NOT_STARTED',
        withdrawKycExempt: Boolean(
          user.instantWithdraw && user.instantWithdrawKycExempt,
        ),
        profileComplete: Boolean(
          user.profile?.firstName &&
            user.profile?.lastName &&
            user.profile?.country,
        ),
        addressComplete: Boolean(user.profile?.addressLine1),
        hasSubmittedSignal: user._count.signals > 0,
      },
      account: user.virtualAccount,
      rank: rank?.rank ?? null,
      tier: user.virtualAccount?.tier ?? 'BRONZE',
      recentSignals,
      walletTransactions,
      payoutReward,
      profitShare,
    };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        virtualAccount: true,
      },
    });
  }

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kyc: true,
        virtualAccount: { select: { tier: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        walletAddress: user.walletAddress,
        metaApiAccountId: user.metaApiAccountId,
        createdAt: user.createdAt,
        tier: user.virtualAccount?.tier ?? 'BRONZE',
        instantWithdraw: user.instantWithdraw,
        withdrawKycExempt: Boolean(
          user.instantWithdraw && user.instantWithdrawKycExempt,
        ),
      },
      profile: user.profile,
      kyc: await this.effectiveKyc(userId, user.kyc),
      displayCurrency: await this.fxRates.buildDisplayCurrency(
        resolvePreferredDisplayCurrency({
          preferredCurrency: user.profile?.preferredCurrency,
          country: user.profile?.country,
        }),
      ),
      currencyOptions: [...DISPLAY_CURRENCY_OPTIONS],
      metaApi: {
        configured: this.metaApi.isConfigured,
        defaultAccountId: this.metaApi.resolveAccountId(null),
      },
    };
  }

  async updateDisplayCurrency(
    userId: string,
    dto: UpdateDisplayCurrencyDto,
  ) {
    let preferred: string | null = null;
    if (dto.preferredCurrency != null && String(dto.preferredCurrency).trim()) {
      const code = normalizeCurrencyCode(String(dto.preferredCurrency));
      if (!code) {
        throw new BadRequestException('Invalid currency code');
      }
      if (code === 'USDT') {
        preferred = 'USDT';
      } else if (code === 'LOCAL') {
        preferred = 'LOCAL';
      } else if (isSupportedDisplayCurrency(code)) {
        preferred = code;
      } else {
        throw new BadRequestException(
          'Unsupported currency — pick USDT, Local, or a listed currency',
        );
      }
    }

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, preferredCurrency: preferred },
      update: { preferredCurrency: preferred },
    });

    return this.getSettings(userId);
  }

  async updateTradingAccount(userId: string, dto: UpdateTradingAccountDto) {
    const nextId =
      dto.metaApiAccountId === null || dto.metaApiAccountId === ''
        ? null
        : dto.metaApiAccountId?.trim();

    if (nextId) {
      if (!this.metaApi.isConfigured) {
        throw new BadRequestException('Live trading is not available yet');
      }
      await this.mt5Pool.assertAccountLinkable(userId, nextId);
      await this.metaApi.getAccount(nextId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { metaApiAccountId: nextId },
    });

    return this.getSettings(userId);
  }

  async claimTradingAccount(
    userId: string,
    dto: {
      accountName: string;
      login: string;
      password: string;
      server: string;
    },
  ) {
    const result = await this.mt5Pool.linkUserAccount(userId, dto);
    const settings = await this.getSettings(userId);
    return { ...result, settings };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const userUpdate: { displayName?: string } = {};
    if (dto.displayName?.trim()) {
      userUpdate.displayName = assertAllowedDisplayName(dto.displayName);
    }

    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    const profileData = {
      firstName: dto.firstName?.trim() || undefined,
      lastName: dto.lastName?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    };

    const hasProfileFields = Object.values(profileData).some((v) => v !== undefined);
    if (hasProfileFields) {
      await this.prisma.userProfile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });
    }

    return this.getSettings(userId);
  }

  async updateAddress(userId: string, dto: UpdateAddressDto) {
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        country: dto.country?.trim() || null,
        state: dto.state?.trim() || null,
        city: dto.city?.trim() || null,
        addressLine1: dto.addressLine1?.trim() || null,
        addressLine2: dto.addressLine2?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
      },
      update: {
        country: dto.country?.trim() || null,
        state: dto.state?.trim() || null,
        city: dto.city?.trim() || null,
        addressLine1: dto.addressLine1?.trim() || null,
        addressLine2: dto.addressLine2?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
      },
    });

    return this.getSettings(userId);
  }

  async updatePaymentDetails(userId: string, dto: UpdatePaymentDetailsDto) {
    if (dto.payoutMethod === 'TRC20') {
      const address = dto.trc20Address?.trim();
      if (!address || !isValidTrc20Address(address)) {
        throw new BadRequestException(
          'Enter a valid USDT TRC20 address (starts with T, 34 characters)',
        );
      }

      await this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          payoutMethod: 'TRC20',
          trc20Address: address,
          mobileMoneyProvider: null,
          mobileMoneyNumber: null,
          mobileMoneyAccountName: null,
        },
        update: {
          payoutMethod: 'TRC20',
          trc20Address: address,
          mobileMoneyProvider: null,
          mobileMoneyNumber: null,
          mobileMoneyAccountName: null,
        },
      });
    } else {
      const provider = dto.mobileMoneyProvider?.trim();
      const number = dto.mobileMoneyNumber?.trim();
      if (!provider || !number || number.length < 8) {
        throw new BadRequestException(
          'Mobile money provider and phone number are required',
        );
      }

      await this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          payoutMethod: 'MOBILE_MONEY',
          trc20Address: null,
          mobileMoneyProvider: provider,
          mobileMoneyNumber: number,
          mobileMoneyAccountName: dto.mobileMoneyAccountName?.trim() || null,
        },
        update: {
          payoutMethod: 'MOBILE_MONEY',
          trc20Address: null,
          mobileMoneyProvider: provider,
          mobileMoneyNumber: number,
          mobileMoneyAccountName: dto.mobileMoneyAccountName?.trim() || null,
        },
      });
    }

    return this.getSettings(userId);
  }

  async submitKyc(_userId: string, _dto: SubmitKycDto) {
    throw new BadRequestException(
      'Use the Contract KYC flow (Blockchain → Verify) for identity verification. It includes document AI checks and liveness.',
    );
  }

  async retryKyc(userId: string) {
    const existing = await this.prisma.kycVerification.findUnique({
      where: { userId },
    });

    if (!existing || existing.status !== 'REJECTED') {
      throw new BadRequestException(
        'Only rejected KYC submissions can be retried',
      );
    }

    return this.prisma.kycVerification.update({
      where: { userId },
      data: {
        status: 'NOT_STARTED',
        documentType: null,
        documentNumber: null,
        documentFrontUrl: null,
        documentBackUrl: null,
        selfieUrl: null,
        pendingUploadFilenames: [],
        reviewedAt: null,
        submittedAt: null,
      },
    });
  }

  async getKyc(userId: string) {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { userId },
    });
    return this.effectiveKyc(userId, kyc);
  }

  /**
   * Prefer chain enrollment status when it is ahead of the legacy KYC row
   * (unified identity flow).
   */
  private async effectiveKyc(
    userId: string,
    kyc: {
      status: string;
      documentType?: string | null;
      documentNumber?: string | null;
      documentFrontUrl?: string | null;
      documentBackUrl?: string | null;
      selfieUrl?: string | null;
      rejectionReason?: string | null;
      submittedAt?: Date | null;
      reviewedAt?: Date | null;
    } | null,
  ) {
    const enrollment = await this.prisma.chainContractEnrollment
      .findUnique({ where: { userId } })
      .catch(() => null);

    if (
      enrollment?.status === 'APPROVED' ||
      enrollment?.status === 'ACTIVE'
    ) {
      return {
        status: 'APPROVED' as const,
        documentType: enrollment.documentType ?? kyc?.documentType ?? null,
        documentNumber: enrollment.documentNumber ?? kyc?.documentNumber ?? null,
        documentFrontUrl:
          enrollment.documentFrontUrl ?? kyc?.documentFrontUrl ?? null,
        documentBackUrl:
          enrollment.documentBackUrl ?? kyc?.documentBackUrl ?? null,
        selfieUrl: enrollment.livenessSelfieUrl ?? kyc?.selfieUrl ?? null,
        rejectionReason: null,
        submittedAt: enrollment.kycSubmittedAt ?? kyc?.submittedAt ?? null,
        reviewedAt: enrollment.approvedAt ?? kyc?.reviewedAt ?? null,
        source: 'chain_contract' as const,
      };
    }

    if (enrollment?.status === 'KYC_PENDING') {
      return {
        status: 'PENDING' as const,
        documentType: enrollment.documentType,
        documentNumber: enrollment.documentNumber,
        documentFrontUrl: enrollment.documentFrontUrl,
        documentBackUrl: enrollment.documentBackUrl,
        selfieUrl: enrollment.livenessSelfieUrl,
        rejectionReason: null,
        submittedAt: enrollment.kycSubmittedAt,
        reviewedAt: null,
        source: 'chain_contract' as const,
      };
    }

    if (enrollment?.status === 'KYC_REJECTED') {
      return {
        status: 'REJECTED' as const,
        documentType: enrollment.documentType,
        documentNumber: enrollment.documentNumber,
        documentFrontUrl: enrollment.documentFrontUrl,
        documentBackUrl: enrollment.documentBackUrl,
        selfieUrl: enrollment.livenessSelfieUrl,
        rejectionReason: enrollment.rejectionReason,
        submittedAt: enrollment.kycSubmittedAt,
        reviewedAt: null,
        source: 'chain_contract' as const,
      };
    }

    return kyc
      ? { ...kyc, source: 'platform' as const }
      : { status: 'NOT_STARTED' as const, source: 'platform' as const };
  }

  private assertPinFormat(pin: string) {
    if (!/^\d{6}$/.test(pin?.trim() ?? '')) {
      throw new BadRequestException('PIN must be exactly 6 digits');
    }
  }

  async getAppPinStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { appPinHash: true, appPinUpdatedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      hasPin: Boolean(user.appPinHash),
      updatedAt: user.appPinUpdatedAt,
    };
  }

  async setAppPin(userId: string, pin: string, currentPin?: string) {
    this.assertPinFormat(pin);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { appPinHash: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.appPinHash) {
      if (!currentPin?.trim()) {
        throw new BadRequestException('Enter your current PIN to change it');
      }
      const ok = await bcrypt.compare(currentPin.trim(), user.appPinHash);
      if (!ok) throw new BadRequestException('Current PIN is incorrect');
    }

    const appPinHash = await bcrypt.hash(pin.trim(), 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { appPinHash, appPinUpdatedAt: new Date() },
    });
    return { ok: true, hasPin: true, message: 'App PIN saved' };
  }

  async clearAppPin(userId: string, currentPin: string) {
    this.assertPinFormat(currentPin);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { appPinHash: true },
    });
    if (!user?.appPinHash) {
      throw new BadRequestException('No app PIN is set');
    }
    const ok = await bcrypt.compare(currentPin.trim(), user.appPinHash);
    if (!ok) throw new BadRequestException('Current PIN is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { appPinHash: null, appPinUpdatedAt: new Date() },
    });
    return { ok: true, hasPin: false, message: 'App PIN removed' };
  }

  async verifyAppPin(userId: string, pin: string) {
    this.assertPinFormat(pin);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { appPinHash: true },
    });
    if (!user?.appPinHash) {
      throw new BadRequestException('Set an app PIN before using PIN auth');
    }
    const ok = await bcrypt.compare(pin.trim(), user.appPinHash);
    if (!ok) throw new BadRequestException('Incorrect PIN');
    return true;
  }
}
