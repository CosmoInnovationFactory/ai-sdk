import { ZodSchema, z } from "zod";
import axios from "axios";
import zodToJsonSchema from "zod-to-json-schema";

/**
 * Parses the provided payload according to the specified Zod schema.
 *
 * @template T - The Zod schema type.
 * @param {T} zod - The Zod schema to validate against.
 * @param {object} example - An example object to validate the schema.
 * @param {string} payload - The payload to be parsed.
 * @param {string} instruction - Additional instructions for the parsing process.
 * @param {object} options - Options object.
 * @param {string} [options.apiKey] - Optional API key for authentication, otherwise COSMO_AI_KEY env var is used
 * @returns {Promise<z.infer<T>>} - The parsed payload as inferred by the Zod schema.
 * @throws {Error} - Throws an error if API key is missing or if the example is invalid.
 */
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
