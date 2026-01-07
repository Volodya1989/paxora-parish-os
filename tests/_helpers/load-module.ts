import { resolveFromRoot } from "./resolve";

const preferNamedExports = <T>(mod: Record<string, unknown>): T => {
  if (!("default" in mod)) {
    return mod as T;
  }

  const defaultExport = mod.default;
  if (defaultExport && typeof defaultExport === "object") {
    return { ...defaultExport, ...mod } as T;
  }

  if (Object.keys(mod).length === 1) {
    return defaultExport as T;
  }

  return mod as T;
};

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const mod = (await import(resolveFromRoot(path))) as Record<string, unknown>;
  return preferNamedExports<T>(mod);
};
