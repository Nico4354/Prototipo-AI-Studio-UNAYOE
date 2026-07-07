import React, { useState } from 'react';
import { UserPlus, Brain, AlertCircle } from 'lucide-react';
import { UserData } from '../App';

interface RegisterProps {
  onRegister: (user: UserData) => void;
  onGoToLogin: () => void;
}

export default function Register({ onRegister, onGoToLogin }: RegisterProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [programa, setPrograma] = useState('Ingeniería de Software');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: String(nombre), 
          correo: String(email), 
          password: String(password),
          programa_academico: String(programa)
        })
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        setError('Respuesta inválida del servidor.');
        setLoading(false);
        return;
      }
      
      if (data.status === 'success') {
        onRegister(data.user);
      } else {
        setError(data.message || 'Error al crear la cuenta.');
      }
    } catch (err) {
      setError('Error de conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col md:flex-row w-full min-h-screen bg-slate-50 font-sans text-slate-700">
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
          <div className="mt-8 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 border border-slate-100">
            <img 
              alt="Estudiantes colaborando" 
              className="w-full h-64 object-cover" 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" 
            />
          </div>
        </div>
      </section>

      <section className="w-full md:w-1/2 flex min-h-screen items-center justify-center bg-slate-50 p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="md:hidden flex flex-col items-center mb-8 text-center">
            <Brain className="text-blue-600 w-10 h-10 mb-3" />
            <h2 className="text-2xl font-bold text-slate-800">UNAYOE FISI</h2>
            <p className="text-sm text-slate-500">Portal de Bienestar</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Registro de Estudiante</h3>
            <p className="text-sm text-slate-500">Crea tu cuenta con tus datos universitarios</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100">
              <AlertCircle className="text-rose-600 w-5 h-5 shrink-0" />
              <p className="text-xs text-rose-700 font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-xs text-slate-700 ml-1" htmlFor="nombre">Nombre Completo</label>
              <input 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                id="nombre" type="text" placeholder="Ej. Alex Rivera" value={nombre} onChange={(e) => setNombre(e.target.value)} required 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-xs text-slate-700 ml-1" htmlFor="email">Correo Institucional</label>
              <input 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                id="email" type="email" placeholder="nombre.apellido@unmsm.edu.pe" value={email} onChange={(e) => setEmail(e.target.value)} required 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-xs text-slate-700 ml-1" htmlFor="programa">Programa Académico</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                id="programa" value={programa} onChange={(e) => setPrograma(e.target.value)} required
              >
                <option value="Ingeniería de Software">Ingeniería de Software</option>
                <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-xs text-slate-700 ml-1" htmlFor="password">Contraseña</label>
              <input 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required 
              />
            </div>

            <div className="pt-2">
              <button 
                className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-70" 
                type="submit" disabled={loading}
              >
                {loading ? 'Creando cuenta...' : 'Registrarse'}
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              ¿Ya tienes cuenta? <button type="button" onClick={onGoToLogin} className="text-blue-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer">Inicia sesión</button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
