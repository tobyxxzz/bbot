import { GoogleGenAI } from '@google/genai';
import { KnowledgeBase } from '@shared/schema';
import { generateEmbedding, findSimilar } from './embeddings.js';
import { searchWeb } from './web-search.js';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

// the newest Gemini model is "gemini-2.5-flash"
const MODEL = 'gemini-2.5-flash';

export async function generateAIResponse(
  userMessage: string,
  knowledgeEntries: KnowledgeBase[],
  config: { systemPrompt: string; fallbackMessage: string; maxTokens: number }
): Promise<string> {
  try {
    // PRIORIDADE 1: Sempre tentar usar OpenAI se tivermos conhecimento base
    if (knowledgeEntries.length > 0) {
      let context = '\n\n📚 Base de Conhecimento Disponível:\n\n';
      
      // Tente usar semantic search se possível
      let foundRelevant = false;
      try {
        const queryEmbedding = await generateEmbedding(userMessage);
        const knowledgeWithEmbeddings = knowledgeEntries
          .filter(kb => kb.embedding)
          .map(kb => ({
            id: kb.id,
            embedding: JSON.parse(kb.embedding!),
            subject: kb.subject,
            information: kb.information,
          }));

        const similarKnowledge = findSimilar(queryEmbedding, knowledgeWithEmbeddings, 0.4);
        
        if (similarKnowledge.length > 0) {
          foundRelevant = true;
          context = '\n\n📚 Informações Relevantes da Base de Conhecimento:\n\n';
          similarKnowledge.forEach((kb, index) => {
            context += `${index + 1}. **${kb.subject}** (${(kb.similarity * 100).toFixed(0)}% relevante):\n${kb.information}\n\n`;
          });
        } else {
          // Se não encontrou similar, mostre todos
          knowledgeEntries.forEach((kb, index) => {
            context += `${index + 1}. **${kb.subject}**:\n${kb.information}\n\n`;
          });
        }
      } catch (embedError) {
        console.error('Erro ao gerar embedding:', embedError);
        // Fallback: use todos os conhecimentos sem semantic search
        knowledgeEntries.forEach((kb, index) => {
          context += `${index + 1}. **${kb.subject}**:\n${kb.information}\n\n`;
        });
      }

      // Tente usar Gemini com o contexto
      try {
        const systemMessage = `${config.systemPrompt}${context}

Baseando-se nas informações acima, responda a pergunta do usuário de forma clara, útil e em português.`;

        const response = await ai.models.generateContent({
          model: MODEL,
          config: {
            systemInstruction: systemMessage,
          },
          contents: userMessage,
        });

        return response.text || config.fallbackMessage;
      } catch (aiError: any) {
        console.error('Gemini indisponível, usando base de conhecimento direto:', aiError?.message);
        // OpenAI falhou, use a base de conhecimento como resposta direta
        const foundKnowledge = knowledgeEntries.filter(kb => 
          userMessage.toLowerCase().includes(kb.subject.toLowerCase()) ||
          kb.subject.toLowerCase().includes(userMessage.toLowerCase())
        );
        
        if (foundKnowledge.length > 0) {
          return `📚 Conforme nossa base de conhecimento sobre "${foundKnowledge[0].subject}":\n\n${foundKnowledge[0].information}`;
        }
        
        // Se não encontrou match exato, mostre os 3 primeiros tópicos
        if (knowledgeEntries.length > 0) {
          return `Não encontrei exatamente sobre esse assunto, mas tenho informações sobre:\n\n${knowledgeEntries
            .slice(0, 3)
            .map(kb => `📌 **${kb.subject}**:\n${kb.information.substring(0, 200)}${kb.information.length > 200 ? '...' : ''}`)
            .join('\n\n')}`;
        }
        
        return config.fallbackMessage;
      }
    }

    // PRIORIDADE 2: Se não temos conhecimento base, tente Gemini direto
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        config: {
          systemInstruction: config.systemPrompt,
        },
        contents: userMessage,
      });
      return response.text || config.fallbackMessage;
    } catch (error) {
      console.error('Gemini indisponível e sem base de conhecimento:', error);
      return "Estou tendo dificuldades para responder agora. Por favor, tente novamente em alguns momentos.";
    }
  } catch (error) {
    console.error('Erro crítico ao gerar resposta:', error);
    return "Desculpe, estou tendo dificuldades para responder no momento.";
  }
}

export async function analyzeSentiment(
  text: string
): Promise<{ sentiment: string; urgency: string; confidence: number }> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      config: {
        systemInstruction: `Você é um especialista em análise de sentimentos. Analise o sentimento e urgência de mensagens de suporte em português.
Responda com JSON válido neste formato exato:
{
  "sentiment": "positivo",
  "urgency": "alta",
  "confidence": 0.85
}

Diretrizes de urgência:
- alta: Cliente está frustrado, irritado ou enfrentando problemas críticos
- média: Cliente precisa de ajuda mas está paciente
- baixa: Perguntas simples ou consultas gerais`,
        responseMimeType: 'application/json',
      },
      contents: text,
    });

    const text_response = response.text || '{}';
    const result = JSON.parse(text_response);
    
    // Map Portuguese to English for internal use
    const sentimentMap: { [key: string]: string } = {
      'positivo': 'positive',
      'neutro': 'neutral',
      'negativo': 'negative'
    };
    
    const urgencyMap: { [key: string]: string } = {
      'alta': 'high',
      'média': 'medium',
      'baixa': 'low'
    };
    
    return {
      sentiment: sentimentMap[result.sentiment] || 'neutral',
      urgency: urgencyMap[result.urgency] || 'medium',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
    };
  } catch (error) {
    console.error('Erro ao analisar sentimento:', error);
    // Fallback: retorna valores padrão
    return {
      sentiment: 'neutral',
      urgency: 'medium',
      confidence: 0,
    };
  }
}
