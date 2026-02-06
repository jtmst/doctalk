import { getNamespaceKey, getNamespaceInfo } from "@/lib/vectorstore";
import { ingestFolder, type IngestionEvent } from "@/lib/ingestion";
import { createDriveClient, getFolderName } from "@/lib/drive";
import { DocTalkError, errorToStatus, safeErrorMessage } from "@/lib/errors";
import { requireToken, parseJsonBody, validateFolderId } from "@/lib/api";

export async function POST(req: Request) {
  const tokenResult = await requireToken(req);
  if (tokenResult instanceof Response) return tokenResult;
  if (!tokenResult.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyResult = await parseJsonBody<{ folderId?: string }>(req);
  if (bodyResult instanceof Response) return bodyResult;

  const folderId = validateFolderId(bodyResult.folderId);
  if (!folderId) {
    return Response.json({ error: "Missing or invalid folderId" }, { status: 400 });
  }

  let namespaceKey: string;
  try {
    namespaceKey = getNamespaceKey(tokenResult.id, folderId);
    const { vectorCount } = await getNamespaceInfo(namespaceKey);
    if (vectorCount > 0) {
      const client = createDriveClient(tokenResult.accessToken);
      const folderName = await getFolderName(client, folderId);
      return Response.json({ status: "already_indexed", vectorCount, folderName });
    }
  } catch (error) {
    if (error instanceof DocTalkError) {
      return Response.json({ error: safeErrorMessage(error) }, { status: errorToStatus(error) });
    }
    console.error("[ingest] namespace check failed:", error);
    return Response.json({ error: "Failed to check index status" }, { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: IngestionEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await ingestFolder({ folderId, accessToken: tokenResult.accessToken!, namespaceKey, onProgress: send });
      } catch (error) {
        console.error("[ingest] pipeline error:", error);
        const message = error instanceof DocTalkError
          ? safeErrorMessage(error)
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
