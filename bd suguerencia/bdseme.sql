-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         10.4.32-MariaDB - mariadb.org binary distribution
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para seme_db
CREATE DATABASE IF NOT EXISTS `seme_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `seme_db`;

-- Volcando estructura para tabla seme_db.auditoria
CREATE TABLE IF NOT EXISTS `auditoria` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `accion` varchar(80) NOT NULL COMMENT 'LOGIN, CREAR_SOLICITUD, DESPACHAR…',
  `tabla` varchar(60) DEFAULT NULL,
  `registro_id` int(10) unsigned DEFAULT NULL,
  `detalle` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_audit_usuario` (`usuario_id`),
  CONSTRAINT `fk_audit_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.auditoria: ~0 rows (aproximadamente)

-- Volcando estructura para tabla seme_db.base
CREATE TABLE IF NOT EXISTS `base` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.base: ~3 rows (aproximadamente)
INSERT INTO `base` (`id`, `nombre`, `direccion`, `activa`) VALUES
	(1, 'Base Central SEME', 'Av. Mcal. López 1234, Asunción', 1),
	(2, 'Base Norte', 'Av. Artigas 567, Asunción', 1),
	(3, 'Base Este', 'Ruta 2 Km 12, San Lorenzo', 1);

-- Volcando estructura para tabla seme_db.canal_ingreso
CREATE TABLE IF NOT EXISTS `canal_ingreso` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(40) NOT NULL COMMENT 'Teléfono, App, Presencial…',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.canal_ingreso: ~4 rows (aproximadamente)
INSERT INTO `canal_ingreso` (`id`, `nombre`) VALUES
	(1, 'Teléfono'),
	(2, 'Aplicación móvil'),
	(3, 'Presencial'),
	(4, 'Radio');

-- Volcando estructura para tabla seme_db.despacho
CREATE TABLE IF NOT EXISTS `despacho` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `solicitud_id` int(10) unsigned NOT NULL,
  `despachante_id` int(10) unsigned NOT NULL,
  `tripulacion_id` int(10) unsigned NOT NULL,
  `hora_despacho` datetime NOT NULL DEFAULT current_timestamp(),
  `hora_llegada` datetime DEFAULT NULL,
  `hora_atencion` datetime DEFAULT NULL,
  `hora_cierre` datetime DEFAULT NULL,
  `km_recorridos` decimal(6,2) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `solicitud_id` (`solicitud_id`),
  KEY `fk_despacho_desp` (`despachante_id`),
  KEY `fk_despacho_trip` (`tripulacion_id`),
  CONSTRAINT `fk_despacho_desp` FOREIGN KEY (`despachante_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_despacho_sol` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitud` (`id`),
  CONSTRAINT `fk_despacho_trip` FOREIGN KEY (`tripulacion_id`) REFERENCES `tripulacion_servicio` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.despacho: ~0 rows (aproximadamente)
INSERT INTO `despacho` (`id`, `solicitud_id`, `despachante_id`, `tripulacion_id`, `hora_despacho`, `hora_llegada`, `hora_atencion`, `hora_cierre`, `km_recorridos`, `observaciones`) VALUES
	(1, 1, 2, 1, '2026-06-02 09:29:49', NULL, NULL, NULL, NULL, NULL);

-- Volcando estructura para tabla seme_db.funcion_turno
CREATE TABLE IF NOT EXISTS `funcion_turno` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `guardia_id` int(10) unsigned NOT NULL,
  `usuario_id` int(10) unsigned NOT NULL,
  `funcion` enum('RECEPCIONISTA','DESPACHANTE','MEDICO_REGULADOR','ASISTENTE_REGULACION','TRIPULACION') NOT NULL,
  `hora_inicio` datetime NOT NULL,
  `hora_fin` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ft_guardia` (`guardia_id`),
  KEY `fk_ft_usuario` (`usuario_id`),
  CONSTRAINT `fk_ft_guardia` FOREIGN KEY (`guardia_id`) REFERENCES `guardia` (`id`),
  CONSTRAINT `fk_ft_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.funcion_turno: ~5 rows (aproximadamente)
