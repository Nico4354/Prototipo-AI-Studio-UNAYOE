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

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/history?estudiante_id=${estudianteId || 1}`);
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
