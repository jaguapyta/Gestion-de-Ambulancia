'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useMemo, useState } from 'react';

type Plantilla = {
  clave: string;
  nombre: string;
  contenido_html: string;
  orientacion: string;
};

// Variables que entiende cada plantilla (para mostrarlas al admin).
const VARIABLES: Record<string, string[]> = {
  ORDEN: ['logo', 'nro_orden', 'tipo_ord_x', 'tipo_ext_x', 'vehiculo_tipo', 'chapa', 'marca', 'modelo',
    'cod_movil', 'rasp', 'area', 'nro_orden_asignado', 'conductor', 'ci', 'fecha_inicio', 'fecha_fin',
    'hora_inicio', 'hora_fin', 'km_salida', 'km_llegada', 'km_total', 'km_estimado', 'consumo',
    'trabajos', 'jefe', 'generado', 'usuario'],
  ANEXO_III: ['logo', 'nro_orden', 'fecha_inicio', 'vehiculo_tipo', 'chapa', 'comb_nafta_x', 'comb_gasoil_x',
    'cod_movil', 'rasp', 'marca', 'modelo', 'nro_orden_asignado', 'consumo', 'filas_anexo',
    'conductor', 'ci', 'jefe', 'generado', 'usuario'],
  RECIBO: ['logo', 'nro_recibo', 'fecha', 'litros', 'monto_gs', 'combustible', 'nro_tickets', 'nro_orden',
    'cod_movil', 'nro_tarjeta', 'codigo_autorizacion', 'conductor', 'ci', 'jefe', 'generado', 'usuario'],
};

