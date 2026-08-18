const prisma = require('../config/db');

// La exigencia de vigencia se lee de configuración para poder trabajar con
// datos ficticios durante el desarrollo. Al poner el sistema en servicio se
// activa desde Administración → Configuración y pasa a bloquear asignaciones.
const exigeVigencia = async () => {
  try {
    const c = await prisma.configuracion.findUnique({ where: { id: 1 } });
    return Boolean(c?.exigir_habilitacion_vigente);
  } catch {
    return false;
  }
};

const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

// Evalúa una habilitación y explica por qué no sirve, si no sirve.
const evaluar = (hab, campoRegistro) => {
  if (!hab) return { apto: false, motivo: 'Sin habilitación registrada' };
  if (!hab.activo) return { apto: false, motivo: 'Habilitación dada de baja' };
  if (!hab[campoRegistro] || String(hab[campoRegistro]).trim() === '') {
    return { apto: false, motivo: 'Sin número de registro cargado' };
  }
  if (!hab.fecha_vencimiento) return { apto: false, motivo: 'Sin fecha de vencimiento' };
  if (new Date(hab.fecha_vencimiento) < hoy()) {
    return { apto: false, motivo: `Vencida el ${hab.fecha_vencimiento.toISOString().slice(0, 10)}` };
  }
  return { apto: true, motivo: null, vence: hab.fecha_vencimiento };
};

// El usuario debe venir con paramedico_habilitado_usuario y conductor_habilitado_usuario
const comoParamedico = (u) => evaluar(u.paramedico_habilitado_usuario?.[0], 'nro_registro');
const comoConductor  = (u) => evaluar(u.conductor_habilitado_usuario?.[0], 'nro_licencia');

// Apto para la función concreta que se le quiere asignar en la tripulación:
// conducir exige licencia vigente, atender exige registro profesional vigente.
const aptoPara = (u, funcion) =>
  funcion === 'CONDUCTOR' ? comoConductor(u) : comoParamedico(u);

module.exports = { exigeVigencia, comoParamedico, comoConductor, aptoPara };
