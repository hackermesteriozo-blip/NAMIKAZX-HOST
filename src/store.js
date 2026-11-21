import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'node:fs';
fs.mkdirSync('./data',{recursive:true});
export let db;
export async function initDb(){
  db=await open({filename:'./data/namikazx-host.sqlite',driver:sqlite3.Database});
  await db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders(
      id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,amount REAL NOT NULL,status TEXT NOT NULL DEFAULT 'pending',
      payment_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password=process.env.ADMIN_PASSWORD;
  if(email&&password){
    const exists=await db.get('SELECT id FROM users WHERE email=?',[email]);
    if(!exists){const bcrypt=(await import('bcryptjs')).default;const hash=await bcrypt.hash(password,12);await db.run('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)',['Administrador',email,hash,'admin']);console.log('[OK] Conta administrativa criada.');}
  }
}
