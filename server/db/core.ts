
import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
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
