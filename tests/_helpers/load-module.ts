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
  if (!("default" in mod)) {
    return mod as T;
  }

  const exportKeys = getExportKeys(mod);
  if (exportKeys.length === 1 && exportKeys[0] === "default") {
    return unwrapDefaultExport(mod.default) as T;
  }

  const defaultExport = unwrapDefaultExport(mod.default);
  if (defaultExport && (typeof defaultExport === "object" || typeof defaultExport === "function")) {
    if (getExportKeys(mod).length === 1) {
      return defaultExport as T;
    }
    const descriptors = {
      ...getAllPropertyDescriptors(defaultExport as Record<string, unknown>),
      ...Object.getOwnPropertyDescriptors(mod)
    };
    return Object.defineProperties({}, descriptors) as T;
  }

  if (getExportKeys(mod).length === 1) {
    return defaultExport as T;
  }

  return mod as T;
};

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const mod = (await import(resolveFromRoot(path))) as Record<string, unknown>;
  return preferNamedExports<T>(mod);
};
