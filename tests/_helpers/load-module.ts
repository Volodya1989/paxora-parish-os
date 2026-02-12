import { resolveFromRoot } from "./resolve";

const getExportKeys = (value: unknown) =>
  Object.getOwnPropertyNames(value as Record<string, unknown>).filter(
    (key) => key !== "__esModule"
  );

const getAllPropertyDescriptors = (value: Record<string, unknown>) => {
  const descriptors: Record<string, PropertyDescriptor> = {};
  let current: object | null = value;

  while (current && current !== Object.prototype && current !== Function.prototype) {
    Object.assign(descriptors, Object.getOwnPropertyDescriptors(current));
    current = Object.getPrototypeOf(current);
  }

  return descriptors;
};

// Returns true when the object has at least one non-"default" own property
// whose value is not undefined.  Node 20's --experimental-test-module-mocks
// lists named exports on the module namespace but may leave them undefined;
// this helper detects that situation so callers can prefer the default export.
const hasDefinedNamedExports = (obj: Record<string, unknown>) => {
  const keys = getExportKeys(obj).filter((k) => k !== "default");
  return keys.length > 0 && keys.some((k) => obj[k] !== undefined);
};

const unwrapDefaultExport = (value: unknown) => {
  let current = value;
  let depth = 0;

  while (
    current &&
    (typeof current === "object" || typeof current === "function") &&
    depth < 3
  ) {
    const record = current as Record<string, unknown>;
    const keys = getExportKeys(record);
    // Unwrap when the only key is "default", OR when there are additional
    // keys but all non-default ones are undefined (Node 20 mock.module quirk)
    const isOnlyDefault = keys.length === 1 && keys[0] === "default";
    const isDefaultWithGhosts =
      keys.includes("default") && !hasDefinedNamedExports(record);
    if (isOnlyDefault || isDefaultWithGhosts) {
      current = record.default;
      depth += 1;
      continue;
    }
    break;
  }

  return current;
};

const preferNamedExports = <T>(mod: Record<string, unknown>): T => {
  if (!("default" in mod)) return mod as T;

  const exportKeys = getExportKeys(mod);
  if (exportKeys.length > 1 && hasDefinedNamedExports(mod)) {
    return mod as T;
  }

  // Only default export (or all named exports are undefined ghosts)
  if (
    (exportKeys.length === 1 && exportKeys[0] === "default") ||
    !hasDefinedNamedExports(mod)
  ) {
    return unwrapDefaultExport(mod.default) as T;
  }

  const defaultExport = unwrapDefaultExport(mod.default);

  // ✅ If default is a function (Next.js page), preserve callability
  if (typeof defaultExport === "function") {
    const fn = defaultExport as unknown as Record<string, unknown>;
    const modDescriptors = Object.getOwnPropertyDescriptors(mod);

    for (const [key, desc] of Object.entries(modDescriptors)) {
      if (key === "default" || key === "__esModule") continue;
      // Skip ghost descriptors with undefined values
      if ("value" in desc && desc.value === undefined) continue;
      Object.defineProperty(fn, key, desc);
    }

    return defaultExport as T;
  }

  // Default is object -> merge into a plain object (your original intent)
  if (defaultExport && typeof defaultExport === "object") {
    const defaultDescriptors = getAllPropertyDescriptors(defaultExport as Record<string, unknown>);
    const modDescriptors = Object.getOwnPropertyDescriptors(mod);

    // avoid carrying `default` / `__esModule` into merged result
    delete modDescriptors.default;
    delete modDescriptors.__esModule;

    // Filter out module-level descriptors whose value is undefined
    // (Node 20 --experimental-test-module-mocks lists named exports on
    //  the namespace but may leave them undefined)
    for (const key of Object.keys(modDescriptors)) {
      const desc = modDescriptors[key];
      if (desc && "value" in desc && desc.value === undefined) {
        delete modDescriptors[key];
      }
    }

    const descriptors = {
      ...defaultDescriptors,
      ...modDescriptors
    };

    return Object.defineProperties({}, descriptors) as T;
  }

  // Default is primitive, but module also has named exports
  return mod as T;
};


const unwrapDefaultIfPresent = <T,>(value: unknown) => {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return value as T;
  }

  const candidate = value as Record<string, unknown>;
  if (!("default" in candidate)) {
    return value as T;
  }

  const candidateKeys = getExportKeys(candidate);
  if (candidateKeys.length > 1 && hasDefinedNamedExports(candidate)) {
    return value as T;
  }

  return unwrapDefaultExport(candidate.default) as T;
};

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const mod = (await import(resolveFromRoot(path))) as Record<string, unknown>;
  const preferred = preferNamedExports<T>(mod);
  let normalized = unwrapDefaultIfPresent<T>(preferred);

  if (normalized && (typeof normalized === "object" || typeof normalized === "function")) {
    const normalizedRecord = normalized as Record<string, unknown>;
    const keys = getExportKeys(normalizedRecord);
    if (keys.length === 1 && keys[0] === "default") {
      return unwrapDefaultExport(normalizedRecord.default) as T;
    }

    if ("default" in normalizedRecord) {
      const defaultValue = normalizedRecord.default;
      if (defaultValue && (typeof defaultValue === "object" || typeof defaultValue === "function")) {
        normalized = unwrapDefaultExport(defaultValue) as T;
      }
    }
  }

  if (
    normalized &&
    typeof normalized === "object" &&
    !Array.isArray(normalized) &&
    !hasDefinedNamedExports(normalized as Record<string, unknown>) &&
    mod.default
  ) {
    return unwrapDefaultExport(mod.default) as T;
  }

  return normalized;
};