INSERT INTO `funcion_turno` (`id`, `guardia_id`, `usuario_id`, `funcion`, `hora_inicio`, `hora_fin`) VALUES
	(1, 1, 2, 'DESPACHANTE', '2026-06-02 09:29:49', NULL),
	(2, 1, 7, 'RECEPCIONISTA', '2026-06-02 09:29:49', NULL),
	(3, 1, 3, '', '2026-06-02 09:29:49', NULL),
	(4, 1, 5, 'TRIPULACION', '2026-06-02 09:29:49', NULL),
	(5, 1, 6, 'TRIPULACION', '2026-06-02 09:29:49', NULL);

-- Volcando estructura para tabla seme_db.guardia
CREATE TABLE IF NOT EXISTS `guardia` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `base_id` tinyint(3) unsigned NOT NULL,
  `supervisor_id` int(10) unsigned NOT NULL COMMENT 'usuario.id del supervisor de guardia',
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `observacion` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_guardia_base` (`base_id`),
  KEY `fk_guardia_sup` (`supervisor_id`),
  CONSTRAINT `fk_guardia_base` FOREIGN KEY (`base_id`) REFERENCES `base` (`id`),
  CONSTRAINT `fk_guardia_sup` FOREIGN KEY (`supervisor_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.guardia: ~0 rows (aproximadamente)
INSERT INTO `guardia` (`id`, `base_id`, `supervisor_id`, `fecha_inicio`, `fecha_fin`, `observacion`) VALUES
	(1, 1, 2, '2026-06-02 09:29:49', NULL, NULL);

-- Volcando estructura para tabla seme_db.hospital
CREATE TABLE IF NOT EXISTS `hospital` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `direccion` varchar(200) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.hospital: ~5 rows (aproximadamente)
INSERT INTO `hospital` (`id`, `nombre`, `direccion`, `telefono`, `latitud`, `longitud`, `activo`) VALUES
	(1, 'Hospital Nacional de Itauguá', 'Ruta 1 Km 30, Itauguá', '0291-432100', NULL, NULL, 1),
	(2, 'Hospital de Clínicas', 'Av. Dr. Montero s/n, Asunción', '021-424242', NULL, NULL, 1),
	(3, 'Hospital Barrio Obrero', 'Av. Dr. Vargas 1850, Asunción', '021-555000', NULL, NULL, 1),
	(4, 'Hospital de Trauma', 'Av. Santísima Trinidad, Asunción', '021-206000', NULL, NULL, 1),
	(5, 'Sanatorio Migone', 'Av. Brasil 1254, Asunción', '021-611000', NULL, NULL, 1);

-- Volcando estructura para tabla seme_db.menu
CREATE TABLE IF NOT EXISTS `menu` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `ruta` varchar(120) NOT NULL COMMENT 'Ruta Next.js ej: /despacho/mapa',
  `icono` varchar(60) DEFAULT NULL,
  `orden` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `menu_padre` int(10) unsigned DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `fk_menu_padre` (`menu_padre`),
  CONSTRAINT `fk_menu_padre` FOREIGN KEY (`menu_padre`) REFERENCES `menu` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.menu: ~24 rows (aproximadamente)
INSERT INTO `menu` (`id`, `nombre`, `ruta`, `icono`, `orden`, `menu_padre`, `activo`) VALUES
	(1, 'Dashboard', '/dashboard', 'dashboard', 1, NULL, 1),
	(2, 'Gestión de usuarios', '/admin/usuarios', 'users', 2, NULL, 1),
	(3, 'Gestión de roles', '/admin/roles', 'shield', 3, NULL, 1),
	(4, 'Flota de ambulancias', '/admin/flota', 'truck', 4, NULL, 1),
	(5, 'Reportes', '/admin/reportes', 'bar-chart', 5, NULL, 1),
	(6, 'Configuración', '/admin/config', 'settings', 6, NULL, 1),
	(7, 'Auditoría / Logs', '/admin/auditoria', 'activity', 7, NULL, 1),
	(8, 'Panel de guardia', '/supervisor/guardia', 'clipboard', 1, NULL, 1),
	(9, 'Gestión del turno', '/supervisor/turno', 'users', 2, NULL, 1),
	(10, 'Recepción', '/recepcion', 'phone', 1, NULL, 1),
	(11, 'Despacho', '/despacho', 'navigation', 1, NULL, 1),
	(12, 'Mapa en tiempo real', '/despacho/mapa', 'map', 2, NULL, 1),
	(13, 'Cola de solicitudes', '/despacho/cola', 'list', 3, NULL, 1),
	(14, 'Cerrar servicio', '/despacho/cierre', 'check-circle', 4, NULL, 1),
	(15, 'Solicitudes activas', '/medico/solicitudes', 'alert-circle', 1, NULL, 1),
	(16, 'Referencia de cama', '/medico/ref-cama', 'bed', 2, NULL, 1),
	(17, 'Hospitales', '/medico/hospitales', 'building', 3, NULL, 1),
	(18, 'Historial médico', '/medico/historial', 'file-text', 4, NULL, 1),
	(19, 'Mi servicio', '/tripulacion/servicio', 'briefcase', 1, NULL, 1),
	(20, 'Signos vitales', '/tripulacion/signos', 'heart', 2, NULL, 1),
	(21, 'Cierre en campo', '/tripulacion/cierre', 'check-square', 3, NULL, 1),
	(22, 'Historial servicios', '/tripulacion/historial', 'clock', 4, NULL, 1),
	(23, 'Bases / Unidades', '/admin/bases', 'home', 8, NULL, 1),
	(24, 'Monitoreo', '/supervisor/monitoreo', 'monitor', 3, NULL, 1);

