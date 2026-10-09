/**
 * trade2 search ids are the search query itself: JSON, gzip-compressed, base64url-encoded
 * (they start with "H4sI", the base64 form of the gzip magic bytes). Decoding needs no request.
 */
export function isEncodedSearchId(id: string): boolean {
  return id.startsWith('H4sI');
}

/** Ids decompressing to more than this are rejected (zip bombs in imported folder codes). */
export const MAX_DECODED_BYTES = 256 * 1024;

export async function decodeSearchId(id: string): Promise<unknown | null> {
  if (!isEncodedSearchId(id)) return null;
  try {
    const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_DECODED_BYTES) {
        void reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return null;
  }
}
