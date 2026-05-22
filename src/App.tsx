import React, { useState } from 'react';
import Login from './components/Login';
import EvaluationForm from './components/EvaluationForm';
import ProcessingModal from './components/ProcessingModal';
import Dashboard from './components/Dashboard';
import ClinicalHistory from './components/ClinicalHistory';
import Resources from './components/Resources';

type ViewState = 'login' | 'evaluation' | 'processing' | 'dashboard' | 'history' | 'resources';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  
  // Handlers for state transitions
  const handleLoginSuccess = () => setCurrentView('evaluation');
  const handleEvaluationSubmit = () => setCurrentView('processing');
  const handleProcessingComplete = () => setCurrentView('dashboard');
  const handleLogout = () => setCurrentView('login');
  
  const handleNavigate = (view: string) => {
    if (view === 'dashboard' || view === 'evaluation' || view === 'history' || view === 'resources') {
      setCurrentView(view as ViewState);
    }
  };

  return (
    <div className="w-full min-h-screen">
      {currentView === 'login' && <Login onLogin={handleLoginSuccess} />}
      
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
          <ProcessingModal onComplete={handleProcessingComplete} />
        </>
      )}
      
      {currentView === 'dashboard' && (
        <Dashboard 
          onLogout={handleLogout} 
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'history' && (
        <ClinicalHistory
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'resources' && (
        <Resources
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