-- Volcando estructura para tabla seme_db.persona
CREATE TABLE IF NOT EXISTS `persona` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `primer_nombre` varchar(60) NOT NULL,
  `segundo_nombre` varchar(60) DEFAULT NULL,
  `primer_apellido` varchar(60) NOT NULL,
  `segundo_apellido` varchar(60) DEFAULT NULL,
  `tipo_documento` tinyint(3) unsigned NOT NULL,
  `nro_documento` varchar(20) NOT NULL,
  `sexo` enum('M','F','OTRO') NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nro_documento` (`nro_documento`),
  KEY `fk_persona_tdoc` (`tipo_documento`),
  CONSTRAINT `fk_persona_tdoc` FOREIGN KEY (`tipo_documento`) REFERENCES `tipo_documento` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.persona: ~7 rows (aproximadamente)
INSERT INTO `persona` (`id`, `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `tipo_documento`, `nro_documento`, `sexo`, `fecha_nacimiento`, `telefono`, `email`, `created_at`) VALUES
	(1, 'EMILIO', 'RAMON', 'INSFRAN', 'GAMARRA', 1, '3177755', 'M', '1981-12-09', '0981-111111', 'admin@seme.gov.py', '2026-06-02 09:29:49'),
	(2, 'CARLOS', NULL, 'BENITEZ', 'LOPEZ', 1, '4521890', 'M', '1985-03-15', '0982-222222', 'supervisor@seme.gov.py', '2026-06-02 09:29:49'),
	(3, 'ANA', 'MARIA', 'GIMENEZ', 'ROJAS', 1, '5234671', 'F', '1990-07-22', '0983-333333', 'medico@seme.gov.py', '2026-06-02 09:29:49'),
	(4, 'PEDRO', NULL, 'MARTINEZ', 'VERA', 1, '6341200', 'M', '1988-11-05', '0984-444444', 'asistente@seme.gov.py', '2026-06-02 09:29:49'),
	(5, 'LUCIA', 'ELENA', 'SANCHEZ', NULL, 1, '7123456', 'F', '1993-04-18', '0985-555555', 'paramedico@seme.gov.py', '2026-06-02 09:29:49'),
	(6, 'JOSE', 'ANTONIO', 'RODRIGUEZ', 'DIAZ', 1, '8234567', 'M', '1987-09-30', '0986-666666', 'conductor@seme.gov.py', '2026-06-02 09:29:49'),
	(7, 'MARIA', NULL, 'FERNANDEZ', 'CANO', 1, '9345678', 'F', '1995-02-14', '0987-777777', 'recepcion@seme.gov.py', '2026-06-02 09:29:49');

