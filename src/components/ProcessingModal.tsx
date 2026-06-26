import React, { useEffect, useState } from 'react';
import { Sparkles, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { DiagnosticoIA } from '../App';

interface ProcessingModalProps {
  evaluationData: {
    stressLevel: string;
    sleepQuality: string;
    energyImpact: string;
    symptoms?: string[];
    symptomDuration?: string;
    observations: string;
  } | null;
  onComplete: (diagnostico: DiagnosticoIA) => void;
  onRetry: () => void;
  estudianteId?: number;
}

export default function ProcessingModal({ evaluationData, onComplete, onRetry, estudianteId }: ProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Preparando análisis...');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(null);
    setProgress(0);
    setStatusText('Preparando análisis...');
    let cancelled = false;

    // Animación de progreso gradual mientras se espera la respuesta de Gemini
    const progressSteps = [
      { delay: 300, value: 12, text: 'Conectando con Gemini AI...' },
      { delay: 800, value: 28, text: 'Analizando indicadores de bienestar...' },
      { delay: 1500, value: 45, text: 'Evaluando escala GAD-7...' },
      { delay: 2500, value: 60, text: 'Generando alerta de susceptibilidad...' },
      { delay: 4000, value: 72, text: 'Preparando sugerencias personalizadas...' },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    progressSteps.forEach(({ delay, value, text }) => {
      timers.push(setTimeout(() => {
        if (!cancelled) {
          setProgress(prev => Math.max(prev, value));
          setStatusText(text);
        }
      }, delay));
    });

    // Llamada real a la API de evaluación
    const callApi = async () => {
      try {
        // Enriquecer las observaciones con datos de síntomas para Gemini
        const symptomsText = evaluationData?.symptoms?.length
          ? `Síntomas reportados: ${evaluationData.symptoms.join('; ')}.`
          : '';
        const durationText = evaluationData?.symptomDuration
          ? `Duración de los síntomas: ${evaluationData.symptomDuration}.`
          : '';
        const userObs = evaluationData?.observations || '';
        const enrichedObservations = [symptomsText, durationText, userObs]
          .filter(Boolean)
          .join(' ') || 'Sin observaciones';

        const apiPayload = {
          stressLevel: evaluationData?.stressLevel || 'bajo',
          sleepQuality: evaluationData?.sleepQuality || '7',
          energyImpact: evaluationData?.energyImpact || 'Medio',
          observations: enrichedObservations,
          estudiante_id: estudianteId,
        };

        // Garantizar mínimo 2 segundos de progreso visual
        const [response] = await Promise.all([
          fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/evaluate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiPayload),
            }
          ),
          new Promise(resolve => setTimeout(resolve, 2000)),
        ]);

        if (cancelled) return;

        const result = await response.json();

        if (result.status === 'success' && result.diagnostico) {
          // Completar la barra de progreso
          setProgress(100);
          setStatusText('¡Análisis completado!');

          // Esperar un momento en 100% antes de transicionar
          setTimeout(() => {
            if (!cancelled) onComplete(result.diagnostico);
          }, 800);
        } else {
          throw new Error(result.message || 'Error desconocido en la evaluación');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error en la evaluación:', err);
          setError(err.message || 'No se pudo conectar con el servidor de análisis.');
          setProgress(0);
        }
      }
    };

    callApi();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [retryCount]);

  const handleRetryApi = () => {
    setRetryCount(c => c + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-[500px] mx-5 bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-10 text-center flex flex-col items-center border border-slate-100 font-sans">
        
        {!error ? (
          <>
            <div className="mb-8 relative h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
              <Sparkles className="text-blue-600 w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Analizando Perfil...</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-sm">
              Gemini AI está evaluando tus indicadores de bienestar con base en la escala GAD-7.
            </p>
            
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[10px] text-blue-700 tracking-widest uppercase">{statusText}</span>
                <span className="font-bold text-sm text-blue-700">{progress > 100 ? 100 : progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 h-16 w-16 flex items-center justify-center bg-rose-50 rounded-full">
              <AlertTriangle className="text-rose-500 w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-2">Error en el análisis</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              {error}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={handleRetryApi}
                className="w-full px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
              <button 
                onClick={onRetry}
                className="w-full px-6 py-2.5 text-slate-500 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al formulario
              </button>
            </div>
          </>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-100 w-full text-center">
          <div className="flex items-center gap-2 justify-center text-slate-400">
            <Lock className="w-3 h-3" />
            <span className="font-medium text-xs">Tu información está siendo procesada de forma segura</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
