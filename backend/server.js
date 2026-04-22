require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

const upload = multer({ dest: 'uploads/' });

// Crear tabla para el ejemplo inventado de compradores
async function initTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS dataset (
      id SERIAL PRIMARY KEY,
      edad INT,
      ingresos DECIMAL,
      genero VARCHAR(50),
      categoria_producto VARCHAR(100),
      gasto_anual DECIMAL,
      comprador_frecuente VARCHAR(10),
      satisfaccion VARCHAR(50)
    );
  `;
  try {
    await pool.query(query);
    console.log("Tabla 'dataset' lista en PostgreSQL.");
  } catch (error) {
    console.error("Error al inicializar la tabla:", error);
  }
}

// Timeout para dar tiempo a crear la DB antes de initTable si se corriese a la vez
setTimeout(initTable, 1000);

// Endpoint 1: Subir y parsear CSV a la Base de Datos
app.post('/api/upload', upload.single('file'), (req, res) => {
  const results = [];
  if (!req.file) return res.status(400).send('No se subió ningún archivo');

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const row of results) {
          // Validar que existan los campos (saltar filas vacías)
          if(!row.edad) continue; 
          
          await client.query(
            `INSERT INTO dataset (edad, ingresos, genero, categoria_producto, gasto_anual, comprador_frecuente, satisfaccion)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              parseInt(row.edad), 
              parseFloat(row.ingresos), 
              row.genero, 
              row.categoria_producto, 
              parseFloat(row.gasto_anual), 
              row.comprador_frecuente, 
              row.satisfaccion
            ]
          );
        }
        await client.query('COMMIT');
        res.json({ message: 'Datos cargados exitosamente', count: results.length });
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: 'Error al insertar en DB' });
      } finally {
        client.release();
        fs.unlinkSync(req.file.path); 
      }
    });
});

// Endpoint 2: Limpiar los datos
app.delete('/api/clear', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE dataset RESTART IDENTITY');
    res.json({ message: 'Datos limpiados exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al limpiar datos' });
  }
});

// Endpoint 3: Pre-procesar (Eliminar duplicados y nulos)
app.post('/api/clean-data', async (req, res) => {
  try {
    const query = `
      DELETE FROM dataset
      WHERE id NOT IN (
        SELECT min(id)
        FROM dataset
        GROUP BY edad, ingresos, genero, categoria_producto, gasto_anual, comprador_frecuente, satisfaccion
      );
    `;
    const result = await pool.query(query);
    
    // Y limpiar registros incompletos o erróneos si los hubiera
    await pool.query('DELETE FROM dataset WHERE edad IS NULL OR ingresos IS NULL');
    
    res.json({ message: 'Duplicados eliminados exitosamente', removed: result.rowCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar duplicados' });
  }
});

// Obtener datos para la vista de tabla
app.get('/api/data', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dataset');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error leyendo datos' });
    }
});

// --- PATRONES DE MINERIA DE DATOS ---
// Estos los llenaremos con algoritmos reales más adelante adaptados a nuestros datos

app.get('/api/patterns/classification', async (req, res) => {
  try {
    const query = `
      SELECT id, edad, ingresos, gasto_anual, comprador_frecuente,
             CASE 
               WHEN ingresos > 60000 AND edad > 30 THEN 'Alta Probabilidad'
               WHEN ingresos > 40000 THEN 'Media Probabilidad'
               ELSE 'Baja Probabilidad'
             END AS prediccion_frecuencia
      FROM dataset
      ORDER BY 
        CASE 
          WHEN ingresos > 60000 AND edad > 30 THEN 1
          WHEN ingresos > 40000 THEN 2
          ELSE 3
        END,
        ingresos DESC
    `;
    const result = await pool.query(query);
    res.json({
      pattern: 'Clasificación',
      description: 'Usuarios clasificados y ordenados por su probabilidad de ser compradores frecuentes en base a su edad e ingresos.',
      type: 'table',
      columns: ['id', 'edad', 'ingresos', 'comprador_frecuente', 'prediccion_frecuencia'],
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en clasificación' });
  }
});

app.get('/api/patterns/clustering', async (req, res) => {
  try {
    const query = `
      SELECT id, edad, ingresos, gasto_anual,
             NTILE(3) OVER (ORDER BY gasto_anual DESC) as cluster_id
      FROM dataset
      ORDER BY cluster_id ASC, gasto_anual DESC
    `;
    const result = await pool.query(query);
    const mappedC = result.rows.map(r => ({
      ...r, 
      cluster_name: r.cluster_id === 1 ? 'Membresía Premium (Alto Valor)' : r.cluster_id === 2 ? 'Membresía Estándar (Valor Medio)' : 'Membresía Básica (Valor Bajo)'
    }));
    
    res.json({
      pattern: 'Agrupamiento (Clustering Segmentado)',
      description: 'Clientes segmentados y ordenados en 3 clusters dinámicos dictados por la distribución del Gasto Anual.',
      type: 'table',
      columns: ['id', 'edad', 'gasto_anual', 'cluster_id', 'cluster_name'],
      data: mappedC
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en clustering' });
  }
});

app.get('/api/patterns/association', async (req, res) => {
  try {
    const query = `
      SELECT genero, categoria_producto, COUNT(*) as coincidencias
      FROM dataset
      GROUP BY genero, categoria_producto
      ORDER BY coincidencias DESC
    `;
    const result = await pool.query(query);
    const reglas = result.rows.map(r => ({
      regla: `SI Genero es ${r.genero} => COMPRA EN ${r.categoria_producto}`,
      soporte: r.coincidencias,
      recomendacion: r.coincidencias > 3 ? '💡 Promoción Cruzada Muy Recomendada' : '🔍 Observación Ocasional'
    }));
    
    res.json({
      pattern: 'Reglas de Asociación',
      description: 'Patrones de compra encontrados ordenados por mayor nivel de asociaciones y coincidencias conjuntas.',
      type: 'table',
      columns: ['regla', 'soporte', 'recomendacion'],
      data: reglas
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en asociación' });
  }
});

app.get('/api/patterns/regression', async (req, res) => {
  try {
    const queryStats = `
      SELECT 
        regr_slope(gasto_anual, ingresos) as m, 
        regr_intercept(gasto_anual, ingresos) as b
      FROM dataset
    `;
    const statRes = await pool.query(queryStats);
    let { m, b } = statRes.rows[0];
    
    // Fallback if data is not enough for regression (variance 0)
    if (!m) m = 0; if (!b) b = 0;

    const result = await pool.query(`SELECT id, ingresos, gasto_anual FROM dataset ORDER BY ingresos ASC`);
    
    const regresionData = result.rows.map(r => ({
      ...r,
      gasto_predicho: (m * r.ingresos + b).toFixed(2),
      diferencia: (parseFloat((r.gasto_anual - (m * r.ingresos + b)).toFixed(2)) > 0 ? '+' : '') + (r.gasto_anual - (m * r.ingresos + b)).toFixed(2)
    }));

    res.json({
      pattern: 'Análisis de Regresión Lineal Simple',
      description: `Ecuación predictiva: Gasto Predicho = (${parseFloat(m).toFixed(4)} * Ingresos) + ${parseFloat(b).toFixed(2)}. Datos ordenados analíticamente de menor a mayor ingreso.`,
      type: 'table',
      columns: ['id', 'ingresos', 'gasto_anual', 'gasto_predicho', 'diferencia'],
      data: regresionData
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en regresión' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend running en el puerto ${PORT}`);
});
