"use client";

import { FormEvent, useRef, useState } from "react";
import type { ChatCitation, DocumentRecord } from "@/lib/types";

type Message = {
  role: "user" | "assistant";
  text: string;
  citations?: ChatCitation[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    setDocument(null);
    setMessages([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      const payload = (await response.json()) as DocumentRecord | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "The PDF could not be processed.");
      }
      setDocument(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The PDF could not be processed.");
    } finally {
      setUploading(false);
    }
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!document || !trimmedQuestion || asking) return;

    setError(null);
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: trimmedQuestion }]);
    setAsking(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id, question: trimmedQuestion }),
      });
      const payload = (await response.json()) as
        | { answer: string; citations: ChatCitation[] }
        | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Unable to answer that question.");
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", text: payload.answer, citations: payload.citations },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to answer that question.");
    } finally {
      setAsking(false);
    }
  }

  function chooseFile() {
    inputRef.current?.click();
  }

  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><span /> Grounded PDF conversations</div>
        <h1>Ask your document.<br /><em>Keep the evidence.</em></h1>
        <p>Upload a PDF once, then get clear answers grounded in that document—not the open web.</p>
      </section>

      <section className="workspace" aria-label="PDF chat workspace">
        <aside className="document-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Document</p>
              <h2>Your source</h2>
            </div>
            {document && <span className="ready-dot">Ready</span>}
          </div>

          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />

          {document ? (
            <div className="document-card">
              <div className="pdf-mark">PDF</div>
              <div className="file-details">
                <strong title={document.name}>{document.name}</strong>
                <span>{formatBytes(document.size)}</span>
              </div>
              <button className="text-button" onClick={chooseFile} type="button">Replace</button>
            </div>
          ) : (
            <button className="dropzone" onClick={chooseFile} disabled={uploading} type="button">
              <div className="upload-icon">↑</div>
              <strong>{uploading ? "Processing your PDF…" : "Choose a PDF"}</strong>
              <span>{uploading ? "This can take a moment" : "Up to 20 MB"}</span>
            </button>
          )}

          <div className="trust-note">
            <span className="lock">⌁</span>
            <p>Your API key remains on the server. Answers are limited to the selected document.</p>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Conversation</p>
              <h2>{document ? `Discuss ${document.name}` : "Start with a document"}</h2>
            </div>
          </div>

          <div className="message-list" aria-live="polite">
            {!document && !uploading && (
              <div className="empty-state">
                <div className="spark">✦</div>
                <h3>Your PDF becomes searchable here.</h3>
                <p>Upload a document to ask for summaries, explanations, facts, or comparisons.</p>
              </div>
            )}
            {uploading && <div className="processing"><i /> Indexing the document for reliable search…</div>}
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <p>{message.text}</p>
                {message.citations && message.citations.length > 0 && (
                  <div className="citations" aria-label="Sources">
                    {message.citations.map((citation, citationIndex) => (
                      <span key={`${citation.fileName}-${citation.index}-${citationIndex}`}>
                        {citation.filename || "Document source"}{citation.pageNumber ? ` · p. ${citation.pageNumber}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {asking && <article className="message assistant pending"><i /><i /><i /></article>}
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <form className="composer" onSubmit={ask}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={document ? "Ask a question about this PDF…" : "Upload a PDF to begin"}
              disabled={!document || uploading || asking}
              maxLength={1_500}
              aria-label="Question about the PDF"
            />
            <button disabled={!document || !question.trim() || asking || uploading} type="submit">
              {asking ? "Thinking…" : "Ask"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
