import React, { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import EvaluationForm from './components/EvaluationForm';
import ProcessingModal from './components/ProcessingModal';
import Dashboard from './components/Dashboard';
import ClinicalHistory from './components/ClinicalHistory';
import Resources from './components/Resources';
import TechnicalSupport from './components/TechnicalSupport';
import Settings from './components/Settings';

type ViewState = 'login' | 'register' | 'evaluation' | 'processing' | 'dashboard' | 'history' | 'resources' | 'support' | 'settings';

export interface UserData {
  id: number;
  name: string;
  program: string;
}

// Tipos para los datos de evaluación y diagnóstico IA
interface EvaluationData {
  stressLevel: string;
  sleepQuality: string;
  energyImpact: string;
  symptoms: string[];
  symptomDuration: string;
  observations: string;
}

export interface DiagnosticoIA {
  nivel_riesgo: string;
  descripcion_riesgo: string;
  sugerencias: {
    title: string;
    description: string;
    actionText: string;
    icon: string;
  }[];
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [aiDiagnostico, setAiDiagnostico] = useState<DiagnosticoIA | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  }, []);
  
  // Handlers for state transitions
  const handleLoginSuccess = (userData: UserData) => {
    setUser(userData);
    setCurrentView('evaluation');
  };
  
  const handleEvaluationSubmit = (data: EvaluationData) => {
    setEvaluationData(data);
    setCurrentView('processing');
  };
  
  const handleProcessingComplete = (diagnostico: DiagnosticoIA) => {
    setAiDiagnostico(diagnostico);
    setCurrentView('dashboard');
  };
  
  const handleRetry = () => setCurrentView('evaluation');
  
  const handleLogout = () => {
    setCurrentView('login');
    setEvaluationData(null);
    setAiDiagnostico(null);
    setUser(null);
  };
  
  const handleNavigate = (view: string) => {
    if (view === 'dashboard' || view === 'evaluation' || view === 'history' || view === 'resources' || view === 'support' || view === 'settings') {
      setCurrentView(view as ViewState);
    }
  };

  return (
    <div className="w-full min-h-screen">
      {currentView === 'login' && (
        <Login 
          onLogin={handleLoginSuccess} 
          onGoToRegister={() => setCurrentView('register')} 
        />
      )}
      
      {currentView === 'register' && (
        <Register 
          onRegister={handleLoginSuccess} 
          onGoToLogin={() => setCurrentView('login')} 
        />
      )}
      
      {currentView === 'evaluation' && (
        <EvaluationForm 
          onNext={handleEvaluationSubmit} 
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
      
      {currentView === 'processing' && (
        <>
          {/* We keep the evaluation form beneath the modal to simulate a real modal overlay effect */}
          <div className="h-screen overflow-hidden">
            <EvaluationForm 
              onNext={() => {}} 
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          </div>
          <ProcessingModal 
            evaluationData={evaluationData}
            onComplete={handleProcessingComplete}
            onRetry={handleRetry}
            estudianteId={user?.id}
          />
        </>
      )}
      
      {currentView === 'dashboard' && (
        <Dashboard 
          onLogout={handleLogout} 
          onNavigate={handleNavigate}
          aiDiagnostico={aiDiagnostico}
          estudianteId={user?.id}
        />
      )}

      {currentView === 'history' && (
        <ClinicalHistory
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          estudianteId={user?.id}
        />
      )}

      {currentView === 'resources' && (
        <Resources
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'support' && (
        <TechnicalSupport
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'settings' && (
        <Settings
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
