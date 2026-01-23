import sqlite3 from 'sqlite3';
import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';

// --- Configuration ---
export const DATA_DIR = process.env['DATA_DIR'] || './data';
export const DATABASE_URL = process.env['DATABASE_URL'];
export const isPostgres = !!DATABASE_URL;

// --- State ---
export let sqliteDb: sqlite3.Database | null = null;
export let pgPool: Pool | null = null;

// --- Setters (used by init) ---
export const setSqliteDb = (db: sqlite3.Database) => { sqliteDb = db; };
export const setPgPool = (pool: Pool) => { pgPool = pool; };

/**
 * Execute a callback within egg transaction
 */
export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    if (!isPostgres) {
        throw new Error('Transactions only supported for PostgreSQL');
    }
    if (!pgPool) throw new Error('DB not initialized');

    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};
