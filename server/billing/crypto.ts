/**
 * Crypto Billing Integration
 * Handles subscription management via cryptocurrency payments
 * Supports manual verification and wallet-based payments
 */

import crypto from 'crypto';
import * as orgDb from '../db/organizations';

// --- Plan Configuration ---

export const PLANS = {
    free: {
        name: 'Free',
        monthlyPriceUSD: 0,
        cryptoPrices: { BTC: 0, ETH: 0, USDT: 0, USDC: 0 },
        limits: { links: 3, sessionsPerMonth: 100, users: 1, apiKeys: 1 },
        features: ['basic_analytics', '7_day_data_retention']
    },
    starter: {
        name: 'Starter',
        monthlyPriceUSD: 29,
        cryptoPrices: { BTC: 0.0005, ETH: 0.01, USDT: 29, USDC: 29 },
        limits: { links: 10, sessionsPerMonth: 1000, users: 3, apiKeys: 5 },
        features: ['basic_analytics', 'custom_branding', 'email_support', '30_day_data_retention']
    },
    pro: {
        name: 'Pro',
        monthlyPriceUSD: 99,
        cryptoPrices: { BTC: 0.0017, ETH: 0.035, USDT: 99, USDC: 99 },
        limits: { links: 50, sessionsPerMonth: 10000, users: 10, apiKeys: 20 },
        features: ['advanced_analytics', 'custom_branding', 'priority_support', 'api_access', 'webhooks', '90_day_data_retention', 'ab_testing']
    },
    enterprise: {
        name: 'Enterprise',
        monthlyPriceUSD: 299,
        cryptoPrices: { BTC: 0.005, ETH: 0.1, USDT: 299, USDC: 299 },
        limits: { links: -1, sessionsPerMonth: -1, users: -1, apiKeys: -1 },
        features: ['all', 'dedicated_support', 'custom_integrations', 'sla', 'unlimited_data_retention', 'white_label']
    }
} as const;

export type PlanKey = keyof typeof PLANS;
export type CryptoType = 'BTC' | 'ETH' | 'USDT' | 'USDC';

// --- Wallet Configuration ---

export const PLATFORM_WALLETS: Record<CryptoType, string> = {
    BTC: process.env['WALLET_BTC'] || '',
    ETH: process.env['WALLET_ETH'] || '',
    USDT: process.env['WALLET_USDT'] || '', // ERC-20 or TRC-20
    USDC: process.env['WALLET_USDC'] || ''  // ERC-20
};

// --- Payment Interface ---

export interface CryptoPayment {
    id: string;
    orgId: string;
    plan: PlanKey;
    cryptoType: CryptoType;
    amount: number;
    txHash?: string;
    status: 'pending' | 'verified' | 'rejected' | 'expired';
    walletAddress: string;
    expiresAt: number;
    verifiedBy?: string;
    verifiedAt?: number;
    createdAt: number;
}

// --- Payment Creation ---

export function createPaymentRequest(
    orgId: string,
    plan: PlanKey,
    cryptoType: CryptoType,
    durationMonths: number = 1
): CryptoPayment {
    const planConfig = PLANS[plan];
    const amount = planConfig.cryptoPrices[cryptoType] * durationMonths;
    const now = Date.now();

    return {
        id: crypto.randomUUID(),
        orgId,
        plan,
        cryptoType,
        amount,
        status: 'pending',
        walletAddress: PLATFORM_WALLETS[cryptoType],
        expiresAt: now + (24 * 60 * 60 * 1000), // 24 hours
        createdAt: now
    };
}

// --- Payment Verification (Admin Action) ---

