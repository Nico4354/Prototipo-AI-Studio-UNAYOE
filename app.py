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

if __name__ == '__main__':
    print("Iniciando UNAYOE FISI Backend en http://localhost:5000")
    app.run(debug=True, port=5000)