// Datos de ejemplo para la vista previa (no afectan la impresión real).
const ejemplo = (clave: string): Record<string, string> => {
  const base: Record<string, string> = {
    logo: typeof window !== 'undefined' ? `${window.location.origin}/logo-seme.png` : '',
    nro_orden: '001.045', nro_orden_asignado: '045', vehiculo_tipo: 'AMBULANCIA', chapa: 'HAA 123',
    marca: 'MERCEDES BENZ', modelo: 'SPRINTER 2020', cod_movil: 'SEME-12', rasp: '4587', area: 'Dpto. de Transporte',
    conductor: 'Juan Pérez', ci: '3.456.789', fecha_inicio: '21/09/2026', fecha_fin: '21/09/2026',
    hora_inicio: '07:00', hora_fin: '19:00', km_salida: '120500', km_llegada: '120680', km_total: '180',
    km_estimado: '200', consumo: '18', trabajos: 'URGENCIAS-EMERGENCIAS-TRASLADOS EN CAPITAL E INTERIOR',
    jefe: 'Lic. Jefe de Transporte', generado: '21/09/2026 08:15', usuario: 'admin',
    tipo_ord_x: 'X', tipo_ext_x: '', comb_nafta_x: '', comb_gasoil_x: 'X',
    nro_recibo: '000123', fecha: '21/09/2026', litros: '40', monto_gs: '360.000', combustible: 'GASOIL',
    nro_tickets: '10', nro_tarjeta: '7845-2210', codigo_autorizacion: 'A-9981',
    filas_anexo: `<tr><td>21/09/2026</td><td>21/09/2026</td><td>Traslado interhospitalario</td><td>120500</td><td>120680</td><td>180</td><td>40</td><td>360.000</td></tr>`
      + Array.from({ length: 5 }).map(() => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join(''),
  };
  return base;
};

const render = (html: string, data: Record<string, string>) =>
  html.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in data ? data[k] : `‹${k}›`));

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [claveActiva, setClaveActiva] = useState<string>('ORDEN');
  const [html, setHtml] = useState('');
  const [orientacion, setOrientacion] = useState('portrait');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const cargar = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    fetch(`${API_URL}/api/plantillas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Plantilla[]) => {
        setPlantillas(data);
        const actual = data.find(p => p.clave === claveActiva) ?? data[0];
        if (actual) {
          setClaveActiva(actual.clave);
          setHtml(actual.contenido_html);
          setOrientacion(actual.orientacion);
        }
      })
      .catch(() => setError('No se pudieron cargar las plantillas'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const seleccionar = (clave: string) => {
    const p = plantillas.find(x => x.clave === clave);
    if (!p) return;
    setClaveActiva(clave);
    setHtml(p.contenido_html);
    setOrientacion(p.orientacion);
    setMsg(''); setError('');
  };

  const guardar = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setGuardando(true); setMsg(''); setError('');
    try {
      const res = await fetch(`${API_URL}/api/plantillas/${claveActiva}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenido_html: html, orientacion }),
      });
      if (!res.ok) { setError('Error al guardar (¿sos administrador?)'); return; }
      const p = await res.json();
      setPlantillas(prev => prev.map(x => x.clave === p.clave ? p : x));
      setMsg('Plantilla guardada'); setTimeout(() => setMsg(''), 3000);
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const restaurar = async () => {
    if (!confirm('¿Restaurar esta plantilla al formato por defecto? Se pierde lo editado.')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setGuardando(true); setMsg(''); setError('');
    try {
      const res = await fetch(`${API_URL}/api/plantillas/${claveActiva}/restaurar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError('Error al restaurar'); return; }
      const p = await res.json();
      setPlantillas(prev => prev.map(x => x.clave === p.clave ? p : x));
      setHtml(p.contenido_html); setOrientacion(p.orientacion);
      setMsg('Plantilla restaurada al formato por defecto'); setTimeout(() => setMsg(''), 3000);
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const preview = useMemo(() => render(html, ejemplo(claveActiva)), [html, claveActiva]);
  const vars = VARIABLES[claveActiva] ?? [];

  const insertarVar = (v: string) => setHtml(h => `${h}{{${v}}}`);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Editor de documentos</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Editá el formato y los textos de la Orden de Trabajo, el Anexo III y el Recibo de combustible.
          Las variables <code>{'{{...}}'}</code> se reemplazan por los datos reales al imprimir.
        </p>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#15803d' }}>✅ {msg}</div>}
      {error && <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {plantillas.map(p => (
          <button key={p.clave} onClick={() => seleccionar(p.clave)}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
              border: '0.5px solid ' + (p.clave === claveActiva ? '#0a2540' : '#e5e7eb'),
              background: p.clave === claveActiva ? '#0a2540' : 'white',
              color: p.clave === claveActiva ? 'white' : '#0a2540',
            }}>
            {p.nombre}
          </button>
        ))}
      </div>

      {cargando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando plantillas...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Editor */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 500, color: '#0a2540', margin: 0 }}>HTML</h2>
              <select value={orientacion} onChange={e => setOrientacion(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '12px' }}>
                <option value="portrait">Vertical (portrait)</option>
                <option value="landscape">Horizontal (landscape)</option>
              </select>
            </div>
            <textarea value={html} onChange={e => setHtml(e.target.value)}
              spellCheck={false}
              style={{ width: '100%', height: '460px', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.5,
                padding: '12px', borderRadius: '8px', border: '0.5px solid #e5e7eb', boxSizing: 'border-box', resize: 'vertical' }} />

            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Variables disponibles (clic para insertar al final):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {vars.map(v => (
                  <button key={v} onClick={() => insertarVar(v)}
                    style={{ padding: '3px 8px', borderRadius: '6px', border: '0.5px solid #e5e7eb', background: '#f8f9fb',
                      color: '#0a2540', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={guardar} disabled={guardando}
                style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 22px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                {guardando ? 'Guardando...' : '💾 Guardar'}
              </button>
              <button onClick={restaurar} disabled={guardando}
                style={{ background: '#fff7ed', color: '#c2410c', border: '0.5px solid #fed7aa', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                ↩️ Restaurar por defecto
              </button>
            </div>
          </div>

          {/* Vista previa */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: '#0a2540', margin: '0 0 12px' }}>
              Vista previa <span style={{ fontSize: '11px', color: '#9ca3af' }}>(datos de ejemplo)</span>
            </h2>
            <iframe title="preview" srcDoc={preview}
              style={{ width: '100%', height: '520px', border: '0.5px solid #e5e7eb', borderRadius: '8px', background: 'white' }} />
          </div>
        </div>
      )}
    </div>
  );
}