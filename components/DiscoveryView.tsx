
import React from 'react';
import { DiscoveryResult } from '../types';
import { Sparkles, ArrowRight, Target } from 'lucide-react';

interface DiscoveryViewProps {
  results: DiscoveryResult[];
  onSelect: (symbol: string) => void;
}

const DiscoveryView: React.FC<DiscoveryViewProps> = ({ results, onSelect }) => {
  return (
    <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="text-blue-400" size={20} />
        <h3 className="text-xl font-bold text-white tracking-tight">Top Opportunity Identificate</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((item, idx) => (
          <div 
            key={item.symbol} 
            className="glass-card p-6 rounded-3xl border-blue-500/20 hover:border-blue-500/50 transition-all group flex flex-col justify-between"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-black text-lg group-hover:text-blue-400 transition-colors">{item.companyName}</h4>
                  <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{item.symbol}</span>
                </div>
                <div className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-blue-500/20 uppercase">
                  {item.potentialReason}
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 italic">
                "{item.briefReasoning}"
              </p>
            </div>
            
            <button 
              onClick={() => onSelect(item.symbol)}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-blue-600 text-white py-3 rounded-2xl text-xs font-bold transition-all"
            >
              <Target size={14} />
              Analizza in Dettaglio
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscoveryView;
