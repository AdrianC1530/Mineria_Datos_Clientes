import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, Trash2, Database, BrainCircuit, Activity, BarChart3, ScatterChart as LucideScatterChart, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ScatterChart, Scatter, ComposedChart, Line, ResponsiveContainer } from 'recharts';
import './index.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [patternResult, setPatternResult] = useState(null);
  const [loadingPattern, setLoadingPattern] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/data`);
      setData(res.data);
      if (res.data.length === 0) setPatternResult(null);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      alert("Por favor, sube un archivo CSV válido.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchData();
    } catch (error) {
      console.error("Error al subir archivo", error);
      alert("Error al parsear el archivo CSV. Asegúrate de que las columnas coincidan.");
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar todos los registros de la base de datos?")) {
      try {
        await axios.delete(`${API_URL}/clear`);
        setData([]);
        setPatternResult(null);
      } catch (error) {
        console.error("Error clearing data", error);
      }
    }
  };

  const processData = async () => {
    try {
      const res = await axios.post(`${API_URL}/clean-data`);
      alert(`Pre-procesamiento completado:\nSe eliminaron ${res.data.removed} registros duplicados o corruptos.`);
      await fetchData();
    } catch (error) {
      console.error("Error processing data", error);
      alert("Hubo un error al pre-procesar los datos.");
    }
  };

  const runPattern = async (patternType) => {
    setLoadingPattern(true);
    setPatternResult(null);
    try {
      const res = await axios.get(`${API_URL}/patterns/${patternType}`);
      setPatternResult(res.data);
      setTimeout(() => {
        document.getElementById('pattern-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Error running pattern", error);
      alert("Ocurrió un error al ejecutar el algoritmo. Asegúrate de que haya suficientes datos.");
    } finally {
      setLoadingPattern(false);
    }
  };

  const renderChart = () => {
    if (!patternResult) return null;
    const { pattern, data } = patternResult;
    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    
    if (pattern.includes('Clasificación')) {
      const counts = data.reduce((acc, row) => {
        acc[row.prediccion_frecuencia] = (acc[row.prediccion_frecuencia] || 0) + 1;
        return acc;
      }, {});
      const chartData = Object.keys(counts).map(k => ({ name: k, count: counts[k] }));
      
      return (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-main)' }}>Distribución de Probabilidades</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <RechartsTooltip contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="count" fill="var(--primary-color)" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (pattern.includes('Clustering')) {
      const scatterData = data.map(d => ({ ...d, edadVal: parseInt(d.edad), gastoVal: parseFloat(d.gasto_anual) }));
      return (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-main)' }}>Dispersión: Edad vs Gasto por Membresía</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" dataKey="edadVal" name="Edad" unit=" años" stroke="#94a3b8" />
              <YAxis type="number" dataKey="gastoVal" name="Gasto Anual" unit=" $" stroke="#94a3b8" />
              <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Legend />
              <Scatter name="Membresía Premium" data={scatterData.filter(d => d.cluster_id == 1)} fill="#f59e0b" />
              <Scatter name="Membresía Estándar" data={scatterData.filter(d => d.cluster_id == 2)} fill="#3b82f6" />
              <Scatter name="Membresía Básica" data={scatterData.filter(d => d.cluster_id == 3)} fill="#ef4444" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (pattern.includes('Asociación')) {
       return (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-main)' }}>Fuerza de las Reglas (Soporte)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="regla" type="category" stroke="#94a3b8" width={200} tick={{fill: '#94a3b8', fontSize: 11}} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="soporte" fill="var(--accent-color)" name="Coincidencias (Soporte)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (pattern.includes('Regresión')) {
       const regData = data.map(d => ({ ...d, ing: parseFloat(d.ingresos), real: parseFloat(d.gasto_anual), pred: parseFloat(d.gasto_predicho) }));
       return (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-main)' }}>Curva de Tendencia Predictiva vs Realidad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={regData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="ing" type="number" name="Ingresos" stroke="#94a3b8" domain={['dataMin', 'dataMax']}  tickFormatter={(val) => `$${val}`} />
              <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val}`} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Legend />
              <Scatter name="Gasto Real" dataKey="real" fill="rgba(59, 130, 246, 0.6)" />
              <Line type="monotone" name="Gasto Predicho (Tendencia)" dataKey="pred" stroke="#f59e0b" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
       );
    }
    
    return null;
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>DataMinds</h1>
        <p>Plataforma Inteligente de Minería de Datos con PostgreSQL</p>
      </header>

      <main>
        <section className="panel">
          <div className="flex-between">
            <h2><Database className="inline-icon" size={24} style={{verticalAlign: 'bottom', marginRight: '8px', color: 'var(--primary-color)'}}/> Fuente de Datos</h2>
            {data.length > 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="glass-btn primary" onClick={processData} style={{ background: 'rgba(16, 185, 129, 0.2)', borderColor: 'var(--success-color)', color: 'var(--success-color)', boxShadow: 'none' }}>
                  <Database size={18} /> Pre-procesar
                </button>
                <button className="glass-btn danger" onClick={clearData}>
                  <Trash2 size={18} /> Limpiar Datos
                </button>
              </div>
            )}
          </div>

          {data.length === 0 ? (
            <div 
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="upload-icon" size={48} />
              <h3>Sube tu Dataset CSV</h3>
              <p>Arrastra tu archivo aquí o haz clic para buscarlo</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden-input" 
                accept=".csv"
                onChange={handleChange}
              />
              {loading && <p style={{marginTop: '1rem', color: 'var(--primary-color)'}}><span className="loading-spinner"></span> Procesando base de datos...</p>}
            </div>
          ) : (
            <div className="data-section">
              <p style={{color: 'var(--success-color)', marginBottom: '1rem', fontWeight: '500'}}>
                ✓ {data.length} registros cargados en PostgreSQL listos para procesar.
              </p>
              <div className="table-container" style={{maxHeight:'300px'}}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Edad</th>
                      <th>Ingresos</th>
                      <th>Género</th>
                      <th>Categoría</th>
                      <th>Gasto Anual</th>
                      <th>Comprador Frec.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.edad}</td>
                        <td>${parseFloat(row.ingresos).toLocaleString()}</td>
                        <td>{row.genero}</td>
                        <td>{row.categoria_producto}</td>
                        <td>${parseFloat(row.gasto_anual).toLocaleString()}</td>
                        <td>{row.comprador_frecuente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {data.length > 0 && (
          <section className="panel fade-in" style={{animation: 'fadeIn 0.5s ease'}}>
            <h2><BrainCircuit className="inline-icon" size={24} style={{verticalAlign: 'bottom', marginRight: '8px', color: 'var(--accent-color)'}}/> Ejecución de Patrones</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>
               Selecciona un algoritmo. La interfaz actualizará mostrando los datos estadísticos y re-ordenados secuencialmente según del tipo de patrón ejecutado.
            </p>
            
            <div className="grid-patterns">
              <div className="pattern-card" onClick={() => runPattern('classification')}>
                <h3><Activity size={20} /> Clasificación</h3>
                <p>Clasifica y ordena los clientes por su probabilidad real deducida de ser "Compradores Frecuentes" basada en sus características.</p>
              </div>
              
              <div className="pattern-card" onClick={() => runPattern('clustering')}>
                <h3><LucideScatterChart size={20} /> Clustering</h3>
                <p>Agrupa y ordena a los clientes numéricamente en base a su aporte a la tienda usando NTILE Ranking dinámico.</p>
              </div>
              
              <div className="pattern-card" onClick={() => runPattern('association')}>
                <h3><BrainCircuit size={20} /> Reglas de Asociación</h3>
                <p>Lista y ordena las reglas de coincidencia de compras según la fuerza / soporte de esa regla de negocio (ej. Género ➡️ Producto).</p>
              </div>
              
              <div className="pattern-card" onClick={() => runPattern('regression')}>
                <h3><BarChart3 size={20} /> Regresión</h3>
                <p>Aplica función y pendiente matemática (Regresión en PostgreSQL) para revelar desviaciones de gasto predictivas, ordenando por nivel de ingresos.</p>
              </div>
            </div>
          </section>
        )}

        {loadingPattern && (
          <div style={{textAlign: 'center', marginTop: '2rem'}}>
            <span className="loading-spinner" style={{borderColor: 'var(--primary-color)', borderTopColor: 'transparent'}}></span>
            <p style={{color: 'var(--primary-color)', marginTop: '1rem'}}>Procesando en el hilo del servidor PostgreSQL...</p>
          </div>
        )}

        {patternResult && (
          <section id="pattern-results" className="panel result-panel fade-in" style={{borderColor: 'var(--accent-color)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)', marginTop: '2rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem'}}>
              <h2 style={{color: 'var(--text-main)', margin: 0}}>{patternResult.pattern}</h2>
              <span style={{background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success-color)', padding: '5px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'}}>Ejecución Exitosa</span>
            </div>
            
            <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6'}}>
              <ChevronRight size={18} style={{display: 'inline', verticalAlign: 'text-bottom', color: 'var(--primary-color)'}}/> 
              {patternResult.description}
            </p>

            {renderChart()}

            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Detalle de Datos ({patternResult.data.length} registros)</h3>

            <div className="table-container" style={{maxHeight: '500px'}}>
              <table>
                <thead>
                  <tr>
                    {patternResult.columns.map(col => (
                      <th key={col} style={{textTransform: 'capitalize'}}>{col.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patternResult.data.map((row, idx) => (
                    <tr key={idx}>
                      {patternResult.columns.map(col => {
                        let value = row[col];
                        if (col.includes('ingresos') || col.includes('gasto')) {
                          const num = parseFloat(value);
                          if (!isNaN(num)) value = `$${num.toLocaleString()}`;
                        }
                        if (col === 'prediccion_frecuencia' && typeof value === 'string' && value.includes('Alta')) {
                          value = <span style={{color: 'var(--success-color)', fontWeight: 'bold'}}>{value}</span>;
                        }
                        if (col === 'prediccion_frecuencia' && typeof value === 'string' && value.includes('Baja')) {
                          value = <span style={{color: 'var(--danger-color)', fontWeight: 'bold'}}>{value}</span>;
                        }
                        if (col === 'cluster_name' && typeof value === 'string' && value.includes('Premium')) {
                          value = <span style={{color: '#f59e0b', fontWeight: 'bold' }}>⭐ {value}</span>;
                        }
                        return <td key={col}>{value}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
