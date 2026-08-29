declare module "papaparse" {
  type ParseResult = {
    data: string[][];
    errors: Array<{ message: string }>;
  };

  const Papa: {
    parse(
      input: string,
      options?: { delimiter?: string; skipEmptyLines?: boolean },
    ): ParseResult;
  };

  export default Papa;
}
