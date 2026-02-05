
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, TrendingUp, ShieldAlert, BarChart2, LayoutGrid, Clock, ChevronRight, AlertTriangle, Sparkles, Globe, Zap, Bell, BellRing, RefreshCcw } from 'lucide-react';
import { GeminiStockService } from './services/geminiService';
import { StockAnalysis, WatchlistEntry, TimeHorizon, DiscoveryResult } from './types';
import AnalysisView from './components/AnalysisView';
import Watchlist from './components/Watchlist';
import DisclaimerModal from './components/DisclaimerModal';
import DiscoveryView from './components/DiscoveryView';

const App: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [horizon, setHorizon] = useState<TimeHorizon>('MEDIUM_LONG');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const service = useRef(new GeminiStockService()).current;
  const monitorInterval = useRef<number | null>(null);

  useEffect(() => {
    const accepted = localStorage.getItem('stockmate_disclaimer_accepted');
    setHasAcceptedDisclaimer(accepted === 'true');

    const saved = localStorage.getItem('stockmate_watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse watchlist", e);
      }
    }
    
    const savedNotif = localStorage.getItem('stockmate_notif_enabled');
    if (savedNotif === 'true' && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }

    const savedRecent = localStorage.getItem('stockmate_recent');
    if (savedRecent) setRecentSearches(JSON.parse(savedRecent));
  }, []);

  useEffect(() => {
    localStorage.setItem('stockmate_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('stockmate_recent', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem('stockmate_notif_enabled', notificationsEnabled.toString());
    
    if (notificationsEnabled && !monitorInterval.current) {
      // Monitoraggio ogni 15 minuti se abilitato
      monitorInterval.current = window.setInterval(() => {
        autoRefreshWatchlist();
      }, 15 * 60 * 1000);
      // Esegui subito un refresh iniziale se attivato
      autoRefreshWatchlist();
    } else if (!notificationsEnabled && monitorInterval.current) {
      clearInterval(monitorInterval.current);
      monitorInterval.current = null;
    }

    return () => {
      if (monitorInterval.current) clearInterval(monitorInterval.current);
    };
  }, [notificationsEnabled]);

  const sendPushNotification = (title: string, body: string, isUrgent = false) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2620/2620400.png',
        silent: !isUrgent,
        requireInteraction: isUrgent
      });
    }
  };

  const requestNotificationPermission = async () => {
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        sendPushNotification("StockMate AI", "Notifiche push attivate con successo! Verrai avvisato dei cambiamenti importanti.");
      }
    } else {
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  const autoRefreshWatchlist = async () => {
    if (watchlist.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    const updatedWatchlist = [...watchlist];
    for (let i = 0; i < updatedWatchlist.length; i++) {
      try {
        const oldSignal = updatedWatchlist[i].lastSignal;
        const result = await service.analyzeStock(updatedWatchlist[i].symbol, 'MEDIUM_LONG');
        
        // Notifica su cambio segnale
        if (result.signal !== oldSignal) {
          sendPushNotification(
            `Cambio Segnale: ${result.symbol}`,
            `L'azione ${result.companyName} è passata da ${oldSignal} a ${result.signal}. Prezzo: ${result.price}`,
            result.isStrong
          );
        } 
        // Notifica su segnale "Strong" rilevato (anche se il tipo di segnale è uguale, es. passa da Buy a Strong Buy)
        else if (result.isStrong && (result.signal === 'BUY' || result.signal === 'SELL')) {
          sendPushNotification(
             `Opportunità Forte: ${result.symbol}`,
             `Rilevato segnale STRONG ${result.signal} per ${result.companyName}. Prezzo attuale: ${result.price}`,
             true
          );
        }

        updatedWatchlist[i] = {
          ...updatedWatchlist[i],
          lastSignal: result.signal,
          lastPrice: result.price,
          addedAt: new Date().toLocaleDateString('it-IT')
        };
      } catch (e) {
        console.error(`Error auto-refreshing ${updatedWatchlist[i].symbol}`, e);
      }
    }
    setWatchlist(updatedWatchlist);
    setIsSyncing(false);
  };

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('stockmate_disclaimer_accepted', 'true');
    setHasAcceptedDisclaimer(true);
  };

  const handleSearch = async (e?: React.FormEvent, overrideSymbol?: string) => {
    if (e) e.preventDefault();
    const targetSymbol = overrideSymbol || symbol;
    if (!targetSymbol.trim()) return;

    setLoading(true);
    setDiscoveryResults(null);
    setError(null);
    try {
      const result = await service.analyzeStock(targetSymbol.trim(), horizon);
      setAnalysis(result);
      if (!recentSearches.includes(targetSymbol.toUpperCase())) {
        setRecentSearches(prev => [targetSymbol.toUpperCase(), ...prev].slice(0, 5));
      }
    } catch (err: any) {
      console.error(err);
      setError("Impossibile analizzare l'azione. Verifica il ticker o la connessione.");
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalDiscovery = async () => {
    setDiscovering(true);
    setAnalysis(null);
    setDiscoveryResults(null);
    setError(null);
    try {
      const results = await service.discoverOpportunities(horizon);
      setDiscoveryResults(results);
    } catch (err) {
      setError("Errore durante la scansione globale. Riprova tra poco.");
    } finally {
      setDiscovering(false);
    }
  };

  const toggleWatchlist = () => {
    if (!analysis) return;
    const exists = watchlist.find(w => w.symbol === analysis.symbol);
    if (exists) {
      setWatchlist(prev => prev.filter(w => w.symbol !== analysis.symbol));
    } else {
      setWatchlist(prev => [{
        symbol: analysis.symbol,
        companyName: analysis.companyName,
        lastSignal: analysis.signal,
        lastPrice: analysis.price,
        addedAt: new Date().toLocaleDateString('it-IT')
      }, ...prev]);
    }
  };

  const refreshWatchlist = async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    await autoRefreshWatchlist();
    setLoading(false);
  };

  const clearResults = () => {
    setAnalysis(null);
    setDiscoveryResults(null);
    setSymbol('');
    setError(null);
  };

  if (hasAcceptedDisclaimer === false) {
    return <DisclaimerModal onAccept={handleAcceptDisclaimer} />;
  }

  return (
    <div className="min-h-screen pb-20 selection:bg-blue-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[140px]" />
      </div>

      <header className="pt-12 pb-8 px-6 max-w-7xl mx-auto">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-3" onClick={clearResults} style={{ cursor: 'pointer' }}>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <TrendingUp className="text-white" size={28} />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white block leading-none">StockMate <span className="text-blue-500">AI</span></span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Data Analysis Tool</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-400">
            <button onClick={clearResults} className="hover:text-white transition-colors">Home</button>
            <button 
              onClick={requestNotificationPermission} 
              className={`flex items-center gap-2 transition-colors ${notificationsEnabled ? 'text-blue-400' : 'hover:text-white'}`}
            >
              {notificationsEnabled ? <BellRing size={16} className="animate-bounce" /> : <Bell size={16} />} 
              {notificationsEnabled ? 'Avvisi On' : 'Attiva Avvisi'}
            </button>
            <button onClick={refreshWatchlist} className="hover:text-white transition-colors flex items-center gap-2">
              <Clock size={16} /> Monitoraggio
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-full text-amber-400 text-[10px] font-bold mb-8 uppercase tracking-widest">
            <AlertTriangle size={12} /> Solo uso informativo - No consigli finanziari
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-[1.1] tracking-tight">
            Analisi di mercato <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">potenziata</span> dall'IA.
          </h1>
          
          <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Esplora i dati fondamentali e il sentiment di mercato per supportare le tue decisioni di <span className="text-slate-200">investimento consapevole</span>.
          </p>

          <div className="max-w-2xl mx-auto space-y-6">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Inserisci Ticker (es. ENI.MI, AAPL)..."
                className="w-full bg-slate-800/40 border border-slate-700/60 rounded-3xl py-6 px-8 pl-16 text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-xl shadow-3xl backdrop-blur-md"
                disabled={loading || discovering}
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={28} />
              <button
                type="submit"
                disabled={loading || discovering}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "ANALISI..." : "ANALIZZA"}
              </button>
            </form>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Orizzonte:</span>
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                  <button 
                    onClick={() => setHorizon('INTRADAY')}
                    className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${horizon === 'INTRADAY' ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Zap size={12} /> Intraday
                  </button>
                  <button 
                    onClick={() => setHorizon('SHORT')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${horizon === 'SHORT' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Breve
                  </button>
                  <button 
                    onClick={() => setHorizon('MEDIUM_LONG')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${horizon === 'MEDIUM_LONG' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    M-Lungo
                  </button>
                </div>
              </div>
              
              <div className="h-8 w-[1px] bg-slate-700 hidden md:block" />
              
              <button 
                onClick={handleGlobalDiscovery}
                disabled={loading || discovering}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Globe size={18} />
                Discovery
                <Sparkles size={16} className="text-yellow-400 animate-pulse" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 max-w-7xl mx-auto">
        {isSyncing && (
          <div className="fixed bottom-6 left-6 z-[60] animate-in slide-in-from-left-4 fade-in duration-500">
             <div className="bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
                <RefreshCcw size={16} className="text-blue-400 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Sincronizzazione Watchlist...</span>
             </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-4 text-rose-400 mb-8">
            <ShieldAlert size={24} />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {(loading || discovering) && (
          <div className="max-w-3xl mx-auto py-12">
            <div className="flex flex-col items-center gap-8">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
                <TrendingUp className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {discovering ? "Scansione Mercati Globali" : "Analisi Asset in Corso"}
                </h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                  {discovering 
                    ? `L'AI sta scansionando i settori più caldi per il ${horizon} periodo...`
                    : "Analizzando news di oggi, report finanziari e sentiment per fornirti un quadro accurato."}
                </p>
              </div>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <AnalysisView 
            analysis={analysis} 
            isWatched={!!watchlist.find(w => w.symbol === analysis.symbol)}
            onToggleWatch={toggleWatchlist}
          />
        )}

        {discoveryResults && !discovering && (
          <DiscoveryView 
            results={discoveryResults} 
            onSelect={(s) => {
                setSymbol(s);
                handleSearch(undefined, s);
            }} 
          />
        )}

        {!analysis && !discoveryResults && !loading && !discovering && (
          <>
            <Watchlist 
              entries={watchlist} 
              onRemove={(s) => setWatchlist(prev => prev.filter(w => w.symbol !== s))}
              onSelect={(s) => handleSearch(undefined, s)}
              onRefreshAll={refreshWatchlist}
              isRefreshing={loading}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={requestNotificationPermission}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <FeatureCard 
                icon={<BarChart2 className="text-blue-400" />}
                title="Analisi dei Fondamentali"
                desc="Esamina i dati finanziari e le performance storiche aggregando fonti autorevoli."
              />
              <FeatureCard 
                icon={<LayoutGrid className="text-emerald-400" />}
                title="Sintesi del Sentiment"
                desc="Comprendi l'opinione del mercato scansionando le ultime testate finanziarie globali."
              />
              <FeatureCard 
                icon={<Zap className="text-fuchsia-400" />}
                title="Intraday Flash"
                desc="Individua opportunità immediate basate su volatilità e news dell'ultima ora."
              />
            </div>
          </>
        )}
      </main>

      <footer className="mt-32 py-16 border-t border-slate-800/50 text-center max-w-7xl mx-auto px-6">
        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-8 text-left mb-12">
          <div className="flex items-center gap-3 mb-4 text-rose-400 font-bold uppercase tracking-widest text-xs">
            <AlertTriangle size={18} /> Avviso di Rischio e Esclusione di Responsabilità
          </div>
          <p className="text-slate-500 text-[13px] leading-relaxed">
            StockMate AI è un esperimento tecnologico basato sull'IA di Google Gemini. Le informazioni fornite non costituiscono consulenza finanziaria, raccomandazione di investimento o sollecitazione al pubblico risparmio. L'utente riconosce che il trading di titoli azionari comporta rischi significativi e può portare alla perdita del capitale investito. Le decisioni prese sulla base delle informazioni in questa app sono sotto l'esclusiva responsabilità dell'utente. Lo sviluppatore non è responsabile per eventuali perdite derivanti dall'uso di queste informazioni.
          </p>
        </div>
        <p className="text-slate-600 text-xs">
          © 2024 StockMate AI Engine. Non siamo consulenti finanziari.
        </p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div className="glass-card p-8 rounded-[2rem] border-slate-700/40 hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/5 group">
    <div className="mb-6 p-3 bg-slate-800/50 w-fit rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed font-medium">{desc}</p>
    <div className="mt-6 flex items-center text-blue-400 text-xs font-bold gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      Esplora analisi <ChevronRight size={14} />
    </div>
  </div>
);

export default App;
