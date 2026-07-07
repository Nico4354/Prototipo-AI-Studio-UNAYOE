-- ============================================================
-- PROTOTIPO UNAYOE - Sistema de Bienestar Universitario
-- Base de datos: MySQL (Railway)
-- Fecha de creación: 2026-06-25
-- ============================================================

-- Desactivar verificación de FK para creación limpia
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. TABLA: estudiantes
-- Almacena los datos básicos de cada estudiante registrado.
-- ============================================================
CREATE TABLE IF NOT EXISTS estudiantes (
    id              INT             NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(150)    NOT NULL,
    correo          VARCHAR(150)    NOT NULL UNIQUE,
    programa_academico VARCHAR(200) NOT NULL,
    password        VARCHAR(255)    NOT NULL COMMENT 'Texto plano (solo prototipo)',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. TABLA: evaluaciones
-- Registra las evaluaciones de bienestar que completa
-- cada estudiante (estrés, sueño, energía).
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluaciones (
    id              INT             NOT NULL AUTO_INCREMENT,
    estudiante_id   INT             NOT NULL,
    nivel_estres    INT             NOT NULL COMMENT 'Escala 1-10',
    horas_sueno     DECIMAL(4,2)    NOT NULL COMMENT 'Horas de sueño por noche',
    impacto_energia INT             NOT NULL COMMENT 'Escala 1-10',
    observaciones   TEXT            NULL,
    fecha_creacion  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_evaluaciones_estudiante
        FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. TABLA: diagnosticos_ia
-- Almacena el resultado del análisis de IA sobre cada
-- evaluación: nivel de riesgo, descripción y sugerencias.
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnosticos_ia (
    id                INT             NOT NULL AUTO_INCREMENT,
    evaluacion_id     INT             NOT NULL,
    nivel_riesgo      VARCHAR(50)     NOT NULL COMMENT 'Bajo / Medio / Alto / Crítico',
    descripcion_riesgo TEXT           NOT NULL,
    sugerencias_json  JSON            NOT NULL COMMENT 'Array JSON de sugerencias generadas por IA',
    fecha_diagnostico DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_diagnosticos_evaluacion
        FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TABLA: citas_psicologia
-- Gestiona el agendamiento de citas con el área de
-- psicología de la universidad.
-- ============================================================
CREATE TABLE IF NOT EXISTS citas_psicologia (
    id              INT             NOT NULL AUTO_INCREMENT,
    estudiante_id   INT             NOT NULL,
    fecha           DATE            NOT NULL,
    hora            TIME            NOT NULL,
    estado          ENUM('Pendiente', 'Atendido') NOT NULL DEFAULT 'Pendiente',
    PRIMARY KEY (id),
    CONSTRAINT fk_citas_estudiante
        FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. TABLA: recursos
-- Catálogo de talleres, guías y eventos de bienestar
-- disponibles para los estudiantes.
-- ============================================================
CREATE TABLE IF NOT EXISTS recursos (
    id              INT             NOT NULL AUTO_INCREMENT,
    titulo          VARCHAR(255)    NOT NULL,
    tipo            ENUM('Taller', 'Guia') NOT NULL,
    fecha_evento    DATE            NULL,
    descripcion     TEXT            NOT NULL,
    link            VARCHAR(500)    NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. TABLA: tickets_soporte
-- Sistema de tickets para que los estudiantes reporten
-- problemas o soliciten ayuda.
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets_soporte (
    id              INT             NOT NULL AUTO_INCREMENT,
    estudiante_id   INT             NOT NULL,
    tipo_problema   VARCHAR(100)    NOT NULL,
    mensaje         TEXT            NOT NULL,
    estado          ENUM('Abierto', 'En Proceso', 'Cerrado') NOT NULL DEFAULT 'Abierto',
    PRIMARY KEY (id),
    CONSTRAINT fk_tickets_estudiante
        FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reactivar verificación de FK
SET FOREIGN_KEY_CHECKS = 1;
