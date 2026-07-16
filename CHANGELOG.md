# Changelog y Resumen Técnico
**Versión:** 1.0.0 -> 1.1.0
**Fecha:** 16 de Julio de 2026

## 1. Resumen de la Versión (v1.0.0 a v1.1.0)
Esta iteración de desarrollo se centró principalmente en la estabilización general de la interfaz de usuario (UI), la corrección de errores críticos relacionados con la impresión de reportes y la estandarización precisa en el manejo de fechas dentro del sistema. Con estos ajustes, se garantiza una experiencia operativa mucho más fluida, robusta y confiable para el usuario.

## 2. Nuevas Características (Features)
*   **Recuperación de Contraseña (Login):** Se implementó exitosamente el flujo funcional para la recuperación de contraseña en el componente `Login.tsx`, estableciendo la conexión adecuada y segura con los endpoints del backend.
*   **Modales de "Informe Completo":** Se crearon e integraron exitosamente modales de visualización extendida ("Informe Completo") dentro de los módulos de `Dashboard.tsx` y `ClinicalHistory.tsx`, permitiendo acceder a los detalles exhaustivos de forma rápida e intuitiva sin salir de la vista actual.

## 3. Corrección de Errores (Bug Fixes)
*   **Solución del Modo Oscuro:** Se resolvió el conflicto de especificidad y jerarquía de estilos entre las utilidades dinámicas de Tailwind CSS y el CSS nativo en `index.css`, asegurando que el Modo Oscuro se aplique y herede correctamente de forma global.
*   **Corrección del "Bug de las 12:00":** Se corrigió el desfase temporal al guardar y recuperar registros estableciendo y forzando la zona horaria `America/Lima` a nivel de la base de datos MySQL, previniendo inconsistencias en los historiales.
*   **Ajustes de Impresión:** Se solucionó el desbordamiento de impresión que generaba documentos divididos incorrectamente en dos hojas. Ahora el formato de impresión se adapta correctamente al área de la página.
*   **Prevención de Alucinaciones (IA):** Se ajustaron los prompts y validaciones para eliminar la generación de enlaces o referencias inexistentes (alucinaciones) por parte del motor de IA.
*   **Fix de Compilación en Render (`Invalid declaration`):** Se limpiaron los bloques de estilos que contenían caracteres residuales de Markdown (como los backticks ` ``` `), los cuales provocaban errores de sintaxis y bloqueaban el despliegue a producción en Render.

## 4. Estado Técnico
El frontend compila de manera exitosa y estable. Las integraciones con el backend operan con normalidad, garantizando que la información y los historiales se persistan de forma íntegra y segura en la base de datos.
