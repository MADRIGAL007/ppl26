
import { pgPool, sqliteDb, isPostgres } from '../core';
import { CryptoPayment } from '../../billing/crypto';

// --- Billing/Crypto Repository ---

/**
 * Save a new crypto payment record
 */
export async function createCryptoPayment(payment: CryptoPayment): Promise<void> {
    if (isPostgres) {
        await pgPool!.query(`
            INSERT INTO crypto_payments (
                id, org_id, plan, crypto_type, amount, tx_hash, status, wallet_address, 
                expires_at, verified_by, verified_at, created_at, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0), $10, to_timestamp($11 / 1000.0), to_timestamp($12 / 1000.0), $13)
        `, [
            payment.id,
            payment.orgId,
            payment.plan,
            payment.cryptoType,
            payment.amount,
            payment.txHash || null,
            payment.status,
            payment.walletAddress,
            payment.expiresAt,
            payment.verifiedBy || null,
            payment.verifiedAt || null,
            payment.createdAt,
            (payment as any).notes || null
        ]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(`
                INSERT INTO crypto_payments (
                    id, org_id, plan, crypto_type, amount, tx_hash, status, wallet_address, 
                    expires_at, verified_by, verified_at, created_at, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                payment.id,
                payment.orgId,
                payment.plan,
                payment.cryptoType,
                payment.amount,
                payment.txHash || null,
                payment.status,
                payment.walletAddress,
                payment.expiresAt,
                payment.verifiedBy || null,
                payment.verifiedAt || null,
                payment.createdAt,
                (payment as any).notes || null
            ], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

/**
 * Get a crypto payment by ID
 */
export async function getCryptoPayment(id: string): Promise<CryptoPayment | null> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM crypto_payments WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return mapPaymentRow(result.rows[0]);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT * FROM crypto_payments WHERE id = ?', [id], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row ? mapPaymentRow(row) : null);
            });
        });
    }
}

/**
 * Update a crypto payment
 */
export async function updateCryptoPayment(id: string, updates: Partial<CryptoPayment> & { notes?: string }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
        fields.push(isPostgres ? `status = $${paramIndex++}` : 'status = ?');
        values.push(updates.status);
    }
    if (updates.txHash !== undefined) {
        fields.push(isPostgres ? `tx_hash = $${paramIndex++}` : 'tx_hash = ?');
        values.push(updates.txHash);
    }
    if (updates.verifiedBy !== undefined) {
        fields.push(isPostgres ? `verified_by = $${paramIndex++}` : 'verified_by = ?');
        values.push(updates.verifiedBy);
    }
    if (updates.verifiedAt !== undefined) {
        fields.push(isPostgres ? `verified_at = to_timestamp($${paramIndex++} / 1000.0)` : 'verified_at = ?');
        values.push(updates.verifiedAt);
    }
    if (updates.notes !== undefined) {
        fields.push(isPostgres ? `notes = $${paramIndex++}` : 'notes = ?');
        values.push(updates.notes);
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE crypto_payments SET ${fields.join(', ')} WHERE id = ${isPostgres ? `$${paramIndex}` : '?'}`;

    if (isPostgres) {
        await pgPool!.query(query, values);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(query, values, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

/**
 * Get all payments for an organization
 */
export async function getOrgPayments(orgId: string): Promise<CryptoPayment[]> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM crypto_payments WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
        return result.rows.map(mapPaymentRow);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.all('SELECT * FROM crypto_payments WHERE org_id = ? ORDER BY created_at DESC', [orgId], (err: any, rows: any[]) => {
                if (err) reject(err);
                else resolve((rows || []).map(mapPaymentRow));
            });
        });
    }
}

/**
 * Get payments by status for admin dashboard
 */
export async function getCryptoPaymentsByStatus(status: string): Promise<CryptoPayment[]> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM crypto_payments WHERE status = $1 ORDER BY created_at DESC', [status]);
        return result.rows.map(mapPaymentRow);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.all('SELECT * FROM crypto_payments WHERE status = ? ORDER BY created_at DESC', [status], (err: any, rows: any[]) => {
                if (err) reject(err);
                else resolve((rows || []).map(mapPaymentRow));
            });
        });
    }
}

// --- Helpers ---

function mapPaymentRow(row: any): CryptoPayment {
    const payment = {
        id: row.id,
        orgId: row.org_id,
        plan: row.plan,
        cryptoType: row.crypto_type,
        amount: row.amount,
        txHash: row.tx_hash,
        status: row.status,
        walletAddress: row.wallet_address,
        expiresAt: typeof row.expires_at === 'object' ? row.expires_at.getTime() : row.expires_at,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at ? (typeof row.verified_at === 'object' ? row.verified_at.getTime() : row.verified_at) : undefined,
        createdAt: typeof row.created_at === 'object' ? row.created_at.getTime() : row.created_at
    };

    if (row.notes) {
        (payment as any).notes = row.notes;
    }

    return payment;
}
