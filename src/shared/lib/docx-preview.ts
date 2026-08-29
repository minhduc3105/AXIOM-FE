export async function convertDocxToHtml(arrayBuffer: ArrayBuffer) {
  const { default: mammoth } = await import("mammoth");
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
      ],
    },
  );
  return result.value;
}
