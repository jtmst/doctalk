import { streamText } from "ai";
import { getToken } from "@auth/core/jwt";
import { getNamespaceKey } from "@/lib/vectorstore";
import { retrieveContext, buildSystemPrompt } from "@/lib/rag";
import { getChatModel } from "@/lib/chat";
import { CHAT_LIMITS } from "@/lib/config";
import { DocTalkError, errorToStatus } from "@/lib/errors";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function sanitizeMessages(raw: unknown[]): ChatMessage[] | null {
  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (typeof m !== "object" || m === null) return null;
    const msg = m as Record<string, unknown>;
    if (
      typeof msg.role !== "string" ||
      typeof msg.content !== "string" ||
      !["user", "assistant"].includes(msg.role)
    ) {
      return null;
    }
    messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
  }
  return messages;
}

export async function POST(req: Request) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET! });
  if (!token?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: unknown; folderId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.folderId || typeof body.folderId !== "string" || !Array.isArray(body.messages)) {
    return Response.json({ error: "Missing folderId or messages" }, { status: 400 });
  }

  if (body.messages.length > CHAT_LIMITS.maxMessages) {
    return Response.json({ error: `Too many messages (limit: ${CHAT_LIMITS.maxMessages})` }, { status: 400 });
  }

  const messages = sanitizeMessages(body.messages);
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
    const namespaceKey = getNamespaceKey(token.id, body.folderId);
    const chunks = await retrieveContext(namespaceKey, lastQuestion);
    const system = buildSystemPrompt(chunks);

    const result = streamText({ model: getChatModel(), system, messages });
    return result.toUIMessageStreamResponse({
      onError: () => "An error occurred while generating the response",
    });
  } catch (error) {
    if (error instanceof DocTalkError) {
      return Response.json({ error: error.message }, { status: errorToStatus(error) });
    }
    return Response.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
