import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use OpenAI's web search capability to find information
export async function searchWeb(query: string): Promise<string> {
  try {
    // For now, we'll use a simple approach: ask ChatGPT to search the web
    // In production, you might want to use a dedicated search API like Serpapi or Google Custom Search
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "user",
          content: `Pesquise na internet e responda a seguinte pergunta de forma clara e concisa: "${query}"`,
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    return content || "Não consegui encontrar informações sobre esse assunto.";
  } catch (error) {
    console.error("Error searching web:", error);
    return "Desculpe, não consegui fazer uma busca na internet no momento.";
  }
}
