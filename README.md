# Minería de datos de clientes

Aplicación web para cargar y analizar un conjunto de datos de clientes
(edad, ingresos, categoría de producto, gasto anual, frecuencia de compra y satisfacción).

## Estructura

- `backend/`: API en **Node.js con Express**; carga el CSV (multer + csv-parser) en **PostgreSQL**.
- `frontend/`: interfaz en **React con Vite**; gráficos con **Recharts**.
- `datos_clientes.csv`: datos de ejemplo.

## Cómo ejecutarlo

```bash
# Backend: copiar backend/.env.example a backend/.env y completar la conexión a PostgreSQL
cd backend && npm install && node setup_db.js && node server.js

# Frontend
cd frontend && npm install && npm run dev
```

## Análisis en R

`analisis/analisis_clientes.R`: tarea integradora de análisis y minería de datos sobre el mismo conjunto de clientes.
Lee `clientes.csv` (copiar `datos_clientes.csv` con ese nombre junto al script) y se ejecuta con R o RStudio.
