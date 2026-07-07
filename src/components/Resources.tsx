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
                    <button onClick={() => alert('Funcionalidad en desarrollo para el prototipo. ¡Próximamente!')} className="w-full sm:w-auto px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-100 transition-colors shrink-0">
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
                    <button onClick={() => alert('Funcionalidad en desarrollo para el prototipo. ¡Próximamente!')} className="w-full sm:w-auto px-4 py-2 bg-emerald-50 test text-emerald-700 font-bold text-xs rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
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
