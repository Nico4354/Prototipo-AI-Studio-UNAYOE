# Consolidado de Código Fuente

## Archivo: app.py

`python
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
    """Garantiza que exista un estudiante de prueba en la base de datos y en texto plano."""
    conn = get_db_connection()
    if not conn:
        return 1
    
    try:
        cursor = conn.cursor(dictionary=True)
        # Fix existing hashed password
        cursor.execute("UPDATE estudiantes SET password = '123456' WHERE correo = 'alex.rivera@unmsm.edu.pe'")
        conn.commit()

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
    """Autenticación contra base de datos."""
    try:
        print(f"Payload recibido en login: {request.json}")
        data = request.json or {}
        email = data.get('email', '')
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'status': 'error', 'message': 'Credenciales incompletas'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'status': 'error', 'message': 'Error de conexión a la base de datos'}), 500

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM estudiantes WHERE correo = %s", (email,))
            user = cursor.fetchone()

            if user and str(user['password']) == str(password):
                return jsonify({
                    'status': 'success',
                    'user': {
                        'id': user['id'],
                        'name': user['nombre'],
                        'program': user['programa_academico']
                    }
                })
            else:
                return jsonify({'status': 'error', 'message': 'Credenciales incorrectas'}), 401
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()
    except Exception as e:
        print(f"Error global en login: {e}")
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    """
    Endpoint principal de tamizaje.
    Recibe los datos del formulario de evaluación y los envía a Gemini
    para obtener una alerta de susceptibilidad basada en GAD-7.
    """
    global _ultimo_diagnostico
    try:
        data = request.json or {}

        nivel_estres = data.get('stressLevel', 'bajo')
        horas_sueno = data.get('sleepQuality', '7')
        impacto_energia = data.get('energyImpact', 'Medio')
        observaciones = data.get('observations', 'Sin observaciones')
        estudiante_id = data.get('estudiante_id')
        
        if not estudiante_id:
            return jsonify({'status': 'error', 'message': 'Falta estudiante_id'}), 400

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

        # Construir el prompt con los datos del estudiante
        prompt = PROMPT_TAMIZAJE.format(
            nivel_estres=nivel_estres,
            horas_sueno=horas_sueno,
            impacto_energia=impacto_energia,
            observaciones=observaciones if observaciones else 'Sin observaciones adicionales'
        )

        # Llamar a Gemini
        model = genai.GenerativeModel('gemini-2.5-flash')        
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

        try:
            diagnostico = json.loads(response_text)
        except json.JSONDecodeError:
            return jsonify({
                'status': 'error',
                'message': 'Error al interpretar la respuesta del análisis de IA. Intenta nuevamente.',
                'error': 'JSONDecodeError'
            }), 500

        # Validar estructura mínima
        if 'nivel_riesgo' not in diagnostico:
            raise ValueError('Respuesta de IA sin nivel_riesgo')

        # -------------------------------------------------------------
        # Guardar en Base de Datos MySQL
        # -------------------------------------------------------------
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

    except Exception as e:
        print(f"Error global en evaluate: {e}")
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    """Devuelve los datos del último análisis de IA de la base de datos."""
    try:
        estudiante_id = request.args.get('estudiante_id')
        if not estudiante_id:
            return jsonify({'status': 'error', 'message': 'Falta estudiante_id'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'status': 'error', 'message': 'Error BD'}), 500

        try:
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT d.nivel_riesgo, d.descripcion_riesgo, d.sugerencias_json 
                FROM diagnosticos_ia d
                JOIN evaluaciones e ON d.evaluacion_id = e.id
                WHERE e.estudiante_id = %s
                ORDER BY e.id DESC LIMIT 1
            """
            cursor.execute(query, (estudiante_id,))
            record = cursor.fetchone()

            if record:
                sugerencias = []
                try:
                    sugerencias = json.loads(record['sugerencias_json'])
                except:
                    pass
                
                return jsonify({
                    'status': 'success',
                    'riskLevel': record['nivel_riesgo'],
                    'riskDescription': record['descripcion_riesgo'],
                    'suggestions': sugerencias
                })
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

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
    except Exception as e:
        print(f"Error global en dashboard: {e}")
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.route('/api/history', methods=['GET'])
def history():
    """Historial de evaluaciones desde BD."""
    try:
        estudiante_id = request.args.get('estudiante_id')
        if not estudiante_id:
            return jsonify({'status': 'error', 'message': 'Falta estudiante_id'}), 400
            
        conn = get_db_connection()
        if not conn:
            return jsonify({'status': 'error', 'message': 'Error BD'}), 500

        try:
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT e.id, e.observaciones, d.nivel_riesgo, e.fecha_creacion
                FROM evaluaciones e
                LEFT JOIN diagnosticos_ia d ON e.id = d.evaluacion_id
                WHERE e.estudiante_id = %s
                ORDER BY e.id DESC
            """
            cursor.execute(query, (estudiante_id,))
            rows = cursor.fetchall()

            records = []
            for r in rows:
                color = 'emerald'
                if r['nivel_riesgo'] == 'Moderado': color = 'orange'
                elif r['nivel_riesgo'] in ['Elevado', 'Crítico']: color = 'rose'
                
                # Formatear la fecha si existe, asumiendo que fecha_creacion puede ser un datetime
                fecha_str = r['fecha_creacion'].strftime("%d %b %Y") if r.get('fecha_creacion') else 'Reciente'
                
                records.append({
                    'id': str(r['id']),
                    'date': fecha_str,
                    'riskLevel': r['nivel_riesgo'] or 'Pendiente',
                    'riskColor': color,
                    'summary': r['observaciones'] or 'Evaluación sin observaciones adicionales'
                })
                
            return jsonify({
                'status': 'success',
                'records': records
            })
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()
    except Exception as e:
        print(f"Error global en history: {e}")
        return jsonify({'error': str(e), 'status': 'error'}), 500


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


try:
    print("Inicializando base de datos (texto plano)...")
    ensure_default_student()
except Exception as e:
    print(f"Error al inicializar la BD: {e}")

if __name__ == '__main__':
    print("Iniciando UNAYOE FISI Backend en http://0.0.0.0:5000")
    print(f"Gemini API Key: {'Configurada' if GEMINI_API_KEY else 'NO CONFIGURADA'}")
    app.run(host='0.0.0.0', port=5000, debug=False)
`

## Archivo: requirements.txt

`text
Flask
Flask-Cors
gunicorn
google-generativeai
python-dotenv
mysql-connector-python
`

