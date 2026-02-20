import { z } from 'zod';

/**
 * Coerce a JSON string into an object before Zod validation.
 *
 * Some MCP clients may send object parameters as JSON strings when they
 * haven't loaded the tool schema. This wrapper gracefully handles that
 * by parsing the string before validation.
 */
export function jsonCoerce<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, schema);
}
