require('dotenv').config();
const { Client } = require('pg');

async function setupDB() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres'
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='mineria_db'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE mineria_db');
      console.log('Base de datos mineria_db creada con éxito!');
    } else {
      console.log('La base de datos mineria_db ya existe.');
    }
  } catch (err) {
    console.error('Error al configurar la DB:', err);
  } finally {
    await client.end();
  }
}

setupDB();
