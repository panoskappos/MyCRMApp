import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-slate-950">
      {/* 2026 Luminous Mesh Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center transform hover:scale-105 transition-transform duration-200">
          <Logo size="lg" variant="white" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Καλώς ήρθατε στο MyCRMApp
        </h1>

        <button
          onClick={handleLogin}
          className="px-10 py-3.5 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all duration-150 hover:shadow-blue-500/40 active:scale-[0.98]"
        >
          Σύνδεση στο Σύστημα
        </button>
      </div>
    </div>
  );
};

export default Welcome;
