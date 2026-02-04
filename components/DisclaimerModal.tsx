
import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card max-w-lg w-full p-8 rounded-[2.5rem] border-rose-500/30 shadow-2xl shadow-rose-500/10 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="text-rose-500" size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-white text-center mb-4 tracking-tight">
          Disclaimer Legale Importante
        </h2>
        
        <div className="space-y-4 text-slate-400 text-sm leading-relaxed mb-8">
          <p>
            <strong className="text-slate-200">StockMate AI</strong> è uno strumento puramente <span className="text-rose-400">informativo e tecnologico</span>. Non è gestito da consulenti finanziari certificati.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Le analisi sono generate automaticamente da un modello di Intelligenza Artificiale e potrebbero contenere inesattezze.</li>
            <li>Nulla di ciò che viene visualizzato costituisce un'offerta, una sollecitazione o una raccomandazione all'acquisto o alla vendita di titoli.</li>
            <li>L'utente è l'unico responsabile delle proprie decisioni finanziarie e dei rischi associati.</li>
            <li>I rendimenti passati non garantiscono risultati futuri.</li>
          </ul>
          <p className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 italic text-[12px]">
            Utilizzando questa applicazione, dichiari di aver compreso che StockMate AI non fornisce consulenza finanziaria e di esonerare lo sviluppatore da qualsiasi responsabilità.
          </p>
        </div>
        
        <button
          onClick={onAccept}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          <CheckCircle2 size={20} />
          Accetto e Comprendo
        </button>
      </div>
    </div>
  );
};

export default DisclaimerModal;
