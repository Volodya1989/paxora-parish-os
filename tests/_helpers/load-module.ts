import { resolveFromRoot } from "./resolve";

/**
 * Walks the `.default` chain of a module namespace object and returns the
 * first level that contains at least one own, non-"default", defined property.
 *
 * tsx compiles TypeScript to CJS-style output.  When Node's ESM loader wraps
 * that as an ES module namespace the real exports live under `.default`.
 * Depending on the Node version and flags (e.g. --experimental-test-module-mocks)
 * there may be one or more levels of `.default` wrapping, and the top-level
 * namespace may carry metadata properties added by the mock loader.
 *
 * Strategy: prefer levels that expose *function* exports.  Only fall back to
 * non-function exports when there is nowhere deeper to look.
 */
function extractExports<T>(mod: Record<string, unknown>, path: string): T {
  const seen = new Set<unknown>();
  let current: unknown = mod;
  let bestNonFunctionLevel: unknown = undefined;

  for (let depth = 0; depth < 6; depth++) {
    if (!current || (typeof current !== "object" && typeof current !== "function")) {
      break;
    }
    if (seen.has(current)) break;
    seen.add(current);

    const record = current as Record<string, unknown>;
    const keys = Object.getOwnPropertyNames(record).filter(
      (k) => k !== "default" && k !== "__esModule"
    );

    // Diagnostic: always log structure on stderr so CI output reveals it
    const typeSnippet = keys.slice(0, 5).map((k) => `${k}:${typeof record[k]}`);
    console.error(
      `[loadModuleFromRoot] "${path}" depth=${depth} ownKeys=[${typeSnippet}]${
        "default" in record ? " hasDefault" : ""
      }`
    );

    const hasFunctions = keys.some((k) => typeof record[k] === "function");
    const hasDefined = keys.some((k) => record[k] !== undefined);

    // Best case: this level has function exports → use it
    if (hasFunctions) {
      return current as T;
    }

    // Remember the first level that has any defined exports (even non-functions)
    if (hasDefined && bestNonFunctionLevel === undefined) {
      bestNonFunctionLevel = current;
    }

    // Try to descend into .default
    if ("default" in record && record.default !== undefined) {
      current = record.default;
    } else {
      break;
    }
  }

  // If we never found functions, return the best non-function level (or last)
  const result = bestNonFunctionLevel ?? current;

  console.error(
    `[loadModuleFromRoot] "${path}" resolved to ${typeof result}` +
      (result && typeof result === "object"
        ? ` keys=[${Object.getOwnPropertyNames(result)
            .filter((k) => k !== "__esModule")
            .slice(0, 5)}]`
        : "")
  );

  return result as T;
}

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const url = resolveFromRoot(path);
  const mod = (await import(url)) as Record<string, unknown>;
  return extractExports<T>(mod, path);
};
