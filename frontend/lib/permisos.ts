// Matriz de acceso a menús. Espeja los grupos de backend/src/config/permisos.js
// pero cumple otra función: acá es comodidad, allá es seguridad.

// DIRECCION: rol de supervisión de solo lectura. Ve todas las secciones salvo
// Administración. La restricción de escritura la garantiza el backend; en el
// front se ocultan los botones de acción con esSoloLectura().
export const ACCESO = {
  administracion:          ['ADMINISTRADOR'],
  'sala-operaciones':      ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR', 'DIRECCION'],
  'coordinacion-operativa':['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'DIRECCION'],
  'coordinacion-transporte':['ADMINISTRADOR', 'COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'DIRECCION'],
  servicios:               ['ADMINISTRADOR', 'PARAMEDICO', 'CONDUCTOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'DIRECCION'],
  estadisticas:            ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR_REGULACION', 'COORDINADOR_ESTADISTICAS', 'ASISTENTE_ESTADISTICAS', 'DIRECCION'],
} as const;

export type Seccion = keyof typeof ACCESO;

export const puedeVer = (seccion: Seccion, rol?: string) =>
  !!rol && (ACCESO[seccion] as readonly string[]).includes(rol);

// Dirección es solo lectura: los botones de acción se ocultan con este helper.
export const esSoloLectura = (rol?: string) => rol === 'DIRECCION';

// Submenú de Recursos Humanos del Centro de Regulación: solo las jefaturas (+ Dirección, en modo lectura).
// Más estricto que ACCESO['sala-operaciones'] (que incluye ARM y médicos).
export const RRHH_REGULACION = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'DIRECCION'] as const;
// Operación del Centro de Regulación: incluye a ARM y médico regulador (que NO ven RRHH)
export const OPERACION_REGULACION = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR', 'DIRECCION'] as const;