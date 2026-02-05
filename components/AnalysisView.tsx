
import React from 'react';
import { StockAnalysis, RecommendationType } from '../types';
import { TrendingUp, TrendingDown, Minus, Info, ExternalLink, Calendar, DollarSign, Activity, Bell, BellOff, Clock, Zap, ShieldCheck } from 'lucide-react';

interface AnalysisViewProps {
  analysis: StockAnalysis;
  isWatched: boolean;
  onToggleWatch: () => void;
}

const SignalBadge: React.FC<{ signal: RecommendationType, isStrong?: boolean }> = ({ signal, isStrong }) => {
  const configs = {
    BUY: { label: isStrong ? 'STRONG BUY' : 'COMPRARE', color: isStrong ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: TrendingUp },
    SELL: { label: isStrong ? 'STRONG SELL' : 'VENDERE', color: isStrong ? 'bg-rose-600 text-white border-rose-400' : 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: TrendingDown },
    HOLD: { label: 'TENERE', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Minus },
    NEUTRAL: { label: 'NEUTRO', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Minus }
  };

  const config = configs[signal] || configs.NEUTRAL;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${config.color} font-bold tracking-wide transition-all shadow-lg shadow-black/20`}>
      {isStrong ? <ShieldCheck size={18} className="animate-pulse" /> : <Icon size={18} />}
      <span>{config.label}</span>
    </div>
  );
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, isWatched, onToggleWatch }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="glass-card p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-b-blue-500/30">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold text-white">{analysis.companyName}</h2>
            {analysis.horizon === 'MEDIUM_LONG' && (
              <span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-tighter">
                <Clock size={10} /> Lungo Periodo
              </span>
            )}
            {analysis.horizon === 'INTRADAY' && (
              <span className="flex items-center gap-1 bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-fuchsia-500/30 uppercase tracking-tighter">
                <Zap size={10} /> Intraday Flash
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-sm font-mono tracking-wider">
              {analysis.symbol}
            </span>
            <span className="flex items-center gap-1 text-sm">
              <Calendar size={14} /> {analysis.timestamp}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <div className="text-3xl font-bold text-white flex items-center gap-2">
              <DollarSign className="text-emerald-400" size={24} />
              {analysis.price}
            </div>
            <div className={`text-sm font-medium ${analysis.change.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {analysis.change}
            </div>
          </div>
          <button 
            onClick={onToggleWatch}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 min-w-[100px] ${
              isWatched 
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {isWatched ? <BellOff size={20} /> : <Bell size={20} />}
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {isWatched ? 'Monitorato' : 'Monitora'}
            </span>
          </button>
        </div>
      </div>

      {/* Decision Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`glass-card p-8 rounded-3xl border-l-4 shadow-xl ${analysis.isStrong ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="text-blue-400" />
                Segnale di Trading
              </h3>
              <SignalBadge signal={analysis.signal} isStrong={analysis.isStrong} />
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-200 leading-relaxed text-lg font-medium">
                {analysis.reasoning}
              </p>
              {analysis.isStrong && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="text-emerald-400 shrink-0 mt-1" size={20} />
                  <p className="text-sm text-emerald-300">
                    L'IA ha rilevato un momentum eccezionale o catalizzatori fondamentali che rendono questo segnale particolarmente affidabile secondo i dati attuali.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Info className="text-indigo-400" />
              Dettagli Tecnici & Sentiment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Analisi Tecnica</span>
                <p className="text-slate-300 text-sm leading-relaxed">{analysis.technicalAnalysis}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Sentiment Globale</span>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                   <p className="text-indigo-300 font-medium">{analysis.sentiment}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sources Section */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl h-full shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="text-slate-400" size={18} />
              Fonti Grounding
            </h3>
            <div className="space-y-3">
              {analysis.sources.length > 0 ? (
                analysis.sources.map((src, idx) => (
                  <a 
                    key={idx} 
                    href={src.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-3 bg-slate-800/40 hover:bg-slate-700/50 rounded-xl transition-all border border-transparent hover:border-slate-600 group"
                  >
                    <p className="text-sm text-slate-200 font-medium line-clamp-2 group-hover:text-blue-400 transition-colors">
                      {src.title}
                    </p>
                    <span className="text-[10px] text-slate-500 truncate block mt-1">
                      {src.uri}
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-slate-500 text-sm italic text-center py-4">Nessuna fonte di ricerca esterna disponibile.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