-- Volcando estructura para tabla seme_db.referencia_cama
CREATE TABLE IF NOT EXISTS `referencia_cama` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `solicitud_id` int(10) unsigned NOT NULL,
  `medico_id` int(10) unsigned NOT NULL COMMENT 'Médico Regulador que gestiona',
  `hospital_origen_id` int(10) unsigned DEFAULT NULL,
  `hospital_destino_id` int(10) unsigned NOT NULL,
  `tipo_cama` varchar(80) NOT NULL COMMENT 'UCI, Pediatría, Traumatología…',
  `diagnostico` text NOT NULL,
  `estado` enum('PENDIENTE','CAMA_CONFIRMADA','AMBULANCIA_SEME','AMBULANCIA_PROPIA','CERRADA') NOT NULL DEFAULT 'PENDIENTE',
  `ambulancia_seme` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1=SEME provee móvil',
  `observaciones` text DEFAULT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_rc_solicitud` (`solicitud_id`),
  KEY `fk_rc_medico` (`medico_id`),
  KEY `fk_rc_hosp_orig` (`hospital_origen_id`),
  KEY `fk_rc_hosp_dest` (`hospital_destino_id`),
  CONSTRAINT `fk_rc_hosp_dest` FOREIGN KEY (`hospital_destino_id`) REFERENCES `hospital` (`id`),
  CONSTRAINT `fk_rc_hosp_orig` FOREIGN KEY (`hospital_origen_id`) REFERENCES `hospital` (`id`),
  CONSTRAINT `fk_rc_medico` FOREIGN KEY (`medico_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_rc_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitud` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.referencia_cama: ~0 rows (aproximadamente)
INSERT INTO `referencia_cama` (`id`, `solicitud_id`, `medico_id`, `hospital_origen_id`, `hospital_destino_id`, `tipo_cama`, `diagnostico`, `estado`, `ambulancia_seme`, `observaciones`, `fecha_hora`) VALUES
	(1, 3, 3, 3, 4, 'UCI', 'Politraumatismo severo, requiere cuidados intensivos', 'PENDIENTE', 1, NULL, '2026-06-02 09:29:49');

-- Volcando estructura para tabla seme_db.rol
CREATE TABLE IF NOT EXISTS `rol` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `nivel` tinyint(3) unsigned NOT NULL COMMENT '1=Admin 2=Supervisor 3=Operativo 4=Campo',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.rol: ~7 rows (aproximadamente)
INSERT INTO `rol` (`id`, `nombre`, `descripcion`, `nivel`, `activo`, `created_at`) VALUES
	(1, 'ADMINISTRADOR', 'Acceso total al sistema', 1, 1, '2026-06-02 09:29:49'),
	(2, 'SUPERVISOR_GUARDIA', 'Gestiona el turno; puede recibir, despachar y regular', 2, 1, '2026-06-02 09:29:49'),
	(3, 'MEDICO_REGULADOR', 'Gestiona referencias de cama y regulación médica', 3, 1, '2026-06-02 09:29:49'),
	(4, 'ASISTENTE_REGULACION', 'Apoya recepción, despacho y regulación médica', 3, 1, '2026-06-02 09:29:49'),
	(5, 'PARAMEDICO', 'Atención en campo y registro de signos vitales', 4, 1, '2026-06-02 09:29:49'),
	(6, 'CONDUCTOR_PARAMEDICO', 'Conducción y funciones de paramédico', 4, 1, '2026-06-02 09:29:49'),
	(7, 'CONDUCTOR', 'Conducción del móvil', 4, 1, '2026-06-02 09:29:49');

-- Volcando estructura para tabla seme_db.rol_menu
CREATE TABLE IF NOT EXISTS `rol_menu` (
  `rol_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`rol_id`,`menu_id`),
  KEY `fk_rm_menu` (`menu_id`),
  CONSTRAINT `fk_rm_menu` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`id`),
  CONSTRAINT `fk_rm_rol` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.rol_menu: ~61 rows (aproximadamente)
INSERT INTO `rol_menu` (`rol_id`, `menu_id`) VALUES
	(1, 1),
	(1, 2),
	(1, 3),
	(1, 4),
	(1, 5),
	(1, 6),
	(1, 7),
	(1, 8),
	(1, 9),
	(1, 10),
	(1, 11),
	(1, 12),
	(1, 13),
	(1, 14),
	(1, 15),
	(1, 16),
	(1, 17),
	(1, 18),
	(1, 19),
	(1, 20),
	(1, 21),
	(1, 22),
	(1, 23),
	(1, 24),
	(2, 1),
	(2, 8),
	(2, 9),
	(2, 10),
	(2, 11),
	(2, 12),
	(2, 13),
	(2, 14),
	(2, 15),
	(2, 16),
	(2, 24),
	(3, 1),
	(3, 10),
	(3, 15),
	(3, 16),
	(3, 17),
	(3, 18),
	(4, 1),
	(4, 10),
	(4, 11),
	(4, 12),
	(4, 13),
	(4, 14),
	(4, 15),
	(5, 1),
	(5, 19),
	(5, 20),
	(5, 21),
	(5, 22),
	(6, 1),
	(6, 19),
	(6, 20),
	(6, 21),
	(6, 22),
	(7, 1),
	(7, 19),
	(7, 21);

