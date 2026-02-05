
import { GoogleGenAI, Type } from "@google/genai";
import { StockAnalysis, RecommendationType, TimeHorizon, DiscoveryResult } from "../types";

export class GeminiStockService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private extractJson(text: string): any {
    try {
      // Prova il parse diretto
      return JSON.parse(text);
    } catch (e) {
      // Cerca il blocco di codice JSON se il modello ha aggiunto testo extra
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          throw new Error("Errore nel parsing del JSON generato dal modello.");
        }
      }
      throw new Error("Il modello non ha restituito un formato dati valido.");
    }
  }

  async discoverOpportunities(horizon: TimeHorizon): Promise<DiscoveryResult[]> {
    const labels = {
      INTRADAY: 'Trading Intraday (Day Trading)',
      SHORT: 'Breve Periodo (Swing Trading)',
      MEDIUM_LONG: 'Medio-Lungo Periodo (Investing)'
    };
    
    const horizonLabel = labels[horizon];
    const prompt = `Usa Google Search per identificare le 4 migliori opportunità di investimento attuali per un orizzonte di ${horizonLabel}.
    Analizza news di oggi e trend di settore.
    
    Restituisci la risposta esclusivamente come un array JSON valido:
    [
      {
        "symbol": "ticker",
        "companyName": "nome",
        "briefReasoning": "motivo (max 15 parole)",
        "potentialReason": "Growth/Value/etc"
      }
    ]`;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text;
    if (!text) throw new Error("Nessuna risposta ricevuta dal modello.");
    return this.extractJson(text);
  }

  async analyzeStock(symbol: string, horizon: TimeHorizon = 'SHORT'): Promise<StockAnalysis> {
    const prompt = `ANALISI AZIONARIA DETTAGLIATA PER: ${symbol} (Orizzonte: ${horizon})
    
    ISTRUZIONI:
    1. Esegui una ricerca Google per trovare prezzo attuale, variazioni odierne e ultime notizie.
    2. Analizza il sentiment e gli indicatori tecnici.
    3. Restituisci i dati ESCLUSIVAMENTE in questo formato JSON (non aggiungere altro testo):
    {
      "companyName": "Nome Azienda",
      "signal": "BUY" o "SELL" o "HOLD",
      "isStrong": true/false,
      "price": "Prezzo con valuta",
      "change": "Variazione %",
      "reasoning": "Spiegazione della decisione",
      "technicalAnalysis": "Dettagli tecnici",
      "sentiment": "Descrizione sentiment"
    }`;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text;
    if (!text) throw new Error("L'IA non ha generato una risposta per questo ticker.");
    
    const resultData = this.extractJson(text);
    
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
