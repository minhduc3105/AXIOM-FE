/** Prefer a recognizable collision-renamed storage filename over its original label. */
export function fileDisplayName(
  objectKey: string,
  originalName?: string,
): string {
  const storedName = objectKey.split("/").pop() || objectKey;
  if (!originalName) return storedName;
  const leaf = originalName.split("/").pop() || originalName;
  const dot = leaf.lastIndexOf(".");
  const stem = dot > 0 ? leaf.slice(0, dot) : leaf;
  const extension = dot > 0 ? leaf.slice(dot) : "";
  if (!storedName.startsWith(stem) || !storedName.endsWith(extension))
    return originalName;
  const suffix = storedName.slice(
    stem.length,
    extension ? -extension.length : undefined,
  );
  if (!/^(?: \([1-9]\d*\)|-[1-9]\d*)$/.test(suffix)) return originalName;
  return originalName.slice(0, originalName.length - leaf.length) + storedName;
}