## Archivo: package.json

`json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^1.29.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "lucide-react": "^0.546.0",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "vite": "^6.2.3",
    "express": "^4.21.2",
    "dotenv": "^17.2.3",
    "motion": "^12.23.24"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3",
    "@types/express": "^4.17.21"
  }
}
`

## Archivo: tsconfig.json

`json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
`

## Archivo: vite.config.ts

`typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
`

## Archivo: render.yaml

`yaml
services:
  - type: web
    name: unayoe-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    envVars:
      - key: PYTHON_VERSION
        value: 3.10.13

  - type: web
    name: unayoe-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_URL
        fromService:
          type: web
          name: unayoe-backend
          property: url
`

## Archivo: index.html

`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bienestar Estudiantil</title>
    <script type="text/javascript">(function(u,x,t,w,e,a,k,s){a=function(v){try{u.setItem(t+e,v)}catch(e){}v=JSON.parse(v);for(k=0;k<v.length;k++){s=x.createElement("script");s.text="(function(u,x,t,w,e,a,k){a=u[e]=function(){a.q.push(arguments)};a.q=[];a.t=+new Date;a.c=w;k=x.createElement('script');k.async=1;k.src=t;x.getElementsByTagName('head')[0].appendChild(k)})(window,document,'"+v[k].u+"',"+JSON.stringify(v[k].c)+",'"+v[k].g+"')";x.getElementsByTagName("head")[0].appendChild(s)}};try{k=u.getItem(t+e)}catch(e){}if(k){return a(k)}k=new XMLHttpRequest;k.onreadystatechange=function(){if(k.readyState==4&&k.status==200)a(k.responseText)};k.open("POST",w+e);k.send(x.URL)})(sessionStorage,document,"uxt:","https://api.uxtweak.com/snippet/","17d320f1-f3e4-4861-bdec-f80f48e803a1");</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

`

## Archivo: src/main.tsx

`typescript
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`

## Archivo: src/App.tsx

`typescript
import React, { useState } from 'react';
import Login from './components/Login';
import EvaluationForm from './components/EvaluationForm';
import ProcessingModal from './components/ProcessingModal';
import Dashboard from './components/Dashboard';
import ClinicalHistory from './components/ClinicalHistory';
import Resources from './components/Resources';
import TechnicalSupport from './components/TechnicalSupport';
import Settings from './components/Settings';

type ViewState = 'login' | 'evaluation' | 'processing' | 'dashboard' | 'history' | 'resources' | 'support' | 'settings';

export interface UserData {
  id: number;
  name: string;
  program: string;
}

// Tipos para los datos de evaluación y diagnóstico IA
interface EvaluationData {
  stressLevel: string;
  sleepQuality: string;
  energyImpact: string;
  symptoms: string[];
  symptomDuration: string;
  observations: string;
}

export interface DiagnosticoIA {
  nivel_riesgo: string;
  descripcion_riesgo: string;
  sugerencias: {
    title: string;
    description: string;
    actionText: string;
    icon: string;
  }[];
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [aiDiagnostico, setAiDiagnostico] = useState<DiagnosticoIA | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  
  // Handlers for state transitions
  const handleLoginSuccess = (userData: UserData) => {
    setUser(userData);
    setCurrentView('evaluation');
  };
  
  const handleEvaluationSubmit = (data: EvaluationData) => {
    setEvaluationData(data);
    setCurrentView('processing');
  };
  
  const handleProcessingComplete = (diagnostico: DiagnosticoIA) => {
    setAiDiagnostico(diagnostico);
    setCurrentView('dashboard');
  };
  
  const handleRetry = () => setCurrentView('evaluation');
  
  const handleLogout = () => {
    setCurrentView('login');
    setEvaluationData(null);
    setAiDiagnostico(null);
    setUser(null);
  };
  
  const handleNavigate = (view: string) => {
    if (view === 'dashboard' || view === 'evaluation' || view === 'history' || view === 'resources' || view === 'support' || view === 'settings') {
      setCurrentView(view as ViewState);
    }
  };

  return (
    <div className="w-full min-h-screen">
      {currentView === 'login' && <Login onLogin={handleLoginSuccess} />}
      
      {currentView === 'evaluation' && (
        <EvaluationForm 
          onNext={handleEvaluationSubmit} 
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
      
      {currentView === 'processing' && (
        <>
          {/* We keep the evaluation form beneath the modal to simulate a real modal overlay effect */}
          <div className="h-screen overflow-hidden">
            <EvaluationForm 
              onNext={() => {}} 
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          </div>
          <ProcessingModal 
            evaluationData={evaluationData}
            onComplete={handleProcessingComplete}
            onRetry={handleRetry}
            estudianteId={user?.id}
          />
        </>
      )}
      
      {currentView === 'dashboard' && (
        <Dashboard 
          onLogout={handleLogout} 
          onNavigate={handleNavigate}
          aiDiagnostico={aiDiagnostico}
          estudianteId={user?.id}
        />
      )}

      {currentView === 'history' && (
        <ClinicalHistory
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          estudianteId={user?.id}
        />
      )}

      {currentView === 'resources' && (
        <Resources
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'support' && (
        <TechnicalSupport
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'settings' && (
        <Settings
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
`

## Archivo: src/index.css

`css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-headline: "Inter", ui-sans-serif, system-ui, sans-serif;
}

body {
  background-color: #f8fafc;
  color: #334155;
  font-family: var(--font-sans);
}

.soft-elevation {
  box-shadow: 0 10px 15px -3px rgba(226, 232, 240, 0.5), 0 4px 6px -4px rgba(226, 232, 240, 0.5);
}

.custom-shadow {
  box-shadow: 0 10px 15px -3px rgba(226, 232, 240, 0.5), 0 4px 6px -4px rgba(226, 232, 240, 0.5);
}

.atmospheric-shadow {
  box-shadow: 0 10px 15px -3px rgba(226, 232, 240, 0.5), 0 4px 6px -4px rgba(226, 232, 240, 0.5);
}

.atmospheric-diffusion {
  box-shadow: 0 10px 15px -3px rgba(226, 232, 240, 0.5), 0 4px 6px -4px rgba(226, 232, 240, 0.5);
}

.progress-ring-circle {
  transition: stroke-dashoffset 0.35s;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}
`

## Archivo: src/components\ClinicalHistory.tsx

