import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEmbeddings, loadIntoPinecone } from "@/lib/ai/embedding";

export async function POST(req: NextRequest) {
  const files = await req.formData().then(data => data.getAll("file"));
  
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  try {
    // Process each PDF file
    const allEmbeddings = [];
    for (const file of files) {
      if (!(file instanceof File) || !file.name.endsWith(".pdf")) {
        return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
      }

      const loader = new PDFLoader(file);
      const text = await loader.load();
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, // Adjust based on the text size
        chunkOverlap: 200,
      });

      const chunks = [];
      for (const page of text) {
        const chunk = await textSplitter.splitText(page.pageContent);
        chunks.push({
          pagetext: chunk.join(" "),
          pagenumber: page.metadata.loc.pageNumber,
        });
      }

      // Generate embeddings for each chunk
      const embeddings = await Promise.all(
        chunks.map(async (chunk) => await getEmbeddings(chunk.pagetext))
      );
      console.log("from post function", embeddings);

      if (embeddings.length === 0) {
        return NextResponse.json({ error: "No embeddings found for file: " + file.name }, { status: 404 });
      }

      // Load embeddings into Pinecone
      await loadIntoPinecone(embeddings, "pdfNamespace", file.name);
      allEmbeddings.push(...embeddings);
    }

    return NextResponse.json({ results: "success", embeddings: allEmbeddings }, { status: 200 });
  } catch (error) {
    console.error("Error processing the PDF files:", error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
