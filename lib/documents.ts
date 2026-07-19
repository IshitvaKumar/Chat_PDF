import { getGemini } from "@/lib/gemini";
import { getStoredDocument, removeStoredDocument, saveStoredDocument } from "@/lib/document-repository";
import type { DocumentRecord } from "@/lib/types";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function validatePdf(file: File) {
  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) throw new Error("Only PDF files are supported.");
  if (file.size === 0) throw new Error("The PDF is empty.");
  if (file.size > MAX_FILE_SIZE) throw new Error("PDFs must be 20 MB or smaller.");
}

export async function getDocument(id: string) {
  return getStoredDocument(id);
}

function operationError(error: Record<string, unknown> | undefined) {
  if (typeof error?.message === "string") return error.message;
  return "Gemini could not index this PDF.";
}

async function waitForIndexing(operation: Awaited<ReturnType<ReturnType<typeof getGemini>["fileSearchStores"]["uploadToFileSearchStore"]>>) {
  const gemini = getGemini();
  let currentOperation = operation;
  const timeoutAt = Date.now() + 90_000;

  while (!currentOperation.done && Date.now() < timeoutAt) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    currentOperation = await gemini.operations.get({ operation: currentOperation }) as typeof currentOperation;
  }

  if (!currentOperation.done) {
    throw new Error("PDF processing took too long. Please try again shortly.");
  }
  if (currentOperation.error) {
    throw new Error(operationError(currentOperation.error));
  }
}

export async function createDocument(file: File): Promise<DocumentRecord> {
  const gemini = getGemini();
  const buffer = Buffer.from(await file.arrayBuffer());
  let fileSearchStoreName: string | undefined;

  try {
    const fileSearchStore = await gemini.fileSearchStores.create({
      config: {
        displayName: `PDF Insight: ${file.name}`,
        // This indexes both PDF text and images using the free-tier embedding model.
        embeddingModel: "models/gemini-embedding-2",
      },
    });
    if (!fileSearchStore.name) throw new Error("Gemini did not create a file search store.");
    fileSearchStoreName = fileSearchStore.name;

    const operation = await gemini.fileSearchStores.uploadToFileSearchStore({
      fileSearchStoreName,
      file: new Blob([buffer], { type: "application/pdf" }),
      config: { displayName: file.name, mimeType: "application/pdf" },
    });
    await waitForIndexing(operation);

    const document: DocumentRecord = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      status: "ready",
      createdAt: new Date().toISOString(),
      fileSearchStoreName,
    };
    await saveStoredDocument(document);
    return document;
  } catch (error) {
    if (fileSearchStoreName) {
      await gemini.fileSearchStores.delete({ name: fileSearchStoreName, config: { force: true } }).catch(() => undefined);
    }
    throw error;
  }
}

export async function deleteDocument(id: string) {
  const document = await getStoredDocument(id);
  if (!document) throw new Error("Document not found.");

  if (!document.fileSearchStoreName) {
    throw new Error("This document was indexed with the previous provider. Upload it again to use Gemini.");
  }
  await getGemini().fileSearchStores.delete({
    name: document.fileSearchStoreName,
    config: { force: true },
  });
  await removeStoredDocument(id);
}
