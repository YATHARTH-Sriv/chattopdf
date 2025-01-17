import { NextRequest, NextResponse } from "next/server";
import { OpenAIApi, Configuration } from "openai-edge";
import { getPineconeClient } from "@/lib/ai/embedding";

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// Search Pinecone and return relevant results
async function searchPinecone(query: string) {
  const client = await getPineconeClient();
  const pineconeIndex = await client.index('chattopdf');
  const namespace = pineconeIndex.namespace('pdfNamespace');
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: query,
  });

  const result = await response.json();
  const queryResult = await namespace.query({
    topK:3,
    vector: result.data[0].embedding,
    includeMetadata: true, // Include metadata to match by playlistId
  });

  if (!queryResult.matches.length) {
    return "No relevant results found.";
  }

  const relevantText = queryResult.matches
    .map((match) => match.metadata?.text)
    .filter(Boolean)
    .join("\n");

  return relevantText;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // Get relevant context from Pinecone
    const searchResults = await searchPinecone(lastMessage);

    // Prepare the system message
    const systemMessage = {
      role: "system",
      content: `You are a helpful assistant that answers questions based on the provided context. 
                Use the following context to answer the user's question. If the context doesn't 
                contain relevant information, say so.
                
                Context: ${searchResults}`,
    };

    // Send the messages to OpenAI (without streaming for simplicity)
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        systemMessage,
        ...messages.map((message: any) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Return the response from OpenAI as JSON
    return NextResponse.json(await response.json());

  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
  }
}
