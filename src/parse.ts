import { ZodSchema, z } from "zod";
import axios from "axios";
import zodToJsonSchema from "zod-to-json-schema";

export default async function parse<T extends ZodSchema>(
  zod: T,
  example: object,
  payload: string,
  instruction: string,
  options: { apiKey?: string }
): Promise<z.infer<T>> {
  const apiKey =
    options?.apiKey ??
    z.string().startsWith("ai_").parse(process.env.COSMO_AI_KEY);

  if (!apiKey) throw new Error("Missing COSMO_AI_KEY");

  const schema = zodToJsonSchema(zod);

  const testExample = zod.safeParse(example);

  if (!testExample.success) throw new Error("Invalid example");

  const response = await axios.post<{
    data: { parse_test: { parsed: T } };
  }>(
    "https://apis.ai.cosmoconsult.com/graphql",
    {
      query: `mutation parse($schema: String!, $example: String!, $payload: String!, $instruction: String!) {
  parse_test(
    schema: $schema
    example: $example
    payload: $payload
    instruction: $instruction
  ) {
    parsed
    __typename
  }
}
      `,
      variables: {
        schema: JSON.stringify(schema),
        example: JSON.stringify(example),
        payload,
        instruction,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    }
  );

  return response.data.data.parse_test?.parsed;
}
