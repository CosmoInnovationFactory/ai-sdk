import { ZodSchema, z, infer as Infer } from "npm:zod@3.23";
import axios from "npm:axios@1.7";
import zodToJsonSchema from "npm:zod-to-json-schema@3.23";

type ZodInfer<T extends ZodSchema> = Infer<T>;

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
 * @returns {Promise<ZodInfer<T>>} - The parsed payload as inferred by the Zod schema.
 * @throws {Error} - Throws an error if API key is missing or if the example is invalid.
 */
export default async function parse<T extends ZodSchema>(
  zod: T,
  payload: string,
  instruction: string,
  options: { apiKey?: string; model?: string },
  retryCount = 0
): Promise<ZodInfer<T>> {
  const apiKey = z
    .string()
    .startsWith("ai_")
    .parse(options?.apiKey ?? process.env.COSMO_AI_KEY);

  if (!apiKey) throw new Error("Missing COSMO_AI_KEY");

  const schema = zodToJsonSchema(zod);

  const response = await axios
    .post<z.infer<T>>(
      "https://apis.ai.cosmoconsult.com/parse",
      {
        model: options?.model ?? "gpt-4o",
        schema: schema,
        payload,
        instruction,
      },
      {
        headers: {
          "api-key": apiKey,
        },
      }
    )
    .catch((error) => {
      if (error.response?.status === 400) {
        // TODO remove, once there are structured outputs in the API
        if (retryCount < 3)
          return parse(zod, payload, instruction, options, retryCount + 1);

        throw error;
      }
    });

  return response.data;
}
