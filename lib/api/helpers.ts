import { getToken } from "@auth/core/jwt";
import { MAX_FOLDER_ID_LENGTH } from "@/lib/config";

type TokenResult = { id: string; accessToken?: string };

export async function requireToken(req: Request): Promise<TokenResult | Response> {
  const secureCookie = process.env.AUTH_URL?.startsWith("https://") ?? false;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET!, secureCookie });
  if (!token?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { id: token.id, accessToken: token.accessToken };
}

export async function parseJsonBody<T>(req: Request): Promise<T | Response> {
  try {
    return await req.json() as T;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export function validateFolderId(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > MAX_FOLDER_ID_LENGTH) {
    return null;
  }
  return value;
}