-- Volcando estructura para tabla seme_db.signos_vitales
CREATE TABLE IF NOT EXISTS `signos_vitales` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `solicitud_id` int(10) unsigned NOT NULL,
  `registrado_por` int(10) unsigned NOT NULL COMMENT 'usuario.id del paramédico',
  `presion_sistolica` smallint(5) unsigned DEFAULT NULL,
  `presion_diastolica` smallint(5) unsigned DEFAULT NULL,
  `frecuencia_cardiaca` smallint(5) unsigned DEFAULT NULL,
  `saturacion_o2` tinyint(3) unsigned DEFAULT NULL,
  `temperatura` decimal(4,1) DEFAULT NULL,
  `frecuencia_resp` tinyint(3) unsigned DEFAULT NULL,
  `glasgow` tinyint(3) unsigned DEFAULT NULL COMMENT 'Escala de Glasgow 3-15',
  `glucemia` smallint(5) unsigned DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_sv_solicitud` (`solicitud_id`),
  KEY `fk_sv_usuario` (`registrado_por`),
  CONSTRAINT `fk_sv_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitud` (`id`),
  CONSTRAINT `fk_sv_usuario` FOREIGN KEY (`registrado_por`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.signos_vitales: ~0 rows (aproximadamente)
INSERT INTO `signos_vitales` (`id`, `solicitud_id`, `registrado_por`, `presion_sistolica`, `presion_diastolica`, `frecuencia_cardiaca`, `saturacion_o2`, `temperatura`, `frecuencia_resp`, `glasgow`, `glucemia`, `observaciones`, `fecha_hora`) VALUES
	(1, 1, 5, 160, 100, 110, 92, 36.8, NULL, 14, NULL, NULL, '2026-06-02 09:29:49');

-- Volcando estructura para tabla seme_db.solicitud
CREATE TABLE IF NOT EXISTS `solicitud` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tipo_solicitud_id` tinyint(3) unsigned NOT NULL,
  `canal_id` tinyint(3) unsigned NOT NULL,
  `recepcionista_id` int(10) unsigned NOT NULL COMMENT 'usuario.id',
  `paciente_nombre` varchar(120) NOT NULL,
  `paciente_edad` tinyint(3) unsigned DEFAULT NULL,
  `paciente_doc` varchar(20) DEFAULT NULL,
  `direccion` varchar(200) NOT NULL,
  `referencia` varchar(200) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `prioridad` enum('ROJO','AMARILLO','VERDE','AZUL') NOT NULL DEFAULT 'VERDE',
  `estado` enum('RECIBIDA','EN_REGULACION','DESPACHADA','EN_CAMINO','EN_ATENCION','CERRADA','CANCELADA') NOT NULL DEFAULT 'RECIBIDA',
  `motivo` text NOT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_sol_tipo` (`tipo_solicitud_id`),
  KEY `fk_sol_canal` (`canal_id`),
  KEY `fk_sol_recep` (`recepcionista_id`),
  CONSTRAINT `fk_sol_canal` FOREIGN KEY (`canal_id`) REFERENCES `canal_ingreso` (`id`),
  CONSTRAINT `fk_sol_recep` FOREIGN KEY (`recepcionista_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_sol_tipo` FOREIGN KEY (`tipo_solicitud_id`) REFERENCES `tipo_solicitud` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.solicitud: ~4 rows (aproximadamente)
INSERT INTO `solicitud` (`id`, `tipo_solicitud_id`, `canal_id`, `recepcionista_id`, `paciente_nombre`, `paciente_edad`, `paciente_doc`, `direccion`, `referencia`, `latitud`, `longitud`, `prioridad`, `estado`, `motivo`, `observaciones`, `fecha_hora`) VALUES
	(1, 1, 1, 7, 'Juan Pérez', 45, NULL, 'Av. Mcal. López 2500, Asunción', NULL, NULL, NULL, 'ROJO', 'DESPACHADA', 'Dolor precordial irradiado a brazo izquierdo, dificultad respiratoria', NULL, '2026-06-02 09:29:49'),
	(2, 2, 2, 7, 'María Gómez', 70, NULL, 'Calle Tacuary 890, Asunción', NULL, NULL, NULL, 'AMARILLO', 'EN_CAMINO', 'Traslado post-quirúrgico a Hospital de Clínicas', NULL, '2026-06-02 09:29:49'),
	(3, 3, 1, 7, 'Roberto Cáceres', 58, NULL, 'Hospital Barrio Obrero, Asunción', NULL, NULL, NULL, 'ROJO', 'EN_REGULACION', 'Referencia de cama UCI desde Barrio Obrero hacia Hospital de Trauma', NULL, '2026-06-02 09:29:49'),
	(4, 1, 4, 7, 'Sofía Ramírez', 30, NULL, 'Ruta 2 Km 8, San Lorenzo', NULL, NULL, NULL, 'ROJO', 'RECIBIDA', 'Accidente de tránsito, trauma múltiple, inconsciente', NULL, '2026-06-02 09:29:49');

-- Volcando estructura para tabla seme_db.tipo_documento
CREATE TABLE IF NOT EXISTS `tipo_documento` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(40) NOT NULL,
  `abreviatura` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `abreviatura` (`abreviatura`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.tipo_documento: ~3 rows (aproximadamente)
INSERT INTO `tipo_documento` (`id`, `nombre`, `abreviatura`) VALUES
	(1, 'Cédula de Identidad', 'CI'),
	(2, 'Pasaporte', 'PAS'),
	(3, 'Documento Extranjero', 'DE');

-- Volcando estructura para tabla seme_db.tipo_solicitud
CREATE TABLE IF NOT EXISTS `tipo_solicitud` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL COMMENT 'EMERGENCIA, TRASLADO, REFERENCIA_CAMA',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.tipo_solicitud: ~3 rows (aproximadamente)
INSERT INTO `tipo_solicitud` (`id`, `nombre`) VALUES
	(1, 'EMERGENCIA'),
	(2, 'TRASLADO'),
	(3, 'REFERENCIA_CAMA');

-- Volcando estructura para tabla seme_db.tripulacion_servicio
CREATE TABLE IF NOT EXISTS `tripulacion_servicio` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vehiculo_id` int(10) unsigned NOT NULL,
  `guardia_id` int(10) unsigned NOT NULL,
  `paramedico_id` int(10) unsigned NOT NULL,
  `conductor_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ts_vehiculo` (`vehiculo_id`),
  KEY `fk_ts_guardia` (`guardia_id`),
  KEY `fk_ts_paramedico` (`paramedico_id`),
  KEY `fk_ts_conductor` (`conductor_id`),
  CONSTRAINT `fk_ts_conductor` FOREIGN KEY (`conductor_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_ts_guardia` FOREIGN KEY (`guardia_id`) REFERENCES `guardia` (`id`),
  CONSTRAINT `fk_ts_paramedico` FOREIGN KEY (`paramedico_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_ts_vehiculo` FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.tripulacion_servicio: ~0 rows (aproximadamente)
INSERT INTO `tripulacion_servicio` (`id`, `vehiculo_id`, `guardia_id`, `paramedico_id`, `conductor_id`) VALUES
	(1, 1, 1, 5, 6);

-- Volcando estructura para tabla seme_db.usuario
CREATE TABLE IF NOT EXISTS `usuario` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `persona_id` int(10) unsigned NOT NULL,
  `rol_id` int(10) unsigned NOT NULL,
  `username` varchar(40) NOT NULL,
  `password` varchar(255) NOT NULL COMMENT 'bcrypt hash',
  `cargo` varchar(80) NOT NULL COMMENT 'Cargo real: Paramédico, Médico, Conductor…',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `persona_id` (`persona_id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_usuario_rol` (`rol_id`),
  CONSTRAINT `fk_usuario_persona` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.usuario: ~7 rows (aproximadamente)
INSERT INTO `usuario` (`id`, `persona_id`, `rol_id`, `username`, `password`, `cargo`, `activo`, `ultimo_login`, `created_at`) VALUES
	(1, 1, 1, 'admin', '$2b$10$EIX.Gos7aPaWxYzKpQvXuOWu7G3gZk1v0uF3gI5BQyMmklYi2XnuG', 'Administrador del Sistema', 1, NULL, '2026-06-02 09:29:49'),
	(2, 2, 2, 'supervisor', '$2b$10$EIX.Gos7aPaWxYzKpQvXuOWu7G3gZk1v0uF3gI5BQyMmklYi2XnuG', 'Supervisor de Guardia', 1, NULL, '2026-06-02 09:29:49'),
	(3, 3, 3, 'medico', '$2b$10$EIX.Gos7aPaWxYzKpQvXuOWu7G3gZk1v0uF3gI5BQyMmklYi2XnuG', 'Médico Regulador', 1, NULL, '2026-06-02 09:29:49'),
	(4, 4, 4, 'asistente', '$2b$10$EIX.Gos7aPaWxYzKpQvXuOWu7G3gZk1v0uF3gI5BQyMmklYi2XnuG', 'Asistente de Regulación', 1, NULL, '2026-06-02 09:29:49'),
	(5, 5, 5, 'paramedico', '$2b$10$EIX.Gos7aPaWxYzKpQvXuOWu7G3gZk1v0uF3gI5BQyMmklYi2XnuG', 'Paramédico', 1, NULL, '2026-06-02 09:29:49'),
	(6, 6, 7, 'conductor', '$2b$10$EIX.Gos7aPaWxYzKpQvXuOWu7G3gZk1v0uF3gI5BQyMmklYi2XnuG', 'Conductor', 1, NULL, '2026-06-02 09:29:49'),
	(7, 7, 4, 'recepcion', '$2b$10$EIX.Gos7aPaWxYzKpQvXuOWu7G3gZk1v0uF3gI5BQyMmklYi2XnuG', 'Recepcionista', 1, NULL, '2026-06-02 09:29:49');

-- Volcando estructura para vista seme_db.v_solicitudes_activas
-- Creando tabla temporal para superar errores de dependencia de VIEW
CREATE TABLE `v_solicitudes_activas` (
	`id` INT(10) UNSIGNED NOT NULL,
	`fecha_hora` DATETIME NOT NULL,
	`prioridad` ENUM('ROJO','AMARILLO','VERDE','AZUL') NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`estado` ENUM('RECIBIDA','EN_REGULACION','DESPACHADA','EN_CAMINO','EN_ATENCION','CERRADA','CANCELADA') NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`paciente_nombre` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`direccion` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`motivo` TEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`tipo_solicitud` VARCHAR(1) NOT NULL COMMENT 'EMERGENCIA, TRASLADO, REFERENCIA_CAMA' COLLATE 'utf8mb4_unicode_ci',
	`canal` VARCHAR(1) NOT NULL COMMENT 'Teléfono, App, Presencial…' COLLATE 'utf8mb4_unicode_ci',
	`recepcionista` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci'
);

-- Volcando estructura para tabla seme_db.vehiculo
CREATE TABLE IF NOT EXISTS `vehiculo` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `patente` varchar(10) NOT NULL,
  `marca` varchar(40) NOT NULL,
  `modelo` varchar(40) NOT NULL,
  `anio` year(4) NOT NULL,
  `tipo` enum('AMBULANCIA_UTI','AMBULANCIA_BASICA','MOVIL_RAPIDO') NOT NULL,
  `estado` enum('DISPONIBLE','EN_SERVICIO','MANTENIMIENTO','FUERA_SERVICIO') NOT NULL DEFAULT 'DISPONIBLE',
  `base_id` tinyint(3) unsigned NOT NULL,
  `latitud` decimal(10,7) DEFAULT NULL COMMENT 'Última posición GPS',
  `longitud` decimal(10,7) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patente` (`patente`),
  KEY `fk_vehiculo_base` (`base_id`),
  CONSTRAINT `fk_vehiculo_base` FOREIGN KEY (`base_id`) REFERENCES `base` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla seme_db.vehiculo: ~4 rows (aproximadamente)
INSERT INTO `vehiculo` (`id`, `patente`, `marca`, `modelo`, `anio`, `tipo`, `estado`, `base_id`, `latitud`, `longitud`, `activo`) VALUES
	(1, 'ABC 123', 'Mercedes-Benz', 'Sprinter', '2020', 'AMBULANCIA_UTI', 'EN_SERVICIO', 1, -25.2867000, -57.6470000, 1),
	(2, 'DEF 456', 'Ford', 'Transit', '2019', 'AMBULANCIA_BASICA', 'DISPONIBLE', 1, -25.2900000, -57.6410000, 1),
	(3, 'GHI 789', 'Fiat', 'Ducato', '2021', 'AMBULANCIA_BASICA', 'DISPONIBLE', 2, -25.2700000, -57.6300000, 1),
	(4, 'JKL 012', 'Mercedes-Benz', 'Vito', '2022', 'MOVIL_RAPIDO', 'DISPONIBLE', 3, -25.3100000, -57.5900000, 1);

-- Volcando estructura para disparador seme_db.trg_despacho_cierre
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER trg_despacho_cierre
AFTER UPDATE ON despacho FOR EACH ROW
BEGIN
    IF NEW.hora_cierre IS NOT NULL AND OLD.hora_cierre IS NULL THEN
        UPDATE vehiculo v
        JOIN tripulacion_servicio ts ON ts.id = NEW.tripulacion_id
        SET v.estado = 'DISPONIBLE'
        WHERE v.id = ts.vehiculo_id;

        UPDATE solicitud
        SET estado = 'CERRADA'
        WHERE id = NEW.solicitud_id;
    END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador seme_db.trg_despacho_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER trg_despacho_insert
AFTER INSERT ON despacho FOR EACH ROW
BEGIN
    UPDATE vehiculo v
    JOIN tripulacion_servicio ts ON ts.id = NEW.tripulacion_id
    SET v.estado = 'EN_SERVICIO'
    WHERE v.id = ts.vehiculo_id;

    UPDATE solicitud
    SET estado = 'DESPACHADA'
    WHERE id = NEW.solicitud_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador seme_db.trg_persona_upper_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER trg_persona_upper_insert
BEFORE INSERT ON persona FOR EACH ROW
BEGIN
    SET NEW.primer_nombre    = UPPER(NEW.primer_nombre);
    SET NEW.segundo_nombre   = IF(NEW.segundo_nombre IS NULL, NULL, UPPER(NEW.segundo_nombre));
    SET NEW.primer_apellido  = UPPER(NEW.primer_apellido);
    SET NEW.segundo_apellido = IF(NEW.segundo_apellido IS NULL, NULL, UPPER(NEW.segundo_apellido));
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador seme_db.trg_persona_upper_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER trg_persona_upper_update
BEFORE UPDATE ON persona FOR EACH ROW
BEGIN
    SET NEW.primer_nombre    = UPPER(NEW.primer_nombre);
    SET NEW.segundo_nombre   = IF(NEW.segundo_nombre IS NULL, NULL, UPPER(NEW.segundo_nombre));
    SET NEW.primer_apellido  = UPPER(NEW.primer_apellido);
    SET NEW.segundo_apellido = IF(NEW.segundo_apellido IS NULL, NULL, UPPER(NEW.segundo_apellido));
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Eliminando tabla temporal y crear estructura final de VIEW
DROP TABLE IF EXISTS `v_solicitudes_activas`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_solicitudes_activas` AS SELECT
    s.id,
    s.fecha_hora,
    s.prioridad,
    s.estado,
    s.paciente_nombre,
    s.direccion,
    s.motivo,
    ts.nombre  AS tipo_solicitud,
    ci.nombre  AS canal,
    CONCAT(p.primer_nombre, ' ', p.primer_apellido) AS recepcionista
FROM solicitud s
JOIN tipo_solicitud ts ON ts.id = s.tipo_solicitud_id
JOIN canal_ingreso  ci ON ci.id = s.canal_id
JOIN usuario        u  ON u.id  = s.recepcionista_id
JOIN persona        p  ON p.id  = u.persona_id
WHERE s.estado NOT IN ('CERRADA','CANCELADA')
ORDER BY
    FIELD(s.prioridad, 'ROJO','AMARILLO','VERDE','AZUL'),
    s.fecha_hora ASC 
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
