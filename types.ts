
export type RecommendationType = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
export type TimeHorizon = 'SHORT' | 'MEDIUM_LONG';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface StockAnalysis {
  symbol: string;
  companyName: string;
  signal: RecommendationType;
  price: string;
  change: string;
  reasoning: string;
  technicalAnalysis: string;
  sentiment: string;
  sources: GroundingSource[];
  timestamp: string;
  horizon?: TimeHorizon;
}

export interface WatchlistEntry {
  symbol: string;
  companyName: string;
  lastSignal: RecommendationType;
  lastPrice: string;
  addedAt: string;
}

export interface DiscoveryResult {
  symbol: string;
  companyName: string;
  briefReasoning: string;
  potentialReason: string;
}
