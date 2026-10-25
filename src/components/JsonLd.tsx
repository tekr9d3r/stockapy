/**
 * JSON for embedding inside a <script> tag. JSON.stringify leaves "<" alone, so
 * a value containing "</script>" would end the tag and run whatever follows.
 * Some values here (pool and token names) come from third parties, so the
 * characters that matter in HTML are escaped as JSON unicode escapes, which
 * JSON parsers read back unchanged.
 */
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Renders schema.org JSON-LD. Several blocks per page is valid and normal. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonForScript(block) }} />
      ))}
    </>
  );
}
