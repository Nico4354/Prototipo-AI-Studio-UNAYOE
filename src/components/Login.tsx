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
