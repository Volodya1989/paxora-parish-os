import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolveFromRoot } from "./resolve";

/**
 * Walks the `.default` chain of a module namespace object and returns the
 * first level that contains at least one own, non-"default", defined property.
 *
 * tsx compiles TypeScript to CJS-style output.  When Node's ESM loader wraps
 * that as an ES module namespace the real exports may live under `.default`.
 * Depending on the Node version and flags (e.g. --experimental-test-module-mocks)
 * there may be one or more levels of `.default` wrapping, and the top-level
 * namespace may carry metadata properties added by the mock loader.
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

    const descriptors = new Map(
      keys.map((k) => [k, Object.getOwnPropertyDescriptor(record, k)])
    );

    // Diagnostic: log descriptor shape without reading live bindings.
    const typeSnippet = keys.slice(0, 5).map((k) => {
      const descriptor = descriptors.get(k);
      if (!descriptor) return `${k}:missing`;
      if (typeof descriptor.get === "function") return `${k}:getter`;
      return `${k}:${typeof descriptor.value}`;
    });
    console.error(
      `[loadModuleFromRoot] "${path}" depth=${depth} ownKeys=[${typeSnippet}]${
        "default" in record ? " hasDefault" : ""
      }`
    );

    const hasFunctions = keys.some((k) => {
      const descriptor = descriptors.get(k);
      return Boolean(
        descriptor &&
          (("value" in descriptor && typeof descriptor.value === "function") ||
            typeof descriptor.get === "function")
      );
    });

    const hasDefined = keys.some((k) => {
      const descriptor = descriptors.get(k);
      return Boolean(
        descriptor &&
          (typeof descriptor.get === "function" || descriptor.value !== undefined)
      );
    });

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

function isLikelyEmptyModule(value: unknown): boolean {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return true;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.getOwnPropertyNames(record).filter(
    (k) => k !== "default" && k !== "__esModule"
  );

  if (keys.length === 0) {
    return true;
  }

  return keys.every((k) => {
    const descriptor = Object.getOwnPropertyDescriptor(record, k);
    if (!descriptor) return true;
    if (typeof descriptor.get === "function") return false;
    return descriptor.value === undefined;
  });
}

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const url = resolveFromRoot(path);
  const mod = (await import(url)) as Record<string, unknown>;
  const extracted = extractExports<T>(mod, path);

  // Node 20 + --experimental-test-module-mocks can sometimes expose namespace
  // bindings as own keys with `undefined` values. When that happens, retry via
  // CJS require (tsx hooks still transpile TS) to recover callable exports.
  if (!isLikelyEmptyModule(extracted)) {
    return extracted;
  }

  try {
    const require = createRequire(import.meta.url);
    const required = require(fileURLToPath(url)) as Record<string, unknown>;
    const requiredExtracted = extractExports<T>(required, `${path} (require fallback)`);

    if (!isLikelyEmptyModule(requiredExtracted)) {
      return requiredExtracted;
    }
  } catch (error) {
    console.error(`[loadModuleFromRoot] "${path}" require fallback failed`, error);
  }

  return extracted;
};
