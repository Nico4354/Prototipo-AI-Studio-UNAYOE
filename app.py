from flask import Flask, request, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app) # Enable CORS for frontend requests

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '')
    password = data.get('password', '')
    
    # Simple mock validation
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
    data = request.json
    # Simulate processing time
    time.sleep(1)
    return jsonify({
        'status': 'success',
        'message': 'Evaluación recibida y procesada con éxito'
    })

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    return jsonify({
        'status': 'success',
        'riskLevel': 'Elevado',
        'riskDescription': 'Basado en tu última evaluación. Se detecta fatiga académica alta.',
        'suggestions': [
            {
                'title': 'Taller de Manejo de Ansiedad',
                'description': 'Aprende técnicas de respiración y mindfulness para reducir el estrés antes de exámenes.',
                'actionLink': '#',
                'actionText': 'Ver taller',
                'icon': 'User'
            },
            {
                'title': 'Técnicas de Estudio',
                'description': 'Optimiza tu tiempo con métodos probados para mejorar la retención y el enfoque.',
                'actionLink': '#',
                'actionText': 'Leer más',
                'icon': 'BookOpen'
            },
            {
                'title': 'Higiene del Sueño',
                'description': 'Consejos prácticos para regularizar tus ciclos de descanso y mejorar tu rendimiento cognitivo diario.',
                'actionLink': '#',
                'actionText': 'Ver guía completa',
                'icon': 'Moon'
            }
        ]
    })

@app.route('/api/history', methods=['GET'])
def history():
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

if __name__ == '__main__':
    print("Iniciando UNAYOE FISI Backend en http://localhost:5000")
    app.run(debug=True, port=5000)
