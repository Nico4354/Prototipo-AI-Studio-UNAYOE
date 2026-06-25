"""
UNAYOE FISI — Backend de Bienestar Universitario
Evaluador de tamizaje basado en GAD-7 con Gemini AI.

IMPORTANTE: Este sistema emite ALERTAS DE SUSCEPTIBILIDAD,
NO diagnósticos clínicos. Es un prototipo de tamizaje.
"""

import os
import json
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
import mysql.connector
from mysql.connector import Error

# Cargar variables de entorno desde .env (desarrollo local)
load_dotenv()

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Configuración de Gemini AI
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Almacenamiento en memoria para el prototipo (fallback)
_ultimo_diagnostico = {}

# ---------------------------------------------------------------------------
# Conexión a Base de Datos MySQL (Railway)
# ---------------------------------------------------------------------------
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.environ.get('MYSQL_HOST', 'maglev.proxy.rlwy.net'),
            port=int(os.environ.get('MYSQL_PORT', 12076)),
            user=os.environ.get('MYSQL_USER', 'root'),
            password=os.environ.get('MYSQL_PASSWORD', ''),
            database=os.environ.get('MYSQL_DATABASE', 'railway')
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def ensure_default_student():
    """Garantiza que exista un estudiante de prueba en la base de datos."""
    conn = get_db_connection()
    if not conn:
        return 1
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM estudiantes WHERE correo = %s", ('alex.rivera@unmsm.edu.pe',))
        student = cursor.fetchone()
        
        if student:
            return student['id']
            
        insert_query = "INSERT INTO estudiantes (nombre, correo, programa_academico, password) VALUES (%s, %s, %s, %s)"
        cursor.execute(insert_query, ('Alex Rivera', 'alex.rivera@unmsm.edu.pe', 'Ingeniería de Software', '123456'))
        conn.commit()
        return cursor.lastrowid
    except Error as e:
        print(f"Error ensuring default student: {e}")
        return 1
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ---------------------------------------------------------------------------
# Prompt de tamizaje GAD-7 para Gemini
# ---------------------------------------------------------------------------
PROMPT_TAMIZAJE = """
Eres un asistente de tamizaje de bienestar universitario del programa UNAYOE FISI
de la Universidad Nacional Mayor de San Marcos. Tu rol es evaluar indicadores de
bienestar estudiantil inspirándote en la escala GAD-7 (General Anxiety Disorder 7).

REGLAS ESTRICTAS:
1. NUNCA emitas un "diagnóstico médico". Siempre usa el término "alerta de susceptibilidad".
2. NUNCA uses palabras como "trastorno", "enfermedad", "patología" o "diagnóstico".
3. Usa lenguaje empático, cercano y no alarmista.
4. Siempre recomienda consultar con un profesional de UNAYOE para una evaluación completa.
5. Responde ÚNICAMENTE en formato JSON válido, sin markdown ni texto adicional.

DATOS DEL ESTUDIANTE:
- Nivel de estrés percibido: {nivel_estres}
- Horas de sueño promedio por noche: {horas_sueno}
- Impacto en energía diaria: {impacto_energia}
- Observaciones del estudiante: {observaciones}

CRITERIOS DE CLASIFICACIÓN (inspirados en GAD-7):
- "Bajo": Indicadores dentro de rangos saludables. Estrés manejable.
- "Moderado": Algunos indicadores fuera de rango. Tensión sostenida pero funcional.
- "Elevado": Múltiples indicadores preocupantes. Afectación notable en el día a día.
- "Crítico": Indicadores alarmantes. Se recomienda atención prioritaria de UNAYOE.

Responde EXCLUSIVAMENTE con este JSON (sin ```json, sin texto antes o después):
{{
  "nivel_riesgo": "Bajo|Moderado|Elevado|Crítico",
  "descripcion_riesgo": "Descripción empática de 2-3 oraciones sobre el estado del estudiante, usando lenguaje de tamizaje y susceptibilidad, NUNCA diagnóstico.",
  "sugerencias": [
    {{
      "title": "Título de la sugerencia",
      "description": "Descripción práctica y accionable de la sugerencia.",
      "actionText": "Texto del botón de acción",
      "icon": "User|BookOpen|Moon|Calendar|Clock|Heart"
    }}
  ]
}}

Genera exactamente 3 sugerencias personalizadas según los indicadores del estudiante.
"""


