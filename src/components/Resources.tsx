import React, { useEffect, useState } from 'react';
import { User, Calendar, Video, BookOpen, FileText, Clock, Moon, Check } from 'lucide-react';
import Sidebar from './Sidebar';

interface ResourcesProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
  user?: { name: string; program: string } | null;
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
  content?: string;
}

export default function Resources({ onLogout, onNavigate, user }: ResourcesProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [enrolledWorkshops, setEnrolledWorkshops] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  const handleEnroll = (workshopId: string) => {
    setEnrolledWorkshops(prev => {
      const newSet = new Set(prev);
      newSet.add(workshopId);
      return newSet;
    });
    setToast({ visible: true, message: '¡Inscrito! Revisa tu correo institucional con el enlace' });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

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
            icon: 'Clock',
            content: 'La técnica Pomodoro es un método de gestión del tiempo desarrollado por Francesco Cirillo a fines de la década de 1980.\n\nSe basa en usar un temporizador para dividir el trabajo en intervalos, tradicionalmente de 25 minutos de duración, separados por breves descansos. Para los estudiantes de ingeniería y programadores, esto es especialmente útil para evitar la fatiga mental y mantener un alto nivel de concentración durante la resolución de problemas complejos o la depuración de código.\n\nIntenta aplicar 4 "pomodoros" seguidos de un descanso largo de 15 a 30 minutos. Notarás cómo tu productividad y bienestar mejoran significativamente.'
          },
          {
            id: 'g2',
            title: 'Guía de Higiene del Sueño',
            description: 'Mejora tu descanso y rendimiento académico con rutinas efectivas.',
            icon: 'Moon',
            content: 'La higiene del sueño hace referencia a una serie de hábitos y rutinas que nos ayudan a conciliar el sueño más fácilmente y a dormir profundamente, de manera que nos despertemos descansados.\n\nPara los estudiantes universitarios, es común sacrificar horas de sueño por estudiar. Sin embargo, el sueño es fundamental para la consolidación de la memoria y el aprendizaje. Evita la exposición a pantallas (luz azul) al menos una hora antes de dormir y trata de mantener un horario regular para acostarte y levantarte, incluso los fines de semana.\n\nRecuerda: una mente descansada retiene mejor la información y rinde mejor en los exámenes y evaluaciones.'
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
                <p className="text-xs font-semibold">{user?.name || 'Alex Rivera'}</p>
                <p className="text-[10px] text-slate-400 leading-none">{user?.program || 'Ingeniería de Software'}</p>
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
                    <button 
                      onClick={() => !enrolledWorkshops.has(workshop.id) && handleEnroll(workshop.id)}
                      disabled={enrolledWorkshops.has(workshop.id)}
                      className={`w-full sm:w-auto px-4 py-2 font-bold text-xs rounded-lg transition-colors shrink-0 flex items-center justify-center gap-2 ${
                        enrolledWorkshops.has(workshop.id)
                          ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed opacity-90'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {enrolledWorkshops.has(workshop.id) ? (
                        <>
                          <Check size={14} strokeWidth={3} /> ¡Inscrito!
                        </>
                      ) : (
                        'Inscribirse'
                      )}
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
                    <button onClick={() => setSelectedGuide(guide)} className="w-full sm:w-auto px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
                      Leer Guía
                    </button>
                  </div>
                ))}
              </section>

            </div>
          )}
        </div>
        {/* Toast Notification */}
        {toast.visible && (
          <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50 transition-all duration-300">
            <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded-full">
              <Check size={18} strokeWidth={3} />
            </div>
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        )}

        {/* Reading Modal */}
        {selectedGuide && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                    {getIcon(selectedGuide.icon, "w-6 h-6")}
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedGuide.title}</h2>
                </div>
                <button onClick={() => setSelectedGuide(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
                  Cerrar
                </button>
              </div>
              
              <div className="text-slate-700 leading-relaxed text-[15px] space-y-4">
                {selectedGuide.content?.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
