
import React from 'react';
import { WatchlistEntry, RecommendationType } from '../types';
import { Trash2, TrendingUp, TrendingDown, Minus, RefreshCw, Bell, BellOff } from 'lucide-react';

interface WatchlistProps {
  entries: WatchlistEntry[];
  onRemove: (symbol: string) => void;
  onSelect: (symbol: string) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}

const MiniSignal: React.FC<{ signal: RecommendationType }> = ({ signal }) => {
  const configs = {
    BUY: { color: 'text-emerald-400', icon: TrendingUp, label: 'BUY' },
    SELL: { color: 'text-rose-400', icon: TrendingDown, label: 'SELL' },
    HOLD: { color: 'text-amber-400', icon: Minus, label: 'HOLD' },
    NEUTRAL: { color: 'text-slate-400', icon: Minus, label: 'WAIT' }
  };
  const config = configs[signal] || configs.NEUTRAL;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 ${config.color} text-xs font-bold`}>
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  );
};

const Watchlist: React.FC<WatchlistProps> = ({ 
  entries, 
  onRemove, 
  onSelect, 
  onRefreshAll, 
  isRefreshing, 
  notificationsEnabled,
  onToggleNotifications 
}) => {
  if (entries.length === 0) return null;

  return (
    <div className="mt-12 glass-card rounded-3xl p-6 border-slate-700/50 shadow-2xl overflow-hidden relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-blue-400" size={20} />
          Azioni in Monitoraggio (Medio-Lungo)
        </h3>
        
        <div className="flex items-center gap-3">
           <button 
            onClick={onToggleNotifications}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              notificationsEnabled 
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
              : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            {notificationsEnabled ? 'Notifiche Attive' : 'Attiva Notifiche'}
          </button>

          <button 
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 border border-slate-700"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Aggiorna
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((entry) => (
          <div 
            key={entry.symbol}
            className="group bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 hover:border-blue-500/50 transition-all cursor-pointer relative"
            onClick={() => onSelect(entry.symbol)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(entry.symbol); }}
              className="absolute top-4 right-4 text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-bold line-clamp-1 pr-6">{entry.companyName}</h4>
                <span className="text-xs font-mono text-slate-500">{entry.symbol}</span>
              </div>
              <MiniSignal signal={entry.lastSignal} />
            </div>
            
            <div className="flex justify-between items-end">
              <span className="text-lg font-bold text-slate-200">{entry.lastPrice}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                {entry.addedAt}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
        <RefreshCw size={12} className="shrink-0" />
        <span>
          {notificationsEnabled 
            ? "Il sistema scansiona la watchlist ogni 15 min e ti avvisa se l'IA rileva cambiamenti critici."
            : "L'AI monitora periodicamente queste azioni. Attiva le notifiche per ricevere avvisi in tempo reale."
          }
        </span>
      </div>
    </div>
  );
};

export default Watchlist;
