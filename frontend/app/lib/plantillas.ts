import { API_URL } from '@/app/lib/api';

// Trae la plantilla del documento desde el backend, reemplaza las {{variables}}
// por los datos reales y abre la ventana de impresión.
export async function imprimirDesdePlantilla(
  clave: string,
  data: Record<string, string>,
  token: string
) {
  // Se abre YA (dentro del gesto del usuario) para no gatillar el bloqueo de popups.
  const ventana = window.open('', '_blank');
  if (!ventana) { alert('Permití las ventanas emergentes para poder imprimir.'); return; }
  ventana.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Generando documento…</p>');

  try {
    const res = await fetch(`${API_URL}/api/plantillas/${clave}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { ventana.document.body.innerHTML = 'No se pudo cargar la plantilla del documento.'; return; }
    const p = await res.json();
    const html = String(p.contenido_html || '');
    const render = html.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in data ? data[k] : ''));
    const disparo = '<script>window.onload=function(){window.print();}<\/script>';
    const final = render.includes('</body>')
      ? render.replace('</body>', disparo + '</body>')
      : render + disparo;
    ventana.document.open();
    ventana.document.write(final);
    ventana.document.close();
  } catch {
    ventana.document.body.innerHTML = 'Error de conexión al generar el documento.';
  }
}
