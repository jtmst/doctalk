const FOLDER_URL_PATTERNS = [
  /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
];

const BARE_FOLDER_ID = /^[a-zA-Z0-9_-]{10,}$/;

export function parseFolderUrl(input: string): string | null {
  const trimmed = input.trim();

  for (const pattern of FOLDER_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (BARE_FOLDER_ID.test(trimmed)) return trimmed;

  return null;
}
