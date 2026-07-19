export type DocumentStatus = "ready" | "processing" | "failed";

export type DocumentRecord = {
  id: string;
  name: string;
  size: number;
  status: DocumentStatus;
  createdAt: string;
  fileSearchStoreName: string;
};

export type ChatCitation = {
  fileName?: string;
  filename?: string;
  index: number;
  pageNumber?: number;
};
