import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embeddings for a given text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Find most similar knowledge entries based on query embedding
export function findSimilar(
  queryEmbedding: number[],
  knowledgeEmbeddings: Array<{
    id: string;
    embedding: number[];
    subject: string;
    information: string;
  }>,
  threshold: number = 0.5
): Array<{ id: string; similarity: number; subject: string; information: string }> {
  return knowledgeEmbeddings
    .map((kb) => ({
      id: kb.id,
      similarity: cosineSimilarity(queryEmbedding, kb.embedding),
      subject: kb.subject,
      information: kb.information,
    }))
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}
