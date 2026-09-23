'use client';

import { API_URL } from '@/app/lib/api';
import { useState } from 'react';

export default function ModalReciboCombustible({ orden, onCerrar, onGuardado }: { orden: any; onCerrar: () => void; onGuardado?: () => void }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ fecha: hoy, litros: '', monto_gs: '', nro_tickets: '', codigo_autorizacion: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [recibo, setRecibo] = useState<any>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
  const cond = orden?.conductor?.persona;
  const nombreCond = cond ? `${cond.primer_nombre ?? ''} ${cond.primer_apellido ?? ''}`.trim() : '—';
  const ciCond = cond?.nro_documento ?? '—';

  const guardar = async () => {
    if (!form.litros) { setError('Cargá los litros.'); return; }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/recibos`, { method: 'POST', headers: headers(), body: JSON.stringify({ orden_trabajo_id: orden.id, ...form }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'No se pudo crear'); return; }
      setRecibo(d); onGuardado?.();
    } catch { setError('Error de conexión'); } finally { setGuardando(false); }
  };

  const imprimir = () => {
    const r = recibo;
    const bloque = (copia: boolean) => `
      <div style="border:1px solid #000; padding:16px; margin-bottom:14px; font-size:13px;">
        <div style="text-align:center; font-weight:bold; line-height:1.4;">
          MINISTERIO DE SALUD PÚBLICA Y BIENESTAR SOCIAL<br>SERVICIO DE EMERGENCIAS MÉDICAS EXTRAHOSPITALARIAS<br>DEPARTAMENTO DE TRANSPORTE
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:10px;">
          <b>RECIBO DE CONTROL INTERNO N°: ${r.nro_recibo}</b><span>FECHA: ${new Date(r.fecha).toLocaleDateString('es-PY')}</span>
        </div>
        <p style="margin:10px 0;">Recibí de la Unidad Administrativa la cantidad de
          <b>${Number(r.litros).toFixed(2)} litros</b> (Gs. ${r.monto_gs ? Number(r.monto_gs).toLocaleString('es-PY') : '—'}) de combustible (${orden.movil?.tipo_combustible ?? 'GASOIL'}),
          N° de tickets: <b>${r.nro_tickets ?? '—'}</b>, para tareas según
          <b>Orden de Trabajo N° ${orden.nro_orden}</b> en el móvil <b>${orden.movil?.cod_movil ?? '—'}</b>.</p>
        <div>N° de tarjeta asignada: <b>${r.nro_tarjeta ?? '—'}</b> · Código de autorización: <b>${r.codigo_autorizacion ?? '—'}</b></div>
        <div style="margin-top:26px; display:flex; justify-content:space-between; text-align:center;">
          <div>………………………………<br>Firma / Aclaración: ${nombreCond}<br>C.I. N°: ${ciCond}</div>
          <div>………………………………<br>Jefe de Transporte</div>
        </div>
        ${copia ? '<div style="text-align:center; margin-top:6px; font-size:11px;">COPIA DEL ORIGINAL</div>' : ''}
      </div>`;
    const w = window.open('', '', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<html><head><title>Recibo ${r.nro_recibo}</title></head><body onload="print()">${bloque(false)}${bloque(true)}</body></html>`);
    w.document.close();
  };

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const lbl = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '5px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '460px', maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 4px' }}>🧾 Recibo de combustible</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>Orden {orden.nro_orden} · Móvil {orden.movil?.cod_movil} · {nombreCond}</p>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

        {!recibo ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>Fecha</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Litros *</label><input value={form.litros} onChange={e => setForm({ ...form, litros: e.target.value.replace(/[^\d.]/g, '') })} style={inp} /></div>
              <div><label style={lbl}>Monto (Gs)</label><input value={form.monto_gs} onChange={e => setForm({ ...form, monto_gs: e.target.value.replace(/\D/g, '') })} style={inp} /></div>
              <div><label style={lbl}>N° de tickets</label><input value={form.nro_tickets} onChange={e => setForm({ ...form, nro_tickets: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Código de autorización</label><input value={form.codigo_autorizacion} onChange={e => setForm({ ...form, codigo_autorizacion: e.target.value })} style={inp} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>{guardando ? 'Guardando…' : 'Crear recibo'}</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#f0fdf4', color: '#15803d', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>✅ Recibo N° {recibo.nro_recibo} creado</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={imprimir} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#1d4ed8', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>🖨️ Imprimir</button>
              <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}