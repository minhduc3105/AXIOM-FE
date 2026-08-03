export function getBrowserStorageUrl(presignedUrl: string) {
  try {
    const url = new URL(presignedUrl);
    if (url.hostname === "minio" && url.port === "9000") {
      return `/storage${url.pathname}${url.search}`;
    }
  } catch {
    return presignedUrl;
  }

  return presignedUrl;
}
