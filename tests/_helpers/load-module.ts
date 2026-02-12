import { resolveFromRoot } from "./resolve";

/**
 * Walks the `.default` chain of a module namespace object and returns the
 * first level that contains at least one own, non-"default", defined property.
 *
 * tsx compiles TypeScript to CJS-style output.  When Node's ESM loader wraps
 * that as an ES module namespace the real exports live under `.default`.
 * Depending on the Node version and flags (e.g. --experimental-test-module-mocks)
 * there may be one or more levels of `.default` wrapping, and the top-level
 * namespace may or may not carry "ghost" keys with `undefined` values.
 *
 * This function handles all those cases by simply walking down until it finds
 * real exports.
 */
function extractExports<T>(mod: Record<string, unknown>, path: string): T {
  const seen = new Set<unknown>();
  let current: unknown = mod;

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

    // Check if at least one non-default property has a defined value
    if (keys.length > 0 && keys.some((k) => record[k] !== undefined)) {
      return current as T;
    }

    // No real exports here — descend into .default
    if ("default" in record && record.default !== undefined) {
      current = record.default;
    } else {
      break;
    }
  }

  // Diagnostic: if we get here without finding exports, log info for debugging
  console.error(
    `[loadModuleFromRoot] Could not find exports for "${path}".`,
    `Final value type: ${typeof current}.`,
    `Raw module keys: ${Object.getOwnPropertyNames(mod)}.`,
    mod.default != null
      ? `mod.default keys: ${Object.getOwnPropertyNames(mod.default)}`
      : "mod.default is nullish"
  );

  return current as T;
}

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const url = resolveFromRoot(path);
  const mod = (await import(url)) as Record<string, unknown>;
  return extractExports<T>(mod, path);
};
