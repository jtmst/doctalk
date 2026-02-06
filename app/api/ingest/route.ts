import { getToken } from "@auth/core/jwt";
import { getNamespaceKey, getNamespaceInfo } from "@/lib/vectorstore";
import { ingestFolder, type IngestionEvent } from "@/lib/ingestion";
import { DocTalkError, errorToStatus } from "@/lib/errors";

export async function POST(req: Request) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET! });
  if (!token?.id || !token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { folderId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.folderId || typeof body.folderId !== "string" || body.folderId.length > 128) {
    return Response.json({ error: "Missing or invalid folderId" }, { status: 400 });
  }

  const folderId = body.folderId;

  let namespaceKey: string;
  try {
    namespaceKey = getNamespaceKey(token.id, folderId);
    const { vectorCount } = await getNamespaceInfo(namespaceKey);
    if (vectorCount > 0) {
      return Response.json({ status: "already_indexed", vectorCount });
    }
  } catch (error) {
    if (error instanceof DocTalkError) {
      return Response.json({ error: error.message }, { status: errorToStatus(error) });
    }
    return Response.json({ error: "Failed to check index status" }, { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: IngestionEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await ingestFolder({ folderId, accessToken: token.accessToken, namespaceKey, onProgress: send });
      } catch (error) {
        const message = error instanceof DocTalkError
          ? error.message
          : "An unexpected error occurred during ingestion";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
