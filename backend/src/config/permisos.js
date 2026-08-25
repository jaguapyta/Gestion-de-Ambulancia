// Grupos de roles autorizados a LEER cada recurso.
//
// La regla de armado: un endpoint debe permitir la unión de los roles que
// acceden a alguna pantalla que lo consume. Si cambia la matriz de menús
// del frontend, hay que revisar estos grupos.
//
// Las mutaciones (POST/PUT/PATCH/DELETE) siguen declarando sus roles en
// línea, porque suelen ser más restrictivas que la lectura.

const ADMIN = 'ADMINISTRADOR';

// Jefaturas de cada área
const COORD_OPERATIVO = 'COORDINADOR_OPERATIVO';
const COORD_TRANSPORTE = 'COORDINADOR_TRANSPORTE';
const COORD_REGULACION = 'COORDINADOR_REGULACION';
const SUPERVISOR = 'SUPERVISOR_GUARDIA';
const ASISTENTE_TRANSPORTE = 'ASISTENTE_TRANSPORTE';
const ARM = 'ARM';
const MEDICO_REGULADOR = 'MEDICO_REGULADOR';

// Potestad: qué rol puede administrar el legajo de qué tipo de funcionario.
// Cada área gestiona su propio personal; dentro del Centro de Regulación
// la cadena es coordinador → supervisor → ARM / médico regulador.
const POTESTAD = {
  PARAMEDICO:         [ADMIN, COORD_OPERATIVO],
  CONDUCTOR:          [ADMIN, COORD_TRANSPORTE],
  SUPERVISOR_GUARDIA: [ADMIN, COORD_REGULACION],
  ARM:                [ADMIN, COORD_REGULACION, SUPERVISOR],
  MEDICO_REGULADOR:   [ADMIN, COORD_REGULACION, SUPERVISOR],
};

// Cualquier rol no listado queda bajo el Administrador únicamente
const POTESTAD_POR_DEFECTO = [ADMIN];

const tienePotestad = (rolObjetivo, rolSolicitante) =>
  (POTESTAD[rolObjetivo] ?? POTESTAD_POR_DEFECTO).includes(rolSolicitante);

module.exports = {
  // Administración: exclusivo del Administrador
  ADMINISTRACION: [ADMIN],

  // Móviles: los usan Administración, Transporte y el armado de guardias
  LEER_MOVILES: [ADMIN, COORD_TRANSPORTE, ASISTENTE_TRANSPORTE, COORD_OPERATIVO],

  // Bases: Administración las gestiona, Coordinación Operativa las asigna a móviles
  LEER_BASES: [ADMIN, COORD_OPERATIVO],

  // Personal de cada área
  LEER_PARAMEDICOS: [ADMIN, COORD_OPERATIVO],
  LEER_CONDUCTORES: [ADMIN, COORD_TRANSPORTE, ASISTENTE_TRANSPORTE],

  // Personal del Centro de Regulación
  LEER_MEDICOS: [ADMIN, COORD_REGULACION, SUPERVISOR],
  LEER_ARM:     [ADMIN, COORD_REGULACION, SUPERVISOR],
  LEER_SUPERVISORES: [ADMIN, COORD_REGULACION],

  // Guardias: las arma Coordinación Operativa, las consulta el Centro de Regulación
  LEER_GUARDIAS: [ADMIN, COORD_OPERATIVO, COORD_REGULACION, SUPERVISOR],

  // Órdenes de trabajo: solo Transporte
  LEER_ORDENES: [ADMIN, COORD_TRANSPORTE, ASISTENTE_TRANSPORTE],

  // Estados temporales: toda jefatura que gestione personal
  LEER_ESTADOS: [ADMIN, COORD_OPERATIVO, COORD_TRANSPORTE, COORD_REGULACION, SUPERVISOR],

    // Centro de Regulación — operación (recepción y gestión de solicitudes)
  LEER_SOLICITUDES:      [ADMIN, COORD_REGULACION, SUPERVISOR, ARM, MEDICO_REGULADOR],
  GESTIONAR_SOLICITUDES: [ADMIN, COORD_REGULACION, SUPERVISOR, ARM, MEDICO_REGULADOR],

    // Padrón de dializados: solo Coordinación de Regulación
  LEER_DIALIZADOS:      [ADMIN, COORD_REGULACION],
  GESTIONAR_DIALIZADOS: [ADMIN, COORD_REGULACION],

  // Búsqueda de personas por documento: la usan los tres formularios de alta de personal
  BUSCAR_PERSONA: [ADMIN, COORD_OPERATIVO, COORD_TRANSPORTE, COORD_REGULACION, SUPERVISOR],

    POTESTAD,
  POTESTAD_POR_DEFECTO,
  tienePotestad,

  // Filtro grueso para acciones sobre el legajo (reset de contraseña, estados temporales)
  GESTION_LEGAJO: [ADMIN, COORD_OPERATIVO, COORD_TRANSPORTE, COORD_REGULACION, SUPERVISOR],
  
};
