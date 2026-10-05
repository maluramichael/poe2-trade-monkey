/**
 * trade2 search ids are the search query itself: JSON, gzip-compressed, base64url-encoded
 * (they start with "H4sI", the base64 form of the gzip magic bytes). Decoding needs no request.
 */
export function isEncodedSearchId(id: string): boolean {
  return id.startsWith('H4sI');
}

export async function decodeSearchId(id: string): Promise<unknown | null> {
  if (!isEncodedSearchId(id)) return null;
  try {
    const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  } catch {
    return null;
  }
}
