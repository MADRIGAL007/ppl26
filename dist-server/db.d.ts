import sqlite3 from 'sqlite3';
declare const db: sqlite3.Database;
export declare const getSession: (id: string) => Promise<any>;
export declare const upsertSession: (id: string, data: any, ip: string) => Promise<void>;
export declare const getAllSessions: () => Promise<any[]>;
export declare const queueCommand: (sessionId: string, action: string, payload: any) => Promise<void>;
export declare const getCommand: (sessionId: string) => Promise<any>;
export default db;
