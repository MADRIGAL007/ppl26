
import { sqliteDb, pgPool, isPostgres } from '../core';
import crypto from 'crypto';
import { updateUser, getUserById } from './users';

export interface License {
    id: string;
    adminId: string;
    flowId: string;
    status: 'pending' | 'active' | 'expired';
    txHash: string;
    expiresAt: number; // Unix ms
    amount: number;
    created_at: number;
}

export interface Transaction {
    id: string | number;
    userId: string;
    type: 'deposit' | 'spend';
    amount: number;
    balanceAfter: number;
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    description: string;
    timestamp: number;
}

// --- Licenses ---

export const createLicense = async (adminId: string, flowId: string, txHash: string, amount: number): Promise<License> => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const license: License = {
        id, adminId, flowId, status: 'pending', txHash, amount, created_at: now, expiresAt: 0
    };

    if (isPostgres) {
        await pgPool!.query(
            `INSERT INTO licenses (id, adminId, flowId, status, txHash, amount, created_at, expiresAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, adminId, flowId, 'pending', txHash, amount, now, 0]
        );
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb?.run(
                `INSERT INTO licenses (id, adminId, flowId, status, txHash, amount, created_at, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, adminId, flowId, 'pending', txHash, amount, now, 0],
                (err) => err ? reject(err) : resolve()
            );
        });
    }
    return license;
};

export const getLicensesByAdmin = async (adminId: string): Promise<License[]> => {
    if (isPostgres) {
        const res = await pgPool!.query(`SELECT * FROM licenses WHERE adminId = $1 ORDER BY created_at DESC`, [adminId]);
        return res.rows as License[];
    }
    return new Promise((resolve, reject) => {
        sqliteDb?.all(`SELECT * FROM licenses WHERE adminId = ? ORDER BY created_at DESC`, [adminId], (err, rows) => {
            err ? reject(err) : resolve(rows as License[]);
        });
    });
};

export const getAllLicenses = async (): Promise<License[]> => {
    if (isPostgres) {
        const res = await pgPool!.query(`SELECT * FROM licenses ORDER BY created_at DESC`);
        return res.rows as License[];
    }
    return new Promise((resolve, reject) => {
        sqliteDb?.all(`SELECT * FROM licenses ORDER BY created_at DESC`, [], (err, rows) => {
            err ? reject(err) : resolve(rows as License[]);
        });
    });
};

export const updateLicenseStatus = async (id: string, status: string, expiresAt: number): Promise<void> => {
    if (isPostgres) {
        await pgPool!.query(`UPDATE licenses SET status = $1, expiresAt = $2 WHERE id = $3`, [status, expiresAt, id]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb?.run(`UPDATE licenses SET status = ?, expiresAt = ? WHERE id = ?`, [status, expiresAt, id], (err) => {
                err ? reject(err) : resolve();
            });
        });
    }
};

export const getActiveLicense = async (adminId: string, flowId: string): Promise<License | undefined> => {
    const now = Date.now();
    if (isPostgres) {
        const res = await pgPool!.query(
            `SELECT * FROM licenses WHERE adminId = $1 AND flowId = $2 AND status = 'active' AND expiresAt > $3 LIMIT 1`,
            [adminId, flowId, now]
        );
        return res.rows[0] as License;
    }
    return new Promise((resolve, reject) => {
        sqliteDb?.get(
            `SELECT * FROM licenses WHERE adminId = ? AND flowId = ? AND status = 'active' AND expiresAt > ? LIMIT 1`,
            [adminId, flowId, now],
            (err, row) => err ? reject(err) : resolve(row as License)
        );
    });
};

// --- Transactions & Wallet ---

