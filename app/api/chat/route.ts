import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

function statusForError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("timeout") || message.includes("abort")) return 503;
  if (message.includes("429") || message.includes("too many requests")) return 429;
  return 500;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { documentId?: unknown; question?: unknown };
    if (typeof body.documentId !== "string" || typeof body.question !== "string") {
      return NextResponse.json({ error: "A document and question are required." }, { status: 400 });
    }

    const question = body.question.trim();
    if (!question || question.length > 1_500) {
      return NextResponse.json({ error: "Questions must be between 1 and 1,500 characters." }, { status: 400 });
    }
    return NextResponse.json(await answerQuestion(body.documentId, question));
  } catch (error) {
    const status = statusForError(error);
    const message = status === 503
      ? "Gemini is taking too long to search this PDF. Wait a minute, then try the question again."
      : status === 429
        ? "Gemini's free-tier quota is busy. Please wait a minute and try again."
        : error instanceof Error ? error.message : "Unable to answer that question.";
    return NextResponse.json({ error: message }, { status });
  }
}
