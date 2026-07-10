import React, { useEffect, useState } from 'react';
import { User, Mail, Book, Save, Bell, RefreshCw, Key, ShieldAlert, Moon } from 'lucide-react';
import Sidebar from './Sidebar';

interface SettingsProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
  user?: { name: string; program: string } | null;
}

export default function Settings({ onLogout, onNavigate, user }: SettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [preferences, setPreferences] = useState({
    workshops: true,
    pauses: false,
    monthlyEmails: true,
  });

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      if (savedTheme) setTheme(savedTheme);
    } catch (e) {}
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

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
                <p className="text-xs font-semibold">{user?.name || 'Alex Rivera'}</p>
                <p className="text-[10px] text-slate-400 leading-none">{user?.program || 'Ingeniería de Software'}</p>
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
                      <p className="text-sm text-slate-500">{user?.name || 'Alex Rivera'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Book className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Programa</p>
                      <p className="text-sm text-slate-500">{user?.program || 'Ingeniería de Software'}</p>
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

                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5 mt-5">
                    <div className="flex items-start gap-3">
                      <Moon className="text-slate-400 w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-slate-800">Modo Oscuro / Alto Contraste</p>
                        <p className="text-xs text-slate-500">Mejora la accesibilidad visual invirtiendo los colores de fondo.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleThemeToggle}
                      className={`w-11 h-6 rounded-full shrink-0 transition-colors relative flex items-center ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute transition-all ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}></div>
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