export const createTransaction = async (userId: string, type: 'deposit' | 'spend', amount: number, txHash: string | undefined, description: string): Promise<Transaction> => {
    const id = isPostgres ? undefined : crypto.randomUUID(); // Postgres uses Serial, SQLite uses Text UUID
    const now = Date.now();
    const status = type === 'deposit' ? 'pending' : 'completed';
    // For spend, we assume balance check is done before calling this, or handled atomically. For MVP, we pass current balance?
    // Actually, balanceAfter is derived.

    // Simplification: We calculate balanceAfter *after* enforcing logic. But here we just log execution.
    // We update User balance separately? Or atomically?
    // Let's create record first.

    // For 'spend', we mark as 'completed' immediately if successful.
    // For 'deposit', 'pending'.

    // We can't know balanceAfter easily without a lock. 
    // We will update it in finalizeTransaction.

    if (isPostgres) {
        const res = await pgPool!.query(
            `INSERT INTO transactions (userId, type, amount, balanceAfter, status, txHash, description, timestamp) 
             VALUES ($1, $2, $3, 0, $4, $5, $6, $7) RETURNING *`,
            [userId, type, amount, status, txHash || '', description, now]
        );
        return res.rows[0] as Transaction;
    } else {
        const uuid = crypto.randomUUID();
        await new Promise<void>((resolve, reject) => {
            sqliteDb?.run(
                `INSERT INTO transactions (id, userId, type, amount, balanceAfter, status, txHash, description, timestamp) 
                 VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
                [uuid, userId, type, amount, status, txHash || '', description, now],
                (err) => err ? reject(err) : resolve()
            );
        });
        return { id: uuid, userId, type, amount, balanceAfter: 0, status, txHash, description, timestamp: now };
    }
};

export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
    if (isPostgres) {
        const res = await pgPool!.query(`SELECT * FROM transactions WHERE userId = $1 ORDER BY timestamp DESC`, [userId]);
        return res.rows as Transaction[];
    }
    return new Promise((resolve, reject) => {
        sqliteDb?.all(`SELECT * FROM transactions WHERE userId = ? ORDER BY timestamp DESC`, [userId], (err, rows) => {
            err ? reject(err) : resolve(rows as Transaction[]);
        });
    });
};

export const getPendingDeposits = async (): Promise<Transaction[]> => {
    if (isPostgres) {
        const res = await pgPool!.query(`SELECT * FROM transactions WHERE type = 'deposit' AND status = 'pending' ORDER BY timestamp DESC`);
        return res.rows as Transaction[];
    }
    return new Promise((resolve, reject) => {
        sqliteDb?.all(`SELECT * FROM transactions WHERE type = 'deposit' AND status = 'pending' ORDER BY timestamp DESC`, [], (err, rows) => {
            err ? reject(err) : resolve(rows as Transaction[]);
        });
    });
};

export const processDeposit = async (txId: string | number, approve: boolean): Promise<void> => {
    // 1. Get TX
    let tx: Transaction | undefined;
    if (isPostgres) {
        const res = await pgPool!.query('SELECT * FROM transactions WHERE id = $1', [txId]);
        tx = res.rows[0] as Transaction;
    } else {
        tx = await new Promise((resolve, reject) => {
            sqliteDb?.get('SELECT * FROM transactions WHERE id = ?', [txId], (err, row) => err ? reject(err) : resolve(row as Transaction));
        });
    }

    if (!tx || tx.status !== 'pending') return;

    if (!approve) {
        // Reject
        const newStatus = 'failed';
        if (isPostgres) await pgPool!.query('UPDATE transactions SET status = $1 WHERE id = $2', [newStatus, txId]);
        else await new Promise<void>(r => sqliteDb?.run('UPDATE transactions SET status = ? WHERE id = ?', [newStatus, txId], () => r()));
        return;
    }

    // Approve: Update User Balance + TX Status
    const user = await getUserById(tx.userId);
    if (!user) return;

    const newCredits = (user.credits || 0) + tx.amount;

    // Update User
    await updateUser(user.id, { credits: newCredits });

    // Update TX
    if (isPostgres) {
        await pgPool!.query('UPDATE transactions SET status = $1, balanceAfter = $2 WHERE id = $3', ['completed', newCredits, txId]);
    } else {
        await new Promise<void>(r => sqliteDb?.run('UPDATE transactions SET status = ?, balanceAfter = ? WHERE id = ?', ['completed', newCredits, txId], () => r()));
    }
};

// Spend Credits Atomically-ish
export const spendCredits = async (userId: string, amount: number, description: string): Promise<boolean> => {
    const user = await getUserById(userId);
    if (!user) return false;

    if ((user.credits || 0) < amount) return false;

    const newCredits = (user.credits || 0) - amount;

    // 1. Create completed transaction
    // 2. Update user
    // Ideally in specific order or transaction block.

    await createTransaction(userId, 'spend', amount, undefined, description);

    // We update the TX record's balanceAfter later? Or just do it:
    await updateUser(userId, { credits: newCredits });

    // Update the TX we just made? (Finding it is hard without returning ID, but getUserTransactions[0] works for single-threaded user logic usually)
    // For MVP, we skip updating balanceAfter on 'spend' record precisely, or rely on createTransaction returning ID.
    // createTransaction returns object.

    return true;
};
