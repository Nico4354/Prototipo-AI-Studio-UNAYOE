import React, { useEffect, useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';

interface ProcessingModalProps {
  onComplete: () => void;
}

export default function ProcessingModal({ onComplete }: ProcessingModalProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progression over 3 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500); // Wait half a second at 100% before transitioning
          return 100;
        }
        // Random increment to look like real processing
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-[500px] mx-5 bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-10 text-center flex flex-col items-center border border-slate-100 font-sans">
        
        <div className="mb-8 relative h-20 w-20 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
          <Sparkles className="text-blue-600 w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Analizando Perfil...</h2>
        <p className="text-sm text-slate-500 mb-8 max-w-sm">
          Nuestros especialistas virtuales están evaluando tus respuestas para brindarte las mejores recomendaciones.
        </p>
        
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-[10px] text-blue-700 tracking-widest uppercase">Análisis en curso</span>
            <span className="font-bold text-sm text-blue-700">{progress > 100 ? 100 : progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
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
