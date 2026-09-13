const XML_ESCAPES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};

export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => XML_ESCAPES[c]);
}

/**
 * Downloads an image and returns a base64 data URI.
 * External <image href> URLs are stripped when GitHub renders an SVG inside
 * an <img>, so any image shown on a profile must be inlined this way.
 */
export async function fetchDataUri(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "profile-metrics" } });
  if (!res.ok) throw new Error(`fetch image ${res.status}: ${url}`);
  const type = res.headers.get("content-type") ?? "image/png";
  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return `data:${type};base64,${base64}`;
}