# ===========================================================================
# ENDPOINTS
# ===========================================================================

@app.route('/api/login', methods=['POST'])
def login():
    """Autenticación mock para el prototipo."""
    data = request.json
    email = data.get('email', '')
    password = data.get('password', '')

    # Validación mock simple
    if email and password:
        return jsonify({
            'status': 'success',
            'user': {
                'name': 'Alex Rivera',
                'program': 'Ingeniería de Software'
            }
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Credenciales incompletas'
        }), 400


@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    """
    Endpoint principal de tamizaje.
    Recibe los datos del formulario de evaluación y los envía a Gemini
    para obtener una alerta de susceptibilidad basada en GAD-7.
    """
    global _ultimo_diagnostico
    data = request.json

    nivel_estres = data.get('stressLevel', 'bajo')
    horas_sueno = data.get('sleepQuality', '7')
    impacto_energia = data.get('energyImpact', 'Medio')
    observaciones = data.get('observations', 'Sin observaciones')

    # Mapeo a numéricos para BD
    map_estres = {'bajo': 3, 'moderado': 6, 'alto': 9}
    nivel_estres_num = map_estres.get(nivel_estres.lower(), 5)
    
    try:
        horas_sueno_num = float(horas_sueno)
    except ValueError:
        horas_sueno_num = 7.0
        
    map_energia = {'Nulo': 1, 'Medio': 5, 'Severo': 9}
    impacto_energia_num = map_energia.get(impacto_energia, 5)

    # Verificar que Gemini está configurado
    if not GEMINI_API_KEY:
        return jsonify({
            'status': 'error',
            'message': 'GEMINI_API_KEY no configurada en el servidor.'
        }), 500

    try:
        # Construir el prompt con los datos del estudiante
        prompt = PROMPT_TAMIZAJE.format(
            nivel_estres=nivel_estres,
            horas_sueno=horas_sueno,
            impacto_energia=impacto_energia,
            observaciones=observaciones if observaciones else 'Sin observaciones adicionales'
        )

        # Llamar a Gemini
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)

        # Parsear la respuesta JSON de Gemini
        response_text = response.text.strip()

        # Limpiar posibles markdown wrappers
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        diagnostico = json.loads(response_text)

        # Validar estructura mínima
        if 'nivel_riesgo' not in diagnostico:
            raise ValueError('Respuesta de IA sin nivel_riesgo')

        # -------------------------------------------------------------
        # Guardar en Base de Datos MySQL
        # -------------------------------------------------------------
        estudiante_id = ensure_default_student()
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                # 1. Insertar evaluación
                query_eval = """
                INSERT INTO evaluaciones (estudiante_id, nivel_estres, horas_sueno, impacto_energia, observaciones)
                VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(query_eval, (estudiante_id, nivel_estres_num, horas_sueno_num, impacto_energia_num, observaciones))
                evaluacion_id = cursor.lastrowid
                
                # 2. Insertar diagnóstico IA
                query_diag = """
                INSERT INTO diagnosticos_ia (evaluacion_id, nivel_riesgo, descripcion_riesgo, sugerencias_json)
                VALUES (%s, %s, %s, %s)
                """
                cursor.execute(query_diag, (
                    evaluacion_id, 
                    diagnostico.get('nivel_riesgo', 'Desconocido'),
                    diagnostico.get('descripcion_riesgo', ''),
                    json.dumps(diagnostico.get('sugerencias', []))
                ))
                
                conn.commit()
            except Error as e:
                print(f"Error guardando en BD: {e}")
            finally:
                if conn.is_connected():
                    cursor.close()
                    conn.close()

        # Almacenar en memoria para el dashboard (prototipo)
        _ultimo_diagnostico = diagnostico

        return jsonify({
            'status': 'success',
            'diagnostico': diagnostico
        })

    except json.JSONDecodeError as e:
        return jsonify({
            'status': 'error',
            'message': 'Error al interpretar la respuesta del análisis de IA. Intenta nuevamente.'
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error en el análisis de IA: {str(e)}'
        }), 500


@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    """
    Devuelve los datos del último análisis de IA.
    Si no hay análisis previo, devuelve datos por defecto.
    """
    if _ultimo_diagnostico:
        return jsonify({
            'status': 'success',
            'riskLevel': _ultimo_diagnostico.get('nivel_riesgo', 'Sin evaluar'),
            'riskDescription': _ultimo_diagnostico.get('descripcion_riesgo', ''),
            'suggestions': _ultimo_diagnostico.get('sugerencias', [])
        })

    # Fallback si no hay evaluación previa
    return jsonify({
        'status': 'success',
        'riskLevel': 'Sin evaluar',
        'riskDescription': 'Aún no has completado tu primera evaluación de bienestar. Completa el formulario para recibir tu alerta de susceptibilidad.',
        'suggestions': [
            {
                'title': 'Completa tu primera evaluación',
                'description': 'Responde las preguntas de bienestar para recibir recomendaciones personalizadas.',
                'actionText': 'Ir a evaluación',
                'icon': 'User'
            }
        ]
    })


@app.route('/api/history', methods=['GET'])
def history():
    """Historial de evaluaciones (mock para prototipo)."""
    return jsonify({
        'status': 'success',
        'records': [
            {
                'id': '1',
                'date': '15 May 2026',
                'riskLevel': 'Moderado',
                'riskColor': 'orange',
                'summary': 'Tensión constante por exámenes parciales.'
            },
            {
                'id': '2',
                'date': '10 Abr 2026',
                'riskLevel': 'Bajo',
                'riskColor': 'emerald',
                'summary': 'Manejo adecuado de prácticas y laboratorios.'
            },
            {
                'id': '3',
                'date': '12 Mar 2026',
                'riskLevel': 'Alto',
                'riskColor': 'rose',
                'summary': 'Abrumado, dificultad para concentrarse en clases.'
            }
        ]
    })


@app.route('/api/resources', methods=['GET'])
def resources():
    """Catálogo de recursos de bienestar (mock para prototipo)."""
    return jsonify({
        'status': 'success',
        'workshops': [
            {
                'id': 'w1',
                'title': 'Taller de Manejo de Ansiedad en Parciales',
                'date': '25 Oct 2026',
                'time': '15:00 - 16:30',
                'type': 'Virtual',
                'icon': 'Video'
            },
            {
                'id': 'w2',
                'title': 'Gestión del Tiempo en Ciclos Finales',
                'date': '28 Oct 2026',
                'time': '10:00 - 12:00',
                'type': 'Presencial',
                'icon': 'Calendar'
            }
        ],
        'guides': [
            {
                'id': 'g1',
                'title': 'Técnica Pomodoro para Programadores',
                'description': 'Maximiza tu concentración estructurando tus sesiones de código.',
                'icon': 'Clock'
            },
            {
                'id': 'g2',
                'title': 'Guía de Higiene del Sueño',
                'description': 'Mejora tu descanso y rendimiento académico con rutinas efectivas.',
                'icon': 'Moon'
            }
        ]
    })


@app.route('/api/support', methods=['POST'])
def support():
    """Crear ticket de soporte (mock para prototipo)."""
    data = request.json
    # Simular procesamiento
    time.sleep(1)
    return jsonify({
        'status': 'success',
        'ticketId': 'TKT-1042',
        'message': 'Ticket recibido'
    })


@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    """Configuración de notificaciones (mock para prototipo)."""
    if request.method == 'GET':
        return jsonify({
            'status': 'success',
            'notifications': {
                'workshops': True,
                'pauses': False,
                'monthlyEmails': True
            }
        })
    elif request.method == 'POST':
        data = request.json
        time.sleep(0.5)
        return jsonify({
            'status': 'success',
            'message': 'Configuración actualizada'
        })


if __name__ == '__main__':
    print("Iniciando UNAYOE FISI Backend en http://0.0.0.0:5000")
    print(f"Gemini API Key: {'Configurada' if GEMINI_API_KEY else 'NO CONFIGURADA'}")
    app.run(host='0.0.0.0', port=5000, debug=False)
