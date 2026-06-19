import mysql from "mysql2/promise";

const pool = process.env.DATABASE_URL
  ? mysql.createPool(process.env.DATABASE_URL + "?waitForConnections=true&connectionLimit=10&timezone=%2B00%3A00")
  : mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "triplog",
      password: process.env.DB_PASSWORD || "triplog123",
      database: process.env.DB_NAME || "triplog",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "+00:00",
    });

export default pool;

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}
