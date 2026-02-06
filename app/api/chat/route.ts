import { streamText } from "ai";
import { getNamespaceKey } from "@/lib/vectorstore";
import { retrieveContext, buildSystemPrompt } from "@/lib/rag";
import { getChatModel } from "@/lib/chat";
import { CHAT_LIMITS } from "@/lib/config";
import { DocTalkError, errorToStatus, safeErrorMessage } from "@/lib/errors";
import { requireToken, parseJsonBody, validateFolderId } from "@/lib/api/helpers";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function extractTextFromParts(parts: unknown): string | null {
  if (!Array.isArray(parts)) return null;
  const texts: string[] = [];
  for (const p of parts) {
    if (typeof p !== "object" || p === null) continue;
    const part = p as Record<string, unknown>;
    if (part.type === "text" && typeof part.text === "string") {
      texts.push(part.text);
    }
  }
  return texts.length > 0 ? texts.join("") : null;
}

function sanitizeMessages(raw: unknown[]): ChatMessage[] | null {
  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (typeof m !== "object" || m === null) return null;
    const msg = m as Record<string, unknown>;
    if (typeof msg.role !== "string" || !["user", "assistant"].includes(msg.role)) {
      return null;
    }

    const content =
      extractTextFromParts(msg.parts) ??
      (typeof msg.content === "string" ? msg.content : null);
    if (content === null) return null;

    messages.push({ role: msg.role as "user" | "assistant", content });
  }
  return messages;
}

export async function POST(req: Request) {
  const tokenResult = await requireToken(req);
  if (tokenResult instanceof Response) return tokenResult;

  const bodyResult = await parseJsonBody<{ messages?: unknown; folderId?: string }>(req);
  if (bodyResult instanceof Response) return bodyResult;

  const folderId = validateFolderId(bodyResult.folderId);
  if (!folderId || !Array.isArray(bodyResult.messages)) {
    return Response.json({ error: "Missing folderId or messages" }, { status: 400 });
  }

  if (bodyResult.messages.length > CHAT_LIMITS.maxMessages) {
    return Response.json({ error: `Too many messages (limit: ${CHAT_LIMITS.maxMessages})` }, { status: 400 });
  }

  const messages = sanitizeMessages(bodyResult.messages);
  if (!messages) {
    return Response.json({ error: "Invalid message format" }, { status: 400 });
  }

  if (messages.some((m) => m.content.length > CHAT_LIMITS.maxMessageLength)) {
    return Response.json({ error: "Message too long" }, { status: 400 });
  }

  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content;
  if (!lastQuestion) {
    return Response.json({ error: "No user message found" }, { status: 400 });
  }

  try {
    const namespaceKey = getNamespaceKey(tokenResult.id, folderId);
    const chunks = await retrieveContext(namespaceKey, lastQuestion);
    const system = buildSystemPrompt(chunks);

    const sources = chunks.map((c) => ({
      fileName: c.metadata.fileName,
      fileUrl: c.metadata.fileUrl,
      mimeType: c.metadata.mimeType,
      text: c.text,
      pageNumbers: c.metadata.pageNumbers,
    }));

    const result = streamText({ model: getChatModel(), system, messages });
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "start") return { sources };
      },
      onError: (error) => {
        console.error("[chat] stream error:", error);
        return "An error occurred while generating the response";
      },
    });
  } catch (error) {
    console.error("[chat] error:", error);
    if (error instanceof DocTalkError) {
      return Response.json({ error: safeErrorMessage(error) }, { status: errorToStatus(error) });
    }
    return Response.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
