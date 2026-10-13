const DEFAULT_PUBLICATION_ORIGIN = "https://finnblog.pe.kr";
const DEFAULT_TOOL_ORIGIN = "https://app.finnblog.pe.kr";

function normalizeOrigin(value: string, variableName: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be an absolute HTTP(S) origin.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${variableName} must use HTTP or HTTPS.`);
  }

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${variableName} must contain an origin only, without a path, query, or hash.`);
  }

  return url.origin;
}

export const toolSiteConfig = {
  publicationOrigin: normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_PUBLICATION_ORIGIN,
    "NEXT_PUBLIC_SITE_URL",
  ),
  toolOrigin: normalizeOrigin(
    process.env.NEXT_PUBLIC_TOOL_URL || DEFAULT_TOOL_ORIGIN,
    "NEXT_PUBLIC_TOOL_URL",
  ),
} as const;

if (toolSiteConfig.publicationOrigin === toolSiteConfig.toolOrigin) {
  throw new Error("Publication and tool origins must be different.");
}
