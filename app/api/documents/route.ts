import { NextResponse } from "next/server";
import { createDocument, deleteDocument, validatePdf } from "@/lib/documents";

export const runtime = "nodejs";
export const maxDuration = 120;

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to process this PDF.";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF file to upload." }, { status: 400 });
    }
    validatePdf(file);
    const document = await createDocument(file);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: messageFromError(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "A document id is required." }, { status: 400 });

    await deleteDocument(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: messageFromError(error) }, { status: 400 });
  }
}
