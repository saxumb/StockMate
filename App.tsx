
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, TrendingUp, ShieldAlert, BarChart2, LayoutGrid, Clock, ChevronRight, AlertTriangle, Sparkles, Globe, Zap, Bell, BellRing, RefreshCcw, Download } from 'lucide-react';
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
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

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('stockmate_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('stockmate_recent', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem('stockmate_notif_enabled', notificationsEnabled.toString());
    
    if (notificationsEnabled && !monitorInterval.current) {
      monitorInterval.current = window.setInterval(() => {
        autoRefreshWatchlist();
      }, 15 * 60 * 1000);
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
        
        if (result.signal !== oldSignal) {
          sendPushNotification(
            `Cambio Segnale: ${result.symbol}`,
            `L'azione ${result.companyName} è passata da ${oldSignal} a ${result.signal}. Prezzo: ${result.price}`,
            result.isStrong
          );
        } 
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
    setAnalysis(null);
    setError(null);
    try {
      const result = await service.analyzeStock(targetSymbol.trim(), horizon);
      setAnalysis(result);
      if (!recentSearches.includes(targetSymbol.toUpperCase())) {
        setRecentSearches(prev => [targetSymbol.toUpperCase(), ...prev].slice(0, 5));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Impossibile analizzare l'azione. Verifica il ticker o la connessione.");
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
    } catch (err: any) {
      setError(err.message || "Errore durante la scansione globale. Riprova tra poco.");
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
    <div className="min-h-screen pb-20 selection:bg-blue-500/30 text-slate-200">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[140px]" />
      </div>

      <header className="pt-12 pb-8 px-6 max-w-7xl mx-auto">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={clearResults}>
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
            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-xl hover:bg-blue-500/20 transition-all"
              >
                <Download size={16} /> Installa
              </button>
            )}
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
                placeholder="Inserisci Ticker (es. ENI.MI, AAPL, OKLO)..."
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
        {error && (
          <div className="max-w-2xl mx-auto p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-4 text-rose-400 mb-8 animate-in slide-in-from-top-4 duration-300">
            <ShieldAlert size={24} className="shrink-0 mt-1" />
            <div>
               <p className="font-bold mb-1">Errore di Analisi</p>
               <p className="text-sm opacity-90">{error}</p>
            </div>
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
                  L'AI sta interrogando Google Search per news e dati in tempo reale. Potrebbe volerci qualche secondo...
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
                title="Analisi Fondamentale"
                desc="Esamina i dati finanziari aggregando fonti autorevoli in tempo reale."
              />
              <FeatureCard 
                icon={<LayoutGrid className="text-emerald-400" />}
                title="Sentiment Engine"
                desc="Comprendi l'opinione del mercato scansionando testate finanziarie globali."
              />
              <FeatureCard 
                icon={<Zap className="text-fuchsia-400" />}
                title="Grounding Search"
                desc="Ogni consiglio è supportato da fonti web dirette e verificabili."
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
            StockMate AI è uno strumento tecnologico sperimentale. Le informazioni fornite non costituiscono consulenza finanziaria o raccomandazione di investimento. L'utente riconosce che il trading azionario comporta rischi significativi. Le decisioni prese sulla base di questa app sono sotto l'esclusiva responsabilità dell'utente.
          </p>
        </div>
        <p className="text-slate-600 text-xs">
          © 2024 StockMate AI Engine. Powered by Google Gemini.
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
  </div>
);

export default App;
