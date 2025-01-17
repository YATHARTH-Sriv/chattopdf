import { OpenAIApi, Configuration } from "openai-edge";
import { Pinecone } from "@pinecone-database/pinecone";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(pdfText: string) {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-3-small",
      input: pdfText,
    });

    const result = await response.json();
    console.log("from get embedding function part-1", result.data[0].embedding);

    if (!result?.data?.length) {
      throw new Error("No embeddings found in OpenAI API response.");
    }

    return {
      embedding: result.data[0].embedding,
      chunk: pdfText,
    };
  } catch (error) {
    console.error("Error calling OpenAI embeddings API:", error);
    throw new Error("Failed to generate embeddings. Please try again.");
  }
}

export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
  });
};

export async function loadIntoPinecone(
  embeddings: { embedding: number[]; chunk: string }[],
  namespaceName: string,
  pdfName: string
) {
  try {
    const client = await getPineconeClient();
    const pineconeIndex = await client.index("chattopdf");
    const namespace = pineconeIndex.namespace(namespaceName);

    // Prepare vectors for upsert
    const vectors = embeddings.map((item, i) => ({
      id: `${pdfName}-chunk-${i}`,
      values: item.embedding,
      metadata: {
        text: item.chunk,
        pdfName,
        pageNumber: i, // Add page number for easier reference
      },
    }));

    // Upsert in batches of 100 to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await namespace.upsert(batch);
    }

    return {
      vectorCount: vectors.length,
      namespaceName,
    };
  } catch (error) {
    console.error("Error loading embeddings into Pinecone:", error);
    throw new Error("Failed to load embeddings into Pinecone.");
  }
}
