import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ensureDemoLeaderboardTraders } from '../src/leaderboard/demo-leaderboard.seed';

const prisma = new PrismaClient();
const PROMO_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  await prisma.platformConfig.upsert({
    where: { id: 'default' },
    update: {
      requireKycForPayouts: true,
      tpRewardUsd: 5,
      riskPercent: 5,
    },
    create: {
      id: 'default',
      registrationFeeUsdt: 5,
      traderPayoutPercent: 40,
      platformPayoutPercent: 60,
      riskPercent: 5,
      startingBalance: 1000,
      winPoints: 10,
      lossPoints: -5,
      duplicateThreshold: 0.9,
      entryTolerancePercent: 0.2,
      tpRewardUsd: 5,
      requireKycForPayouts: true,
    },
  });

  await prisma.virtualAccount.updateMany({
    where: {
      OR: [{ riskPercent: 2 }, { maxRiskPerTrade: 20 }],
    },
    data: {
      riskPercent: 5,
      maxRiskPerTrade: 50,
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@traderrank.pro';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!ChangeMe';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        displayName: 'Platform Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        registrationPaid: true,
        termsAcceptedAt: new Date(),
        virtualAccount: {
          create: {
            balance: 1000,
            maxRiskPerTrade: 50,
            riskPercent: 5,
          },
        },
      },
    });
    const code = randomBytes(4).toString('hex').toUpperCase();
    await prisma.user.update({
      where: { id: admin.id },
      data: { referralCode: code },
    });
    console.log(`Admin user created: ${adminEmail}`);
    console.log(`Admin password: ${adminPassword}`);
    console.log(`Admin invite/referral code: ${code}`);
  } else if (existingAdmin.role !== 'ADMIN') {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN', status: 'ACTIVE' },
    });
    console.log(`Promoted ${adminEmail} to ADMIN`);
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, referralCode: true },
  });
  if (adminUser && !adminUser.referralCode) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      try {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { referralCode: code },
        });
        console.log(`Admin invite/referral code: ${code}`);
        break;
      } catch {
        continue;
      }
    }
  } else if (adminUser?.referralCode) {
    console.log(`Admin invite/referral code: ${adminUser.referralCode}`);
  }

  console.log(`Admin login email: ${adminEmail}`);
  if (!existingAdmin) {
    console.log(`Admin password: ${adminPassword}`);
  } else {
    console.log(
      `(Password unchanged — use existing password or set ADMIN_PASSWORD and reset manually)`,
    );
  }

  await prisma.promoCode.upsert({
    where: { code: 'win2026' },
    create: {
      code: 'win2026',
      discountPercent: 100,
      description: '100% off registration — free virtual account',
      expiresAt: new Date(Date.now() + PROMO_VALIDITY_MS),
      active: true,
    },
    update: {},
  });

  console.log('Platform config seeded');

  const traderCount = await ensureDemoLeaderboardTraders(prisma);
  console.log(`Leaderboard demo traders ready (${traderCount} total accounts ranked)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
