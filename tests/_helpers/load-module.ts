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

const unwrapDefaultExport = (value: unknown) => {
  let current = value;
  let depth = 0;

  while (
    current &&
    (typeof current === "object" || typeof current === "function") &&
    depth < 3
  ) {
    const keys = getExportKeys(current as Record<string, unknown>);
    if (keys.length === 1 && keys[0] === "default") {
      current = (current as Record<string, unknown>).default;
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

  // Only default export
  if (exportKeys.length === 1 && exportKeys[0] === "default") {
    return unwrapDefaultExport(mod.default) as T;
  }

  const defaultExport = unwrapDefaultExport(mod.default);

  // ✅ If default is a function (Next.js page), preserve callability
  if (typeof defaultExport === "function") {
    const fn = defaultExport as unknown as Record<string, unknown>;
    const modDescriptors = Object.getOwnPropertyDescriptors(mod);

    for (const [key, desc] of Object.entries(modDescriptors)) {
      if (key === "default" || key === "__esModule") continue;
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

  return unwrapDefaultExport(candidate.default) as T;
};

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const mod = (await import(resolveFromRoot(path))) as Record<string, unknown>;
  const preferred = preferNamedExports<T>(mod);
  return unwrapDefaultIfPresent<T>(preferred);
};
