import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../../database/database.sqlite');
const INIT_SQL_PATH = path.resolve(__dirname, '../../database/init.sql');

let dbInstance = null;

export async function initDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON;');

    const initSql = await fs.readFile(INIT_SQL_PATH, 'utf-8');
    await db.exec(initSql);

    dbInstance = db;
    return dbInstance;
}

export async function getDb() {
    if (!dbInstance) {
        return initDatabase();
    }
    return dbInstance;
}