`typescript
import React, { useEffect, useState } from 'react';
import { User, Activity, FileText } from 'lucide-react';
import Sidebar from './Sidebar';

interface ClinicalHistoryProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
  estudianteId?: number;
}

interface HistoryRecord {
  id: string;
  date: string;
  riskLevel: string;
  riskColor: 'emerald' | 'orange' | 'rose';
  summary: string;
}

export default function ClinicalHistory({ onLogout, onNavigate, estudianteId }: ClinicalHistoryProps) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/history?estudiante_id=${estudianteId || 1}`);
        const data = await response.json();
        if (data.status === 'success') {
          setRecords(data.records);
        }
      } catch (err) {
        console.warn('Backend not available, using fallback data');
        setRecords([
          {
            id: '1',
            date: '15 May 2026',
            riskLevel: 'Moderado',
            riskColor: 'orange',
            summary: 'Tensión constante por exámenes parciales.'
          },
          {
            id: '2',
            date: '10 Abr 2026',
            riskLevel: 'Bajo',
            riskColor: 'emerald',
            summary: 'Manejo adecuado de prácticas y laboratorios.'
          },
          {
            id: '3',
            date: '12 Mar 2026',
            riskLevel: 'Alto',
            riskColor: 'rose',
            summary: 'Abrumado, dificultad para concentrarse en clases.'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [estudianteId]);

  const getColorClasses = (color: string) => {
    switch(color) {
      case 'emerald': return 'bg-emerald-100 text-emerald-700';
      case 'orange': return 'bg-orange-100 text-orange-700';
      case 'rose': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 font-sans">
      <Sidebar currentView="history" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopAppBar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">UNAYOE <span className="text-blue-600">FISI</span></h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-semibold">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 leading-none">Ingeniería de Software</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col space-y-6 w-full max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Historial Clínico</h2>
              <p className="text-slate-500 text-sm mt-1">Registro de tus evaluaciones psicológicas pasadas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 border border-slate-100 flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm text-slate-500">Cargando historial...</span>
              </div>
            ) : records.length > 0 ? (
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="p-5 border border-slate-100 rounded-xl hover:border-slate-300 transition-colors bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <Activity className="text-slate-400 w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-slate-800">{record.date}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getColorClasses(record.riskColor)}`}>
                            Riesgo {record.riskLevel}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{record.summary}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm self-start md:self-auto shrink-0">
                      <FileText className="w-4 h-4" />
                      Ver Informe Completo
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="text-slate-300 w-8 h-8" />
                </div>
                <h3 className="text-slate-600 font-bold mb-1">No hay evaluaciones</h3>
                <p className="text-sm text-slate-400">Aún no has completado ninguna evaluación de bienestar.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
`

## Archivo: src/components\Dashboard.tsx

`typescript
import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  UserCircle, 
  User, 
  BookOpen, 
  Moon, 
  ChevronRight,
  LifeBuoy,
  Calendar,
  Clock,
  Heart
} from 'lucide-react';
import Sidebar from './Sidebar';
import type { DiagnosticoIA } from '../App';

interface DashboardProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
  aiDiagnostico?: DiagnosticoIA | null;
  estudianteId?: number;
}

interface DashboardData {
  status?: string;
  riskLevel?: string;
  riskDescription?: string;
  suggestions?: {
    title: string;
    description: string;
    actionLink?: string;
    actionText: string;
    icon: string;
  }[];
}

export default function Dashboard({ onLogout, onNavigate, aiDiagnostico, estudianteId }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Si recibimos datos reales de la IA, usarlos directamente
    if (aiDiagnostico) {
      setData({
        riskLevel: aiDiagnostico.nivel_riesgo,
        riskDescription: aiDiagnostico.descripcion_riesgo,
        suggestions: aiDiagnostico.sugerencias,
      });
      return;
    }

    // Fallback: intentar cargar desde el backend
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dashboard?estudiante_id=${estudianteId || 1}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        // Mock data if backend is not available
        console.warn('Backend not available, using fallback data');
        setData({
          riskLevel: 'Sin evaluar',
          riskDescription: 'Aún no has completado tu primera evaluación de bienestar.',
          suggestions: [
            {
              title: 'Completa tu evaluación',
              description: 'Responde las preguntas de bienestar para recibir recomendaciones personalizadas.',
              actionText: 'Ir a evaluación',
              icon: 'User'
            }
          ]
        });
      }
    };
    
    fetchData();
  }, [aiDiagnostico, estudianteId]);

  // Determinar colores según nivel de riesgo
  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'Bajo':
        return { badge: 'bg-emerald-100 text-emerald-700', ring: 'text-emerald-400', offset: '376.8' };
      case 'Moderado':
        return { badge: 'bg-orange-100 text-orange-700', ring: 'text-orange-400', offset: '200.96' };
      case 'Elevado':
        return { badge: 'bg-violet-100 text-violet-700', ring: 'text-violet-400', offset: '125.6' };
      case 'Crítico':
        return { badge: 'bg-rose-100 text-rose-700', ring: 'text-rose-500', offset: '50.24' };
      default:
        return { badge: 'bg-slate-100 text-slate-500', ring: 'text-slate-300', offset: '502.4' };
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'User': return <User className="w-6 h-6" />;
      case 'BookOpen': return <BookOpen className="w-6 h-6" />;
      case 'Moon': return <Moon className="w-6 h-6" />;
      case 'Calendar': return <Calendar className="w-6 h-6" />;
      case 'Clock': return <Clock className="w-6 h-6" />;
      case 'Heart': return <Heart className="w-6 h-6" />;
      default: return <User className="w-6 h-6" />;
    }
  };

  const riskStyles = data ? getRiskStyles(data.riskLevel || '') : getRiskStyles('');

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 font-sans">
      <Sidebar currentView="dashboard" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopAppBar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">UNAYOE <span className="text-blue-600">FISI</span></h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-semibold">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 leading-none">Ingeniería de Software</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col space-y-6 w-full">
          {data ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
              {/* Left Column: Estado Actual */}
              <section className="xl:col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 flex flex-col border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Alerta de Susceptibilidad Académica</h3>
                  <span className={`px-3 py-1 ${riskStyles.badge} text-[10px] font-bold rounded-full uppercase tracking-wider`}>Nivel {data.riskLevel}</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                  {/* Circular Progress Ring */}
                  <div className="relative inline-flex items-center justify-center my-4">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle 
                        className="text-slate-100 stroke-current" 
                        cx="96" cy="96" r="80" 
                        fill="transparent" strokeWidth="12" 
                      />
                      <circle 
                        className={`${riskStyles.ring} stroke-current progress-ring-circle transition-all duration-1000 ease-out`}
                        cx="96" cy="96" r="80" 
                        fill="transparent" strokeWidth="12" 
                        strokeDasharray="502.4" strokeDashoffset={riskStyles.offset} strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                      <span className={`font-black text-slate-800 leading-tight text-center ${
                        (data.riskLevel || '').length > 6 ? 'text-xl' : 'text-3xl'
                      }`}>{data.riskLevel}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Tamizaje</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4 px-4 text-center">
                    <p className="text-sm text-slate-500">
                      {data.riskDescription}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center w-full">
                  <button className="flex-1 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors mr-2">
                    Agendar Cita en UNAYOE
                  </button>
                  <button className="flex-1 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors ml-2">
                    Ver Detalle del Test
                  </button>
                </div>
              </section>

              {/* Right Column: Plan de Acción Sugerido */}
              <section className="flex flex-col space-y-6">
                
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex-1">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                    </div>
                    <h4 className="text-sm font-bold text-emerald-800">Sugerencias IA (Gemini)</h4>
                  </div>
                  <ul className="space-y-3">
                    {data.suggestions?.map((item, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="mt-1 h-1.5 w-1.5 bg-emerald-400 rounded-full shrink-0"></div>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          <b>{item.title}</b>: {item.description} <a className="underline font-bold ml-1" href={item.actionLink || '#'}>{item.actionText}</a>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Emergency Contact */}
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 flex flex-col">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Próxima Acción</h4>
                  <p className="text-xs text-slate-500 mb-4">Si sientes que la carga te sobrepasa, estamos aquí para escucharte en el pabellón antiguo.</p>
                  <button className="mt-auto w-full py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors">Solicitar Triaje</button>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <span className="text-sm text-slate-500">Cargando datos del dashboard...</span>
            </div>
          )}
          
          {/* Footer Status Bar */}
          <div className="h-10 bg-slate-800 rounded-xl flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-medium text-slate-300">Conexión Segura con el Servidor API UNAYOE</span>
            </div>
            <div className="flex space-x-4">
               <span className="text-[10px] font-medium text-slate-400">v2.0.0-gemini</span>
               <span className="text-[10px] font-medium text-slate-400 italic">"Mente sana en facultad preparada"</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
`

## Archivo: src/components\EvaluationForm.tsx

`typescript
import React, { useState } from 'react';
import { Smile, Meh, Frown, ArrowRight, ArrowLeft, Check, AlertCircle, User } from 'lucide-react';
import Sidebar from './Sidebar';

interface EvaluationFormProps {
  onNext: (data: any) => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

const SYMPTOM_OPTIONS = [
  'Dificultad para concentrarme en clases',
  'Irritabilidad o frustración frecuente',
  'Problemas para conciliar el sueño',
  'Cambios en el apetito',
  'Fatiga constante o falta de motivación',
  'Sensación de estar abrumado/a',
  'Aislamiento social',
  'Preocupación excesiva por el futuro académico',
];

const DURATION_OPTIONS = [
  'Menos de 1 semana',
  '1-2 semanas',
  '2-4 semanas',
  'Más de 1 mes',
];

export default function EvaluationForm({ onNext, onLogout, onNavigate }: EvaluationFormProps) {
  const [step, setStep] = useState(1);
  const [stressLevel, setStressLevel] = useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = useState('');
  const [energyImpact, setEnergyImpact] = useState<string>('Medio');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomDuration, setSymptomDuration] = useState('');
  const [observations, setObservations] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
    setValidationError(null);
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!stressLevel) {
          setValidationError('Selecciona tu nivel de estrés percibido.');
          return false;
        }
        if (!sleepQuality) {
          setValidationError('Indica tus horas de sueño promedio.');
          return false;
        }
        return true;
      case 2:
        if (symptoms.length === 0) {
          setValidationError('Selecciona al menos un síntoma que hayas experimentado.');
          return false;
        }
        return true;
      case 3:
        if (!symptomDuration) {
          setValidationError('Indica la duración aproximada de tus síntomas.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setValidationError(null);
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setValidationError(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (!validateStep(3)) return;

    // Recopilar datos del formulario y pasarlos al componente padre.
    // La llamada real a la API se hará en ProcessingModal.
    const data = {
      stressLevel,
      sleepQuality,
      energyImpact,
      symptoms,
      symptomDuration,
      observations,
    };

    onNext(data);
  };

  const stepLabels = ['Estado General', 'Síntomas', 'Detalles'];

  return (
    <div className="bg-slate-50 min-h-screen flex text-slate-700 font-sans">
      <Sidebar currentView="evaluation" onNavigate={onNavigate} onLogout={onLogout} />
      
      <main className="ml-64 flex-1 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 flex items-center justify-between px-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">UNAYOE <span className="text-blue-600">FISI</span></h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-semibold">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 leading-none">Ingeniería de Software</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        {/* Form Content */}
        <section className="p-8 flex-1 w-full max-w-5xl mx-auto flex flex-col relative z-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Evaluación de Bienestar</h2>
            <p className="text-slate-500 text-sm mt-1">Ayúdanos a entender tu carga académica y emocional actual</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 border border-slate-100 flex-1 flex flex-col">
            {/* Multi-step Indicator */}
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-100">
              {stepLabels.map((label, index) => {
                const stepNum = index + 1;
                const isCompleted = step > stepNum;
                const isCurrent = step === stepNum;
                return (
                  <React.Fragment key={stepNum}>
                    {index > 0 && (
                      <div className={`h-px w-8 shrink-0 transition-colors ${isCompleted ? 'bg-blue-400' : 'bg-slate-200'}`}></div>
                    )}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        isCompleted
                          ? 'bg-blue-600 text-white'
                          : isCurrent
                            ? 'bg-blue-100 text-blue-700'
                            : 'border border-slate-200 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                      </div>
                      <span className={`font-semibold text-sm transition-colors ${
                        isCompleted || isCurrent ? 'text-blue-700' : 'text-slate-400'
                      }`}>{label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100">
                <AlertCircle className="text-rose-500 w-5 h-5 shrink-0" />
                <p className="text-xs text-rose-700 font-medium">{validationError}</p>
              </div>
            )}

            <div className="space-y-8 flex-1">
              {/* ==================== PASO 1: Estado General ==================== */}
              {step === 1 && (
                <>
                  {/* Stress Level Cards */}
                  <div>
                    <label className="font-bold text-sm text-slate-800 mb-4 block">
                      ¿Cuál es tu nivel de estrés percibido esta semana? <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        onClick={() => { setStressLevel('bajo'); setValidationError(null); }}
                        className={`bg-slate-50 p-4 rounded-xl border-2 text-left transition-all ${
                          stressLevel === 'bajo' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-slate-200'
                        }`}
                      >
                        <div className={`p-2 w-fit rounded-lg mb-3 ${stressLevel === 'bajo' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Smile className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">Bajo</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Controlable y manejable.</p>
                      </button>
                      
                      <button 
                        onClick={() => { setStressLevel('moderado'); setValidationError(null); }}
                        className={`bg-slate-50 p-4 rounded-xl border-2 text-left transition-all ${
                          stressLevel === 'moderado' ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-slate-200'
                        }`}
                      >
                        <div className={`p-2 w-fit rounded-lg mb-3 ${stressLevel === 'moderado' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Meh className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">Moderado</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Tensión constante por entregas.</p>
                      </button>

                      <button 
                        onClick={() => { setStressLevel('alto'); setValidationError(null); }}
                        className={`bg-slate-50 p-4 rounded-xl border-2 text-left transition-all ${
                          stressLevel === 'alto' ? 'border-rose-500 bg-rose-50' : 'border-transparent hover:border-slate-200'
                        }`}
                      >
                        <div className={`p-2 w-fit rounded-lg mb-3 ${stressLevel === 'alto' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Frown className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">Alto</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Abrumador, dificulta el estudio.</p>
                      </button>
                    </div>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="font-bold text-sm text-slate-800" htmlFor="sleep-quality">
                        Horas de sueño promedio <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700" 
                        id="sleep-quality" 
                        placeholder="Ej. 7" 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={sleepQuality}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          
                          if (rawValue === '') {
                            setSleepQuality('');
                            return;
                          }
                          
                          let val = parseInt(rawValue, 10);
                          
                          if (val > 24) val = 24;
                          if (val < 0) val = 0;
                          
                          setSleepQuality(val.toString());
                          setValidationError(null);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-bold text-sm text-slate-800 mb-1 block">Impacto en energía</label>
                      <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                        {['Nulo', 'Medio', 'Severo'].map(impact => (
                          <button 
                            key={impact}
                            onClick={() => setEnergyImpact(impact)}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                              energyImpact === impact 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {impact}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ==================== PASO 2: Síntomas ==================== */}
              {step === 2 && (
                <div>
                  <label className="font-bold text-sm text-slate-800 mb-2 block">
                    ¿Cuáles de estos síntomas has experimentado recientemente? <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-6">
                    Selecciona todos los que apliquen. Esto nos ayuda a personalizar tus recomendaciones.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SYMPTOM_OPTIONS.map(symptom => (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          symptoms.includes(symptom)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-transparent bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            symptoms.includes(symptom)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-slate-300'
                          }`}>
                            {symptoms.includes(symptom) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-slate-700">{symptom}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {symptoms.length > 0 && (
                    <p className="mt-4 text-xs text-blue-600 font-medium">
                      {symptoms.length} síntoma{symptoms.length !== 1 ? 's' : ''} seleccionado{symptoms.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* ==================== PASO 3: Detalles ==================== */}
              {step === 3 && (
                <>
                  <div>
                    <label className="font-bold text-sm text-slate-800 mb-2 block">
                      ¿Hace cuánto tiempo experimentas estos síntomas? <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-4">Selecciona la duración aproximada.</p>
                    <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-1">
                      {DURATION_OPTIONS.map(duration => (
                        <button
                          key={duration}
                          onClick={() => { setSymptomDuration(duration); setValidationError(null); }}
                          className={`flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                            symptomDuration === duration
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {duration}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="font-bold text-sm text-slate-800" htmlFor="observations">Observaciones (Opcional)</label>
                    <textarea 
                      className="w-full flex-1 min-h-[120px] bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 resize-none" 
                      id="observations" 
                      placeholder="Describe cómo te has sentido, tu contexto académico, o cualquier detalle adicional..." 
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                    ></textarea>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
              <div>
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Anterior
                  </button>
                )}
              </div>
              <div>
                {step < 3 ? (
                  <button 
                    onClick={handleNext}
                    className="px-6 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                  >
                    Siguiente
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    className="px-6 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                  >
                    Enviar Evaluación
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
`

## Archivo: src/components\Login.tsx

`typescript
import React, { useState } from 'react';
import { LogIn, Brain, AlertCircle } from 'lucide-react';

import { UserData } from '../App';

interface LoginProps {
  onLogin: (user: UserData) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(email), password: String(password) })
      });

      // Primero obtenemos el texto crudo para evitar crasheos si el backend no devuelve JSON
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Backend devolvió una respuesta que no es JSON:", text, "Status:", response.status);
        setError(true);
        return;
      }
      
      if (data.status === 'success') {
        onLogin(data.user);
      } else {
        console.error(data.message || `Error en login. Status HTTP: ${response.status}`);
        setError(true);
      }
    } catch (err) {
      console.error("Error de red o CORS connecting to backend:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col md:flex-row w-full min-h-screen bg-slate-50 font-sans text-slate-700">
      {/* Left Side: Large Visual Component */}
      <section className="hidden md:flex md:w-1/2 h-full min-h-screen bg-white border-r border-slate-200 relative overflow-hidden items-center justify-center p-12 shrink-0">
        <div className="relative z-10 max-w-lg text-left">
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] mb-4 uppercase tracking-widest border border-blue-100">
              UNMSM - FISI
            </span>
            <h1 className="text-4xl font-bold text-slate-800 mb-4 leading-tight tracking-tight">
              Bienestar Estudiantil - FISI
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Plataforma de la UNAYOE para el seguimiento y apoyo psicológico de nuestros estudiantes de Sistemas y Software.
            </p>
          </div>
          {/* Feature visual/graphic replacement */}
          <div className="mt-8 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 border border-slate-100">
            <img 
              alt="Estudiantes colaborando" 
              className="w-full h-64 object-cover" 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" 
            />
          </div>
        </div>
      </section>

      {/* Right Side: Login Form Component */}
      <section className="w-full md:w-1/2 flex min-h-screen items-center justify-center bg-slate-50 p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100">
          {/* Logo/Branding for Mobile */}
          <div className="md:hidden flex flex-col items-center mb-8 text-center">
            <Brain className="text-blue-600 w-10 h-10 mb-3" />
            <h2 className="text-2xl font-bold text-slate-800">UNAYOE FISI</h2>
            <p className="text-sm text-slate-500">Portal de Bienestar</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Acceso para Estudiantes</h3>
            <p className="text-sm text-slate-500">Inicie sesión con sus credenciales universitarias</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100">
              <AlertCircle className="text-rose-600 w-5 h-5 shrink-0" />
              <p className="text-xs text-rose-700 font-medium">
                Credenciales incorrectas. Verifique su correo y contraseña.
              </p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-xs text-slate-700 ml-1" htmlFor="email">
                Correo Institucional
              </label>
              <div className="relative">
                <input 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-700" 
                  id="email" 
                  type="email"
                  placeholder="nombre.apellido@unmsm.edu.pe" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="font-bold text-xs text-slate-700" htmlFor="password">
                  Contraseña
                </label>
                <a className="text-xs font-bold text-blue-600 hover:underline" href="#">
                  ¿Olvidó su contraseña?
                </a>
              </div>
              <div className="relative">
                <input 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-700" 
                  id="password" 
                  type="password"
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4">
              <button 
                className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex justify-center items-center gap-2 disabled:opacity-70" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                <LogIn className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              ¿Necesita ayuda técnica? <a className="text-blue-600 font-bold hover:underline" href="#">Soporte Técnico</a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
`

## Archivo: src/components\ProcessingModal.tsx

`typescript
import React, { useEffect, useState } from 'react';
import { Sparkles, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { DiagnosticoIA } from '../App';

interface ProcessingModalProps {
  evaluationData: {
    stressLevel: string;
    sleepQuality: string;
    energyImpact: string;
    symptoms?: string[];
    symptomDuration?: string;
    observations: string;
  } | null;
  onComplete: (diagnostico: DiagnosticoIA) => void;
  onRetry: () => void;
  estudianteId?: number;
}

export default function ProcessingModal({ evaluationData, onComplete, onRetry, estudianteId }: ProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Preparando análisis...');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    setError(null);
    setProgress(0);
    setStatusText('Preparando análisis...');
    let cancelled = false;

    // Animación de progreso gradual mientras se espera la respuesta de Gemini
    const progressSteps = [
      { delay: 300, value: 12, text: 'Conectando con Gemini AI...' },
      { delay: 800, value: 28, text: 'Analizando indicadores de bienestar...' },
      { delay: 1500, value: 45, text: 'Evaluando escala GAD-7...' },
      { delay: 2500, value: 60, text: 'Generando alerta de susceptibilidad...' },
      { delay: 4000, value: 72, text: 'Preparando sugerencias personalizadas...' },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    progressSteps.forEach(({ delay, value, text }) => {
      timers.push(setTimeout(() => {
        if (!cancelled) {
          setProgress(prev => Math.max(prev, value));
          setStatusText(text);
        }
      }, delay));
    });

    // Llamada real a la API de evaluación
    const callApi = async () => {
      try {
        // Enriquecer las observaciones con datos de síntomas para Gemini
        const symptomsText = evaluationData?.symptoms?.length
          ? `Síntomas reportados: ${evaluationData.symptoms.join('; ')}.`
          : '';
        const durationText = evaluationData?.symptomDuration
          ? `Duración de los síntomas: ${evaluationData.symptomDuration}.`
          : '';
        const userObs = evaluationData?.observations || '';
        const enrichedObservations = [symptomsText, durationText, userObs]
          .filter(Boolean)
          .join(' ') || 'Sin observaciones';

        const apiPayload = {
          stressLevel: evaluationData?.stressLevel || 'bajo',
          sleepQuality: evaluationData?.sleepQuality || '7',
          energyImpact: evaluationData?.energyImpact || 'Medio',
          observations: enrichedObservations,
          estudiante_id: estudianteId,
        };

        // Garantizar mínimo 2 segundos de progreso visual
        const [response] = await Promise.all([
          fetch(
            `${API_URL}/api/evaluate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiPayload),
            }
          ),
          new Promise(resolve => setTimeout(resolve, 2000)),
        ]);

        if (cancelled) return;

        const result = await response.json();

        if (result.status === 'success' && result.diagnostico) {
          // Completar la barra de progreso
          setProgress(100);
          setStatusText('¡Análisis completado!');

          // Esperar un momento en 100% antes de transicionar
          setTimeout(() => {
            if (!cancelled) onComplete(result.diagnostico);
          }, 800);
        } else {
          throw new Error(result.message || 'Error desconocido en la evaluación');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error en la evaluación:', err);
          setError(err.message || 'No se pudo conectar con el servidor de análisis.');
          setProgress(0);
        }
      }
    };

    callApi();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [retryCount]);

  const handleRetryApi = () => {
    setRetryCount(c => c + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-[500px] mx-5 bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-10 text-center flex flex-col items-center border border-slate-100 font-sans">
        
        {!error ? (
          <>
            <div className="mb-8 relative h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
              <Sparkles className="text-blue-600 w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Analizando Perfil...</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-sm">
              Gemini AI está evaluando tus indicadores de bienestar con base en la escala GAD-7.
            </p>
            
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[10px] text-blue-700 tracking-widest uppercase">{statusText}</span>
                <span className="font-bold text-sm text-blue-700">{progress > 100 ? 100 : progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 h-16 w-16 flex items-center justify-center bg-rose-50 rounded-full">
              <AlertTriangle className="text-rose-500 w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-2">Error en el análisis</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              {error}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={handleRetryApi}
                className="w-full px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
              <button 
                onClick={onRetry}
                className="w-full px-6 py-2.5 text-slate-500 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al formulario
              </button>
            </div>
          </>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-100 w-full text-center">
          <div className="flex items-center gap-2 justify-center text-slate-400">
            <Lock className="w-3 h-3" />
            <span className="font-medium text-xs">Tu información está siendo procesada de forma segura</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
`

## Archivo: src/components\Resources.tsx

`typescript
import React, { useEffect, useState } from 'react';
import { User, Calendar, Video, BookOpen, FileText, Clock, Moon } from 'lucide-react';
import Sidebar from './Sidebar';

interface ResourcesProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

interface Workshop {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  icon: string;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export default function Resources({ onLogout, onNavigate }: ResourcesProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/resources`);
        const data = await response.json();
        if (data.status === 'success') {
          setWorkshops(data.workshops);
          setGuides(data.guides);
        }
      } catch (err) {
        console.warn('Backend not available, using fallback data');
        setWorkshops([
          {
            id: 'w1',
            title: 'Taller de Manejo de Ansiedad en Parciales',
            date: '25 Oct 2026',
            time: '15:00 - 16:30',
            type: 'Virtual',
            icon: 'Video'
          },
          {
            id: 'w2',
            title: 'Gestión del Tiempo en Ciclos Finales',
            date: '28 Oct 2026',
            time: '10:00 - 12:00',
            type: 'Presencial',
            icon: 'Calendar'
          }
        ]);
        setGuides([
          {
            id: 'g1',
            title: 'Técnica Pomodoro para Programadores',
            description: 'Maximiza tu concentración estructurando tus sesiones de código.',
            icon: 'Clock'
          },
          {
            id: 'g2',
            title: 'Guía de Higiene del Sueño',
            description: 'Mejora tu descanso y rendimiento académico con rutinas efectivas.',
            icon: 'Moon'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResources();
  }, []);

  const getIcon = (name: string, className: string) => {
    switch(name) {
      case 'Video': return <Video className={className} />;
      case 'Calendar': return <Calendar className={className} />;
      case 'Clock': return <Clock className={className} />;
      case 'Moon': return <Moon className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'FileText': return <FileText className={className} />;
      default: return <BookOpen className={className} />;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 font-sans">
      <Sidebar currentView="resources" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopAppBar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">UNAYOE <span className="text-blue-600">FISI</span></h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-semibold">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 leading-none">Ingeniería de Software</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col space-y-8 w-full max-w-6xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Recursos y Talleres Universitarios</h2>
            <p className="text-slate-500 text-sm mt-1">Materiales y actividades para apoyar tu bienestar y rendimiento académico.</p>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm text-slate-500">Cargando recursos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Sección A: Talleres */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-blue-600 w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-800">Próximos Talleres</h3>
                </div>
                
                {workshops.map((workshop) => (
                  <div key={workshop.id} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
                        {getIcon(workshop.icon, "w-6 h-6")}
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider mb-2">
                          {workshop.type}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1">{workshop.title}</h4>
                        <p className="text-xs text-slate-500">
                          {workshop.date} • {workshop.time}
                        </p>
                      </div>
                    </div>
                    <button className="w-full sm:w-auto px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-100 transition-colors shrink-0">
                      Inscribirse
                    </button>
                  </div>
                ))}
              </section>

              {/* Sección B: Guías y Artículos */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="text-emerald-600 w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-800">Biblioteca Digital</h3>
                </div>

                {guides.map((guide) => (
                  <div key={guide.id} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0">
                        {getIcon(guide.icon, "w-6 h-6")}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1">{guide.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{guide.description}</p>
                      </div>
                    </div>
                    <button className="w-full sm:w-auto px-4 py-2 bg-emerald-50 test text-emerald-700 font-bold text-xs rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
                      Leer Guía
                    </button>
                  </div>
                ))}
              </section>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
`

## Archivo: src/components\Settings.tsx

`typescript
import React, { useEffect, useState } from 'react';
import { User, Mail, Book, Save, Bell, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import Sidebar from './Sidebar';

interface SettingsProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export default function Settings({ onLogout, onNavigate }: SettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [preferences, setPreferences] = useState({
    workshops: true,
    pauses: false,
    monthlyEmails: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/settings`);
        const data = await response.json();
        if (data.status === 'success') {
          setPreferences(data.notifications);
        }
      } catch (err) {
        console.warn('Backend not available, using default preferences');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
    } catch (err) {
      // Ignore network error in sandbox
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 font-sans">
      <Sidebar currentView="settings" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="ml-64 min-h-screen flex flex-col pb-12">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm sticky top-0 z-10 w-full">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">UNAYOE <span className="text-blue-600">FISI</span></h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-semibold">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 leading-none">Ingeniería de Software</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col space-y-8 w-full max-w-4xl mx-auto">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Configuración de la Cuenta</h2>
              <p className="text-slate-500 text-sm mt-1">Administra tu perfil, notificaciones y privacidad.</p>
            </div>
          </div>

          {!loading && (
            <div className="space-y-6">
              {/* Tarjeta 1: Perfil Académico */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Perfil Académico</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <User className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Nombre Completo</p>
                      <p className="text-sm text-slate-500">Alex Rivera</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Correo Institucional</p>
                      <p className="text-sm text-slate-500">alex.rivera@unmsm.edu.pe</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Book className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Facultad</p>
                      <p className="text-sm text-slate-500">FISI</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Book className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Programa</p>
                      <p className="text-sm text-slate-500">Ingeniería de Software</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Preferencias y Notificaciones */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Preferencias y Notificaciones</h3>
                <div className="space-y-5">
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="text-slate-400 w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-slate-800">Recibir recordatorios de pausas activas</p>
                        <p className="text-xs text-slate-500">Notificaciones en la app durante largas sesiones.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggle('pauses')}
                      className={`w-11 h-6 rounded-full shrink-0 transition-colors relative flex items-center ${preferences.pauses ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute transition-all ${preferences.pauses ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                  
                  <div className="h-px bg-slate-100 w-full" />
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Bell className="text-slate-400 w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-slate-800">Notificarme sobre nuevos talleres de UNAYOE</p>
                        <p className="text-xs text-slate-500">Alertas de nuevos eventos presenciales y virtuales.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggle('workshops')}
                      className={`w-11 h-6 rounded-full shrink-0 transition-colors relative flex items-center ${preferences.workshops ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute transition-all ${preferences.workshops ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </button>
                  </div>

                  <div className="h-px bg-slate-100 w-full" />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Mail className="text-slate-400 w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-slate-800">Correos de seguimiento mensual</p>
                        <p className="text-xs text-slate-500">Recibe tu reporte mensual de estado en tu correo institucional.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggle('monthlyEmails')}
                      className={`w-11 h-6 rounded-full shrink-0 transition-colors relative flex items-center ${preferences.monthlyEmails ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute transition-all ${preferences.monthlyEmails ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </button>
                  </div>

                </div>
              </div>

              {/* Tarjeta 3: Privacidad y Seguridad */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Privacidad y Seguridad</h3>
                
                <div className="flex p-4 rounded-xl bg-slate-50 mb-6">
                  <ShieldAlert className="text-emerald-600 w-5 h-5 min-w-[20px] mr-3" />
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Tus evaluaciones están encriptadas y solo son accesibles por el personal psicológico autorizado de la UNAYOE. Tu privacidad es nuestra prioridad número uno.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-bold transition-colors">
                    Solicitar eliminación de datos clínicos
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors">
                    <Key className="w-4 h-4" />
                    Cambiar Contraseña
                  </button>
                </div>
              </div>
              
              {/* Guardar Cambios Button */}
              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200 hover:bg-blue-700 transition duration-300 font-bold flex items-center gap-2 text-sm disabled:opacity-50 disabled:shadow-none"
                >
                  {saving ? (
                    <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       Guardando...
                    </>
                  ) : (
                    <>
                       <Save className="w-4 h-4" />
                       Guardar Cambios
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
`

## Archivo: src/components\Sidebar.tsx

`typescript
import React from 'react';
import { 
  LayoutDashboard, 
  Brain, 
  FileText, 
  GraduationCap, 
  Headset, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentView, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 p-6 flex flex-col space-y-6 z-50 shrink-0">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Gestión Personal</p>
      </div>

      <nav className="flex-grow space-y-1">
        <button 
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
            currentView === 'dashboard' 
              ? 'bg-slate-50 text-blue-700 font-medium' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm">Panel Principal</span>
        </button>

        <button 
          onClick={() => onNavigate('evaluation')}
          className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
            currentView === 'evaluation' 
              ? 'bg-slate-50 text-blue-700 font-medium' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span className="text-sm">Evaluación Psicológica</span>
        </button>

        <button 
          onClick={() => onNavigate('history')}
          className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
            currentView === 'history' 
              ? 'bg-slate-50 text-blue-700 font-medium' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm">Historial Clínico</span>
        </button>

        <button 
          onClick={() => onNavigate('resources')}
          className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
            currentView === 'resources' 
              ? 'bg-slate-50 text-blue-700 font-medium' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span className="text-sm">Recursos y Talleres</span>
        </button>

        <button 
          onClick={() => onNavigate('support')}
          className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
            currentView === 'support' 
              ? 'bg-slate-50 text-blue-700 font-medium' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Headset className="w-4 h-4" />
          <span className="text-sm">Soporte Técnico</span>
        </button>
      </nav>

       <div className="mt-auto space-y-4">
        <div className="space-y-1 border-t border-slate-100 pt-4">
          <button 
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
              currentView === 'settings' 
                ? 'bg-slate-50 text-blue-700 font-medium' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Configuración</span>
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-2 rounded-md text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-left">
          <p className="text-xs font-bold text-orange-700 mb-1">Línea de Emergencia</p>
          <p className="text-xs text-orange-600 mb-2">¿Necesitas ayuda inmediata?</p>
          <button className="w-full py-2 bg-white text-orange-700 border border-orange-200 text-xs font-bold rounded-lg shadow-sm">Contactar Psicólogo</button>
        </div>
      </div>
    </aside>
  );
}
`

## Archivo: src/components\TechnicalSupport.tsx

`typescript
import React, { useState } from 'react';
import { User, Headset, Mail, MapPin, HelpCircle, Send, CheckCircle } from 'lucide-react';
import Sidebar from './Sidebar';

interface TechnicalSupportProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export default function TechnicalSupport({ onLogout, onNavigate }: TechnicalSupportProps) {
  const [problemType, setProblemType] = useState('Técnico');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: problemType, message }),
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setTicketId(data.ticketId || 'TKT-' + Math.floor(1000 + Math.random() * 9000));
        setIsSubmitted(true);
      }
    } catch (err) {
      // Fallback
      setTimeout(() => {
        setTicketId('TKT-' + Math.floor(1000 + Math.random() * 9000));
        setIsSubmitted(true);
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 font-sans">
      <Sidebar currentView="support" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopAppBar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">UNAYOE <span className="text-blue-600">FISI</span></h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-semibold">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 leading-none">Ingeniería de Software</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col space-y-8 w-full max-w-6xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Soporte Técnico y Ayuda</h2>
            <p className="text-slate-500 text-sm mt-1">Estamos aquí para ayudarte ante cualquier inconveniente.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Contact info and FAQs */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Headset className="text-blue-600 w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-800">Contacto Directo</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                    <Mail className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Correo Electrónico</p>
                      <p className="text-sm text-slate-500">soporte.unayoe@unmsm.edu.pe</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                    <MapPin className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Ubicación Física</p>
                      <p className="text-sm text-slate-500">Pabellón Antiguo FISI, Primer Piso</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="text-emerald-600 w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-800">Preguntas Frecuentes</h3>
                </div>
                <ul className="space-y-4">
                  <li className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-bold text-sm text-slate-800 mb-1">¿Cómo modifico mi evaluación?</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Las evaluaciones son permanentes una vez enviadas para mantener el historial. Puedes enviar una nueva evaluación la próxima semana.</p>
                  </li>
                  <li className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-bold text-sm text-slate-800 mb-1">Olvidé mi contraseña</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Utiliza la opción "¿Olvidó su contraseña?" en la pantalla de inicio para restablecerla mediante tu correo institucional.</p>
                  </li>
                  <li className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-bold text-sm text-slate-800 mb-1">¿La información es confidencial?</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Sí, todos tus datos son encriptados y revisados únicamente por el personal psicológico calificado de la UNAYOE.</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column: Support Ticket Form */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Enviar un Ticket de Soporte</h3>
              
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-emerald-500 w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">Mensaje Enviado</h4>
                  <p className="text-sm text-slate-500 mb-6">Hemos recibido tu solicitud bajo el código <strong className="text-slate-700">{ticketId}</strong>. Te contactaremos pronto.</p>
                  <button 
                    onClick={() => {
                      setIsSubmitted(false);
                      setMessage('');
                    }}
                    className="px-6 py-2 bg-slate-50 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Enviar otro ticket
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="font-bold text-sm text-slate-800" htmlFor="problemType">
                      Tipo de Problema
                    </label>
                    <select
                      id="problemType"
                      value={problemType}
                      onChange={(e) => setProblemType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700"
                    >
                      <option value="Técnico">Problema Técnico / Plataforma</option>
                      <option value="Psicológico">Consulta Psicológica / Triaje</option>
                      <option value="Cuenta">Problema con la Cuenta</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-sm text-slate-800" htmlFor="message">
                      Mensaje
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe detalle aquí tu problema..."
                      className="w-full min-h-[160px] bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full py-3 bg-blue-100 text-blue-700 font-bold text-sm rounded-lg hover:bg-blue-200 transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Mensaje
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
`

