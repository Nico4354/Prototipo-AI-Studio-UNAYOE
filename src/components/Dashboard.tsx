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

export default function Dashboard({ onLogout, onNavigate, aiDiagnostico }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);

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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard`);
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
  }, [aiDiagnostico]);

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
                    <div className="absolute flex flex-col items-center justify-center w-full h-full">
                      <span className="text-4xl font-black text-slate-800">{data.riskLevel}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tamizaje</span>
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
