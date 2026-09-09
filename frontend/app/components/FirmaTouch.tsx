'use client';

import { useRef, useEffect } from 'react';

interface Props {
  label?: string;
  value?: string | null;              // dataURL PNG de una firma ya guardada
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

export default function FirmaTouch({ label, value, onChange, width = 380, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const hayTrazo = useRef(false);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = width * ratio; c.height = height * ratio;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0a2540';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = value;
      hayTrazo.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posicion = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const iniciar = (e: React.PointerEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = posicion(e);
    dibujando.current = true;
    ctx.beginPath(); ctx.moveTo(x, y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const mover = (e: React.PointerEvent) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = posicion(e);
    ctx.lineTo(x, y); ctx.stroke();
    hayTrazo.current = true;
  };
  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    onChange(hayTrazo.current ? canvasRef.current!.toDataURL('image/png') : null);
  };
  const limpiar = () => {
    const c = canvasRef.current!; const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    hayTrazo.current = false;
    onChange(null);
  };

  return (
    <div style={{ display: 'inline-block' }}>
      {label && <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{label}</div>}
      <div style={{ position: 'relative', width, height, border: '0.5px solid #cbd5e1', borderRadius: '8px', background: '#fff', touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          style={{ width, height, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerLeave={terminar}
          onPointerCancel={terminar}
        />
        <div style={{ position: 'absolute', bottom: 6, left: 10, right: 10, borderTop: '1px dashed #cbd5e1', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '10px', color: '#cbd5e1', pointerEvents: 'none' }}>Firma</span>
      </div>
      <button type="button" onClick={limpiar} style={{ marginTop: '6px', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}>
        Limpiar firma
      </button>
    </div>
  );
}