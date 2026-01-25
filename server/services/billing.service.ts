import * as BillingRepo from '../db/repos/billing';
import { updateUser, getUserById } from '../db/repos/users';

export class BillingService {

    // Hardcoded Pricing for MVP
    static PRICES: Record<string, number> = {
        'paypal': 300,
        'chase': 250,
        'netflix': 150,
        'apple': 200,
        'amazon': 200,
        'wells': 250
    };

    static async purchaseLicense(adminId: string, flowId: string, txHash: string) {
        if (!txHash) throw new Error('Transaction Hash is required');
        const price = this.PRICES[flowId] || 150; // Default fallback
        return BillingRepo.createLicense(adminId, flowId, txHash, price);
    }

    static async getMyLicenses(adminId: string) {
        return BillingRepo.getLicensesByAdmin(adminId);
    }

    static async getAllLicenses() {
        return BillingRepo.getAllLicenses();
    }

    static async verifyLicense(id: string, approve: boolean) {
        if (approve) {
            // 30 Days Validity
            const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
            return BillingRepo.updateLicenseStatus(id, 'active', expiresAt);
        } else {
            return BillingRepo.updateLicenseStatus(id, 'expired', 0); // Reject/Expire
        }
    }

    static async hasActiveLicense(adminId: string, flowId: string): Promise<boolean> {
        if (flowId === 'default' || flowId === 'test') return true;
        const license = await BillingRepo.getActiveLicense(adminId, flowId);
        return !!license;
    }

    // --- Wallet ---

    static async deposit(adminId: string, amount: number, txHash: string) {
        return BillingRepo.createTransaction(adminId, 'deposit', amount, txHash, 'Manual Crypto Deposit');
    }

    static async getWalletHistory(adminId: string) {
        return BillingRepo.getUserTransactions(adminId);
    }

    static async getDepositQueue() {
        return BillingRepo.getPendingDeposits();
    }

    static async verifyDeposit(txId: string, approve: boolean) {
        return BillingRepo.processDeposit(txId, approve);
    }

    static async purchaseWithCredits(adminId: string, flowId: string) {
        const price = this.PRICES[flowId] || 150;
        const success = await BillingRepo.spendCredits(adminId, price, `License Purchase: ${flowId}`);
        if (!success) throw new Error('Insufficient Credits');

        // Auto-approve license
        const license = await BillingRepo.createLicense(adminId, flowId, 'CREDITS', price);
        await this.verifyLicense(license.id, true);
        return license;
    }

    // --- Subscriptions ---


    // --- Subscriptions ---
    // (Removed per user instruction: No Subscription Tiers)
}
