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

        <button className="w-full flex items-center gap-3 p-2 rounded-md text-slate-500 hover:bg-slate-50 transition-colors">
          <Headset className="w-4 h-4" />
          <span className="text-sm">Soporte Técnico</span>
        </button>
      </nav>

      <div className="mt-auto space-y-4">
        <div className="space-y-1 border-t border-slate-100 pt-4">
          <button className="w-full flex items-center gap-3 p-2 rounded-md text-slate-500 hover:bg-slate-50 transition-colors">
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
