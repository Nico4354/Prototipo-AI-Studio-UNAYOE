import React, { useState } from 'react';
import { Smile, Meh, Frown, ArrowRight, Bell, User } from 'lucide-react';
import Sidebar from './Sidebar';

interface EvaluationFormProps {
  onNext: (data: any) => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export default function EvaluationForm({ onNext, onLogout, onNavigate }: EvaluationFormProps) {
  const [stressLevel, setStressLevel] = useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = useState('');
  const [energyImpact, setEnergyImpact] = useState<string>('Medio');
  const [observations, setObservations] = useState('');

  const handleSubmit = async () => {
    // Collect data
    const data = {
      stressLevel,
      sleepQuality,
      energyImpact,
      observations
    };

    try {
      // Trying to hit the backend
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.warn("Backend not running, proceeding anyway");
    }

    onNext(data);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex text-slate-700 font-sans">
      <Sidebar currentView="evaluation" onNavigate={onNavigate} onLogout={onLogout} />
      
      <main className="ml-64 flex-1 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 flex items-center justify-between px-8">
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

        {/* Form Content */}
        <section className="p-8 flex-1 w-full max-w-5xl mx-auto flex flex-col relative z-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Evaluación de Bienestar</h2>
            <p className="text-slate-500 text-sm mt-1">Ayúdanos a entender tu carga académica y emocional actual</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 border border-slate-100 flex-1 flex flex-col">
            {/* Multi-step Indicator */}
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">1</div>
                <span className="font-semibold text-sm text-blue-700">Estado General</span>
              </div>
              <div className="h-px w-8 bg-slate-200 shrink-0"></div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-6 h-6 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs">2</div>
                <span className="font-semibold text-sm text-slate-400">Síntomas</span>
              </div>
              <div className="h-px w-8 bg-slate-200 shrink-0"></div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-6 h-6 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs">3</div>
                <span className="font-semibold text-sm text-slate-400">Detalles</span>
              </div>
            </div>

            <div className="space-y-8 flex-1">
              {/* Stress Level Cards */}
              <div>
                <label className="font-bold text-sm text-slate-800 mb-4 block">
                  ¿Cuál es tu nivel de estrés percibido esta semana?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setStressLevel('bajo')}
                    className={`bg-slate-50 p-4 rounded-xl border-2 text-left transition-all ${
                      stressLevel === 'bajo' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className={`p-2 w-fit rounded-lg mb-3 ${stressLevel === 'bajo' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Smile className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Bajo</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Controlable y manejable.</p>
                  </button>
                  
                  <button 
                    onClick={() => setStressLevel('moderado')}
                    className={`bg-slate-50 p-4 rounded-xl border-2 text-left transition-all ${
                      stressLevel === 'moderado' ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className={`p-2 w-fit rounded-lg mb-3 ${stressLevel === 'moderado' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Meh className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Moderado</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Tensión constante por entregas.</p>
                  </button>

                  <button 
                    onClick={() => setStressLevel('alto')}
                    className={`bg-slate-50 p-4 rounded-xl border-2 text-left transition-all ${
                      stressLevel === 'alto' ? 'border-rose-500 bg-rose-50' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className={`p-2 w-fit rounded-lg mb-3 ${stressLevel === 'alto' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Frown className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Alto</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Abrumador, dificulta el estudio.</p>
                  </button>
                </div>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-bold text-sm text-slate-800" htmlFor="sleep-quality">
                    Horas de sueño promedio
                  </label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700" 
                    id="sleep-quality" 
                    placeholder="Ej. 7" 
                    type="number"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-sm text-slate-800 mb-1 block">Impacto en energía</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    {['Nulo', 'Medio', 'Severo'].map(impact => (
                      <button 
                        key={impact}
                        onClick={() => setEnergyImpact(impact)}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                          energyImpact === impact 
                            ? 'bg-white text-slate-800 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {impact}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-2 flex-1 flex flex-col">
                <label className="font-bold text-sm text-slate-800" htmlFor="observations">Observaciones (Opcional)</label>
                <textarea 
                  className="w-full flex-1 min-h-[120px] bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 resize-none" 
                  id="observations" 
                  placeholder="Describe cómo te has sentido..." 
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
              <button className="px-6 py-2 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">
                Guardar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!stressLevel}
                className="px-6 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
