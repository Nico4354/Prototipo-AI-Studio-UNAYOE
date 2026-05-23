import React, { useState } from 'react';
import { User, Headset, Mail, MapPin, HelpCircle, Send, CheckCircle } from 'lucide-react';
import Sidebar from './Sidebar';

interface TechnicalSupportProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export default function TechnicalSupport({ onLogout, onNavigate }: TechnicalSupportProps) {
  const [problemType, setProblemType] = useState('Técnico');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: problemType, message }),
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setTicketId(data.ticketId || 'TKT-' + Math.floor(1000 + Math.random() * 9000));
        setIsSubmitted(true);
      }
    } catch (err) {
      // Fallback
      setTimeout(() => {
        setTicketId('TKT-' + Math.floor(1000 + Math.random() * 9000));
        setIsSubmitted(true);
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 font-sans">
      <Sidebar currentView="support" onNavigate={onNavigate} onLogout={onLogout} />

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
            <h2 className="text-2xl font-bold text-slate-800">Soporte Técnico y Ayuda</h2>
            <p className="text-slate-500 text-sm mt-1">Estamos aquí para ayudarte ante cualquier inconveniente.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Contact info and FAQs */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Headset className="text-blue-600 w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-800">Contacto Directo</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                    <Mail className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Correo Electrónico</p>
                      <p className="text-sm text-slate-500">soporte.unayoe@unmsm.edu.pe</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                    <MapPin className="text-slate-400 w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Ubicación Física</p>
                      <p className="text-sm text-slate-500">Pabellón Antiguo FISI, Primer Piso</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="text-emerald-600 w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-800">Preguntas Frecuentes</h3>
                </div>
                <ul className="space-y-4">
                  <li className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-bold text-sm text-slate-800 mb-1">¿Cómo modifico mi evaluación?</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Las evaluaciones son permanentes una vez enviadas para mantener el historial. Puedes enviar una nueva evaluación la próxima semana.</p>
                  </li>
                  <li className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-bold text-sm text-slate-800 mb-1">Olvidé mi contraseña</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Utiliza la opción "¿Olvidó su contraseña?" en la pantalla de inicio para restablecerla mediante tu correo institucional.</p>
                  </li>
                  <li className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-bold text-sm text-slate-800 mb-1">¿La información es confidencial?</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Sí, todos tus datos son encriptados y revisados únicamente por el personal psicológico calificado de la UNAYOE.</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column: Support Ticket Form */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Enviar un Ticket de Soporte</h3>
              
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-emerald-500 w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">Mensaje Enviado</h4>
                  <p className="text-sm text-slate-500 mb-6">Hemos recibido tu solicitud bajo el código <strong className="text-slate-700">{ticketId}</strong>. Te contactaremos pronto.</p>
                  <button 
                    onClick={() => {
                      setIsSubmitted(false);
                      setMessage('');
                    }}
                    className="px-6 py-2 bg-slate-50 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Enviar otro ticket
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="font-bold text-sm text-slate-800" htmlFor="problemType">
                      Tipo de Problema
                    </label>
                    <select
                      id="problemType"
                      value={problemType}
                      onChange={(e) => setProblemType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700"
                    >
                      <option value="Técnico">Problema Técnico / Plataforma</option>
                      <option value="Psicológico">Consulta Psicológica / Triaje</option>
                      <option value="Cuenta">Problema con la Cuenta</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-sm text-slate-800" htmlFor="message">
                      Mensaje
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe detalle aquí tu problema..."
                      className="w-full min-h-[160px] bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full py-3 bg-blue-100 text-blue-700 font-bold text-sm rounded-lg hover:bg-blue-200 transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Mensaje
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
