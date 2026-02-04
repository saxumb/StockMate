
import { GoogleGenAI, Type } from "@google/genai";
import { StockAnalysis, RecommendationType, TimeHorizon, DiscoveryResult } from "../types";

export class GeminiStockService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async discoverOpportunities(horizon: TimeHorizon): Promise<DiscoveryResult[]> {
    const horizonLabel = horizon === 'MEDIUM_LONG' ? 'Medio-Lungo Periodo' : 'Breve Periodo';
    const prompt = `Usa Google Search per identificare le 4 migliori opportunità di investimento attuali nel mercato azionario globale per un orizzonte di ${horizonLabel}.
    Analizza news di oggi, trend di settore (es. AI, Energy, Tech) e raccomandazioni recenti degli analisti.
    
    Restituisci ESCLUSIVAMENTE un array JSON di 4 oggetti con:
    - symbol: il ticker esatto (es. NVDA, ENI.MI)
    - companyName: nome dell'azienda
    - briefReasoning: una sintesi estrema del perché è interessante (max 15 parole)
    - potentialReason: una categoria come "Growth", "Value", "Momentum" o "Recovery"`;

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
    const horizonContext = horizon === 'MEDIUM_LONG' 
      ? "focalizzandoti sul MEDIO-LUNGO PERIODO (6-24 mesi). Cerca segnali di valore fondamentale, crescita sostenibile e trend macroeconomici."
      : "focalizzandoti sul BREVE PERIODO. Guarda i movimenti recenti e il momentum attuale.";

    const prompt = `Analizza l'azione con ticker "${symbol}" ${horizonContext}
    Usa Google Search per trovare:
    1. Prezzo attuale e variazioni recenti.
    2. News recenti che influenzano l'azienda.
    3. Analisi tecnica (trend, supporti/resistenze).
    4. Sentiment di mercato e fondamentali.

    Determina se è il momento di COMPRARE (BUY), VENDERE (SELL), o TENERE (HOLD).
    Fornisci la risposta in formato JSON strutturato con questi campi:
    - companyName: Nome completo dell'azienda
    - signal: Uno tra "BUY", "SELL", "HOLD"
    - price: Prezzo attuale con valuta
    - change: Variazione percentuale recente
    - reasoning: Spiegazione dettagliata della decisione (minimo 3-4 frasi)
    - technicalAnalysis: Dettagli tecnici
    - sentiment: Descrizione del sentiment (es. Bullish, Bearish, Neutrale)
    
    Sii molto critico e prudente, specialmente per il lungo periodo.`;

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
