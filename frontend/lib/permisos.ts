// Matriz de acceso a menús. Espeja los grupos de backend/src/config/permisos.js
// pero cumple otra función: acá es comodidad, allá es seguridad.

export const ACCESO = {
  administracion:          ['ADMINISTRADOR'],
  'sala-operaciones':      ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR'],
  'coordinacion-operativa':['ADMINISTRADOR', 'COORDINADOR_OPERATIVO'],
  'coordinacion-transporte':['ADMINISTRADOR', 'COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE'],
  servicios:               ['ADMINISTRADOR', 'PARAMEDICO', 'CONDUCTOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA'],
  estadisticas:            ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR_REGULACION'],
} as const;

export type Seccion = keyof typeof ACCESO;

export const puedeVer = (seccion: Seccion, rol?: string) =>
  !!rol && (ACCESO[seccion] as readonly string[]).includes(rol);
// Submenú de Recursos Humanos del Centro de Regulación: solo las jefaturas.
// Más estricto que ACCESO['sala-operaciones'] (que incluye ARM y médicos).
export const RRHH_REGULACION = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA'] as const;
// Operación del Centro de Regulación: incluye a ARM y médico regulador (que NO ven RRHH)
export const OPERACION_REGULACION = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR'] as const;