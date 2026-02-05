
import { GoogleGenAI, Type } from "@google/genai";
import { StockAnalysis, RecommendationType, TimeHorizon, DiscoveryResult } from "../types";

export class GeminiStockService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async discoverOpportunities(horizon: TimeHorizon): Promise<DiscoveryResult[]> {
    const labels = {
      INTRADAY: 'Trading Intraday (Day Trading)',
      SHORT: 'Breve Periodo (Swing Trading)',
      MEDIUM_LONG: 'Medio-Lungo Periodo (Investing)'
    };
    
    const horizonLabel = labels[horizon];
    const prompt = `Usa Google Search per identificare le 4 migliori opportunità di investimento attuali nel mercato azionario globale per un orizzonte di ${horizonLabel}.
    Analizza news di oggi, trend di settore (es. AI, Energy, Tech) e raccomandazioni recenti degli analisti.
    Per Intraday, cerca azioni con alta volatilità o volumi anomali nelle ultime ore.
    
    Restituisci ESCLUSIVAMENTE un array JSON di 4 oggetti con:
    - symbol: il ticker esatto (es. NVDA, ENI.MI)
    - companyName: nome dell'azienda
    - briefReasoning: una sintesi estrema del perché è interessante (max 15 parole)
    - potentialReason: una categoria come "Growth", "Value", "Momentum", "Volatility" o "Recovery"`;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              companyName: { type: Type.STRING },
              briefReasoning: { type: Type.STRING },
              potentialReason: { type: Type.STRING }
            },
            required: ["symbol", "companyName", "briefReasoning"]
          }
        }
      },
    });

    return JSON.parse(response.text);
  }

  async analyzeStock(symbol: string, horizon: TimeHorizon = 'SHORT'): Promise<StockAnalysis> {
    let horizonContext = "";
    if (horizon === 'INTRADAY') {
      horizonContext = "focalizzandoti sul TRADING INTRADAY. Analizza i movimenti delle ULTIME ORE, volatilità attuale, RSI su timeframe brevi, volumi e news dell'ULTIMA ORA.";
    } else if (horizon === 'MEDIUM_LONG') {
      horizonContext = "focalizzandoti sul MEDIO-LUNGO PERIODO (6-24 mesi). Cerca segnali di valore fondamentale, crescita sostenibile e trend macroeconomici.";
    } else {
      horizonContext = "focalizzandoti sul BREVE PERIODO (Swing trading). Guarda i movimenti recenti di questa settimana e il momentum attuale.";
    }

    const prompt = `Analizza l'azione con ticker "${symbol}" ${horizonContext}
    Usa Google Search per trovare:
    1. Prezzo attuale e variazioni REAL-TIME.
    2. News dell'ultima ora o catalizzatori odierni.
    3. Analisi tecnica specifica per l'orizzonte scelto.
    4. Sentiment istantaneo.

    Determina se è il momento di COMPRARE (BUY), VENDERE (SELL), o TENERE (HOLD).
    Fornisci la risposta in formato JSON strutturato con questi campi:
    - companyName: Nome completo dell'azienda
    - signal: Uno tra "BUY", "SELL", "HOLD"
    - price: Prezzo attuale con valuta
    - change: Variazione percentuale odierna
    - reasoning: Spiegazione dettagliata della decisione
    - technicalAnalysis: Dettagli tecnici (RSI, Supporti, Volatilità)
    - sentiment: Descrizione del sentiment attuale
    
    Sii estremamente prudente per l'intraday data l'alta volatilità.`;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING },
            signal: { type: Type.STRING },
            price: { type: Type.STRING },
            change: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            technicalAnalysis: { type: Type.STRING },
            sentiment: { type: Type.STRING },
          },
          required: ["companyName", "signal", "price", "reasoning"]
        }
      },
    });

    const resultData = JSON.parse(response.text);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return {
      ...resultData,
      symbol: symbol.toUpperCase(),
      sources,
      timestamp: new Date().toLocaleString('it-IT'),
      horizon
    };
  }
}