export async function verifyPayment(
    paymentId: string,
    txHash: string,
    verifiedBy: string,
    dbModule: any // Pass db module to avoid circular deps
): Promise<void> {
    const payment = (await dbModule.getCryptoPayment(paymentId)) as CryptoPayment;

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status !== 'pending') {
        throw new Error(`Payment already ${payment.status}`);
    }

    if (Date.now() > payment.expiresAt) {
        throw new Error('Payment request expired');
    }

    // Calculate subscription end date
    const durationMonths = payment.amount / PLANS[payment.plan].cryptoPrices[payment.cryptoType];
    const subscriptionEnd = Date.now() + (durationMonths * 30 * 24 * 60 * 60 * 1000);

    // Update payment record
    await dbModule.updateCryptoPayment(paymentId, {
        txHash,
        status: 'verified',
        verifiedBy,
        verifiedAt: Date.now()
    });

    // Activate subscription
    await orgDb.updateOrganization(payment.orgId, {
        plan: payment.plan,
        settings: {
            subscriptionEnd,
            lastPaymentId: paymentId,
            paymentMethod: 'crypto'
        }
    });

    console.log(`[Crypto] ✅ Payment verified: ${paymentId} for org ${payment.orgId}`);
}

export async function rejectPayment(
    paymentId: string,
    reason: string,
    rejectedBy: string,
    dbModule: any
): Promise<void> {
    await dbModule.updateCryptoPayment(paymentId, {
        status: 'rejected',
        verifiedBy: rejectedBy,
        verifiedAt: Date.now(),
        notes: reason
    });

    console.log(`[Crypto] ❌ Payment rejected: ${paymentId} - ${reason}`);
}

// --- Subscription Status ---

export async function checkSubscriptionStatus(orgId: string): Promise<{
    isActive: boolean;
    plan: PlanKey;
    expiresAt?: number;
    daysRemaining?: number;
}> {
    const org = await orgDb.getOrganizationById(orgId);

    if (!org) {
        return { isActive: false, plan: 'free' };
    }

    const subscriptionEnd = org.settings?.subscriptionEnd;

    if (!subscriptionEnd || org.plan === 'free') {
        return { isActive: true, plan: 'free' };
    }

    const now = Date.now();
    const isActive = now < subscriptionEnd;
    const daysRemaining = Math.max(0, Math.ceil((subscriptionEnd - now) / (24 * 60 * 60 * 1000)));

    if (!isActive) {
        // Subscription expired - downgrade to free
        await orgDb.updateOrganization(orgId, { plan: 'free' });
        return { isActive: true, plan: 'free', expiresAt: subscriptionEnd, daysRemaining: 0 };
    }

    return {
        isActive: true,
        plan: org.plan as PlanKey,
        expiresAt: subscriptionEnd,
        daysRemaining
    };
}

// --- Utilities ---

export function getPlanConfig(plan: PlanKey) {
    return PLANS[plan] || PLANS.free;
}

export function hasFeature(plan: PlanKey, feature: string): boolean {
    const planConfig = PLANS[plan];
    const features = planConfig.features as readonly string[];
    return features.includes('all') || features.includes(feature);
}

export function formatCryptoAmount(amount: number, crypto: CryptoType): string {
    switch (crypto) {
        case 'BTC':
            return `${amount.toFixed(8)} BTC`;
        case 'ETH':
            return `${amount.toFixed(6)} ETH`;
        case 'USDT':
        case 'USDC':
            return `${amount.toFixed(2)} ${crypto}`;
        default:
            return `${amount} ${crypto}`;
    }
}

export function getPaymentInstructions(payment: CryptoPayment): string {
    return `
To complete your subscription upgrade to ${PLANS[payment.plan].name}:

1. Send exactly ${formatCryptoAmount(payment.amount, payment.cryptoType)}
2. To address: ${payment.walletAddress}
3. Network: ${getNetwork(payment.cryptoType)}

After sending, submit your transaction hash for verification.
Your payment request expires in 24 hours.

⚠️ Send the EXACT amount to avoid processing delays.
    `.trim();
}

function getNetwork(crypto: CryptoType): string {
    switch (crypto) {
        case 'BTC': return 'Bitcoin Mainnet';
        case 'ETH': return 'Ethereum Mainnet';
        case 'USDT': return process.env['USDT_NETWORK'] || 'ERC-20 (Ethereum)';
        case 'USDC': return 'ERC-20 (Ethereum)';
        default: return 'Unknown';
    }
}
