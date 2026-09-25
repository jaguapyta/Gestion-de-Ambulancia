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
const COORD_ESTADISTICAS = 'COORDINADOR_ESTADISTICAS';
const ASISTENTE_ESTADISTICAS = 'ASISTENTE_ESTADISTICAS';

// Dirección: rol de supervisión de SOLO LECTURA. Ve todo el sistema salvo
// Administración (y salvo la ficha médica, por ser dato clínico del paciente).
// No participa de ninguna mutación: no se agrega a los grupos de gestión ni
// a las rutas POST/PUT/PATCH/DELETE.
const DIRECCION = 'DIRECCION';

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

  // Estadísticas: jefaturas operativas + el área de Estadísticas
  LEER_ESTADISTICAS: [ADMIN, COORD_OPERATIVO, COORD_TRANSPORTE, COORD_REGULACION, COORD_ESTADISTICAS, ASISTENTE_ESTADISTICAS, DIRECCION],

  // Móviles: los usan Administración, Transporte y el armado de guardias
  LEER_MOVILES: [ADMIN, COORD_TRANSPORTE, ASISTENTE_TRANSPORTE, COORD_OPERATIVO, DIRECCION],

  // Bases: Administración las gestiona, Coordinación Operativa las asigna a móviles
  LEER_BASES: [ADMIN, COORD_OPERATIVO, DIRECCION],

  // Personal de cada área
  LEER_PARAMEDICOS: [ADMIN, COORD_OPERATIVO, DIRECCION],
  LEER_CONDUCTORES: [ADMIN, COORD_TRANSPORTE, ASISTENTE_TRANSPORTE, DIRECCION],

  // Personal del Centro de Regulación
  LEER_MEDICOS: [ADMIN, COORD_REGULACION, SUPERVISOR, DIRECCION],
  LEER_ARM:     [ADMIN, COORD_REGULACION, SUPERVISOR, DIRECCION],
  LEER_SUPERVISORES: [ADMIN, COORD_REGULACION, DIRECCION],

  // Guardias: las arma Coordinación Operativa, las consulta el Centro de Regulación
  LEER_GUARDIAS: [ADMIN, COORD_OPERATIVO, COORD_REGULACION, SUPERVISOR, DIRECCION],

  // Órdenes de trabajo: solo Transporte
  LEER_ORDENES: [ADMIN, COORD_TRANSPORTE, ASISTENTE_TRANSPORTE, DIRECCION],

  // Estados temporales: toda jefatura que gestione personal
  LEER_ESTADOS: [ADMIN, COORD_OPERATIVO, COORD_TRANSPORTE, COORD_REGULACION, SUPERVISOR, DIRECCION],

    // Centro de Regulación — operación (recepción y gestión de solicitudes)
  LEER_SOLICITUDES:      [ADMIN, COORD_REGULACION, SUPERVISOR, ARM, MEDICO_REGULADOR, DIRECCION],
  GESTIONAR_SOLICITUDES: [ADMIN, COORD_REGULACION, SUPERVISOR, ARM, MEDICO_REGULADOR],

    // Padrón de dializados: solo Coordinación de Regulación
  LEER_DIALIZADOS:      [ADMIN, COORD_REGULACION, DIRECCION],
  GESTIONAR_DIALIZADOS: [ADMIN, COORD_REGULACION],

  // Búsqueda de personas por documento: la usan los tres formularios de alta de personal
  BUSCAR_PERSONA: [ADMIN, COORD_OPERATIVO, COORD_TRANSPORTE, COORD_REGULACION, SUPERVISOR],

    POTESTAD,
  POTESTAD_POR_DEFECTO,
  tienePotestad,

  // Filtro grueso para acciones sobre el legajo (reset de contraseña, estados temporales)
  GESTION_LEGAJO: [ADMIN, COORD_OPERATIVO, COORD_TRANSPORTE, COORD_REGULACION, SUPERVISOR],
  
};
