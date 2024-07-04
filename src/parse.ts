import { ZodSchema, z } from "npm:zod@3.23";
import axios from "npm:axios@1.7";
import zodToJsonSchema from "npm:zod-to-json-schema@3.23";

/**
 * Parses the provided payload according to the specified Zod schema.
 *
 * @template T - The Zod schema type.
 * @param {T} zod - The Zod schema to validate against.
 * @param {string} payload - The payload to be parsed.
 * @param {string} instruction - Additional instructions for the parsing process.
 * @param {object} options - Options object.
 * @param {string} [options.apiKey] - Optional API key for authentication, otherwise COSMO_AI_KEY env var is used
 * @param {string} [options.model] - Optional model to use, otherwise gpt-4o is used
 * @returns {Promise<z.infer<T>>} - The parsed payload as inferred by the Zod schema.
 * @throws {Error} - Throws an error if API key is missing or if the example is invalid.
 */
export default async function parse<T extends ZodSchema>(
  zod: T,
  payload: string,
  instruction: string,
  options: { apiKey?: string; model?: string }
): Promise<z.infer<T>> {
  const apiKey = z
    .string()
    .startsWith("ai_")
    .parse(options?.apiKey ?? process.env.COSMO_AI_KEY);

  if (!apiKey) throw new Error("Missing COSMO_AI_KEY");

  const schema = zodToJsonSchema(zod);

  const response = await axios.post<z.infer<T>>(
    "https://apis.ai.cosmoconsult.com/parse",
    {
      model: options?.model ?? "gpt-4o",
      schema: JSON.stringify(schema),
      payload,
      instruction,
    },
    {
      headers: {
        "api-key": apiKey,
      },
    }
  );

  return response.data;
}
