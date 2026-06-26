import React, { useState } from 'react';
import { Smile, Meh, Frown, ArrowRight, ArrowLeft, Check, AlertCircle, User } from 'lucide-react';
import Sidebar from './Sidebar';

interface EvaluationFormProps {
  onNext: (data: any) => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

const SYMPTOM_OPTIONS = [
  'Dificultad para concentrarme en clases',
  'Irritabilidad o frustración frecuente',
  'Problemas para conciliar el sueño',
  'Cambios en el apetito',
  'Fatiga constante o falta de motivación',
  'Sensación de estar abrumado/a',
  'Aislamiento social',
  'Preocupación excesiva por el futuro académico',
];

const DURATION_OPTIONS = [
  'Menos de 1 semana',
  '1-2 semanas',
  '2-4 semanas',
  'Más de 1 mes',
];

export default function EvaluationForm({ onNext, onLogout, onNavigate }: EvaluationFormProps) {
  const [step, setStep] = useState(1);
  const [stressLevel, setStressLevel] = useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = useState('');
  const [energyImpact, setEnergyImpact] = useState<string>('Medio');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomDuration, setSymptomDuration] = useState('');
  const [observations, setObservations] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
    setValidationError(null);
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!stressLevel) {
          setValidationError('Selecciona tu nivel de estrés percibido.');
          return false;
        }
        if (!sleepQuality) {
          setValidationError('Indica tus horas de sueño promedio.');
          return false;
        }
        return true;
      case 2:
        if (symptoms.length === 0) {
          setValidationError('Selecciona al menos un síntoma que hayas experimentado.');
          return false;
        }
        return true;
      case 3:
        if (!symptomDuration) {
          setValidationError('Indica la duración aproximada de tus síntomas.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setValidationError(null);
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setValidationError(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (!validateStep(3)) return;

    // Recopilar datos del formulario y pasarlos al componente padre.
    // La llamada real a la API se hará en ProcessingModal.
    const data = {
      stressLevel,
      sleepQuality,
      energyImpact,
      symptoms,
      symptomDuration,
      observations,
    };

    onNext(data);
  };

  const stepLabels = ['Estado General', 'Síntomas', 'Detalles'];

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
              {stepLabels.map((label, index) => {
                const stepNum = index + 1;
                const isCompleted = step > stepNum;
                const isCurrent = step === stepNum;
                return (
                  <React.Fragment key={stepNum}>
                    {index > 0 && (
                      <div className={`h-px w-8 shrink-0 transition-colors ${isCompleted ? 'bg-blue-400' : 'bg-slate-200'}`}></div>
                    )}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        isCompleted
                          ? 'bg-blue-600 text-white'
                          : isCurrent
                            ? 'bg-blue-100 text-blue-700'
                            : 'border border-slate-200 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                      </div>
                      <span className={`font-semibold text-sm transition-colors ${
                        isCompleted || isCurrent ? 'text-blue-700' : 'text-slate-400'
                      }`}>{label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100">
                <AlertCircle className="text-rose-500 w-5 h-5 shrink-0" />
                <p className="text-xs text-rose-700 font-medium">{validationError}</p>
              </div>
            )}

            <div className="space-y-8 flex-1">
              {/* ==================== PASO 1: Estado General ==================== */}
              {step === 1 && (
                <>
                  {/* Stress Level Cards */}
                  <div>
                    <label className="font-bold text-sm text-slate-800 mb-4 block">
                      ¿Cuál es tu nivel de estrés percibido esta semana? <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        onClick={() => { setStressLevel('bajo'); setValidationError(null); }}
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
                        onClick={() => { setStressLevel('moderado'); setValidationError(null); }}
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
                        onClick={() => { setStressLevel('alto'); setValidationError(null); }}
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
                        Horas de sueño promedio <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700" 
                        id="sleep-quality" 
                        placeholder="Ej. 7" 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={sleepQuality}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          
                          if (rawValue === '') {
                            setSleepQuality('');
                            return;
                          }
                          
                          let val = parseInt(rawValue, 10);
                          
                          if (val > 24) val = 24;
                          if (val < 0) val = 0;
                          
                          setSleepQuality(val.toString());
                          setValidationError(null);
                        }}
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
                </>
              )}

              {/* ==================== PASO 2: Síntomas ==================== */}
              {step === 2 && (
                <div>
                  <label className="font-bold text-sm text-slate-800 mb-2 block">
                    ¿Cuáles de estos síntomas has experimentado recientemente? <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-6">
                    Selecciona todos los que apliquen. Esto nos ayuda a personalizar tus recomendaciones.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SYMPTOM_OPTIONS.map(symptom => (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          symptoms.includes(symptom)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-transparent bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            symptoms.includes(symptom)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-slate-300'
                          }`}>
                            {symptoms.includes(symptom) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-slate-700">{symptom}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {symptoms.length > 0 && (
                    <p className="mt-4 text-xs text-blue-600 font-medium">
                      {symptoms.length} síntoma{symptoms.length !== 1 ? 's' : ''} seleccionado{symptoms.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* ==================== PASO 3: Detalles ==================== */}
              {step === 3 && (
                <>
                  <div>
                    <label className="font-bold text-sm text-slate-800 mb-2 block">
                      ¿Hace cuánto tiempo experimentas estos síntomas? <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-4">Selecciona la duración aproximada.</p>
                    <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-1">
                      {DURATION_OPTIONS.map(duration => (
                        <button
                          key={duration}
                          onClick={() => { setSymptomDuration(duration); setValidationError(null); }}
                          className={`flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                            symptomDuration === duration
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {duration}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="font-bold text-sm text-slate-800" htmlFor="observations">Observaciones (Opcional)</label>
                    <textarea 
                      className="w-full flex-1 min-h-[120px] bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 resize-none" 
                      id="observations" 
                      placeholder="Describe cómo te has sentido, tu contexto académico, o cualquier detalle adicional..." 
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                    ></textarea>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
              <div>
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Anterior
                  </button>
                )}
              </div>
              <div>
                {step < 3 ? (
                  <button 
                    onClick={handleNext}
                    className="px-6 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                  >
                    Siguiente
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    className="px-6 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                  >
                    Enviar Evaluación
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
