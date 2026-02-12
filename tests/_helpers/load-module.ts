import { resolveFromRoot } from "./resolve";

const MAX_DEFAULT_DEPTH = 6;

type ModuleRecord = Record<string, unknown>;

type LevelInfo = {
  record: ModuleRecord;
  depth: number;
  keys: string[];
  hasCallable: boolean;
  hasDefined: boolean;
  hasAccessors: boolean;
};

const getExportKeys = (record: ModuleRecord) =>
  Object.getOwnPropertyNames(record).filter((k) => k !== "default" && k !== "__esModule");

const readExportValue = (record: ModuleRecord, key: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) return { value: undefined, descriptorType: "missing" };

  if (typeof descriptor.get === "function") {
    try {
      return { value: Reflect.get(record, key), descriptorType: "getter" };
    } catch {
      return { value: undefined, descriptorType: "getter" };
    }
  }

  return { value: descriptor.value, descriptorType: typeof descriptor.value };
};

/**
 * Walks a module namespace object's `.default` chain and returns a stable
 * export object that works across tsx + Node's experimental module mocks.
 */
function extractExports<T>(mod: ModuleRecord, path: string): T {
  const seen = new Set<unknown>();
  const levels: LevelInfo[] = [];
  let current: unknown = mod;

  for (let depth = 0; depth < MAX_DEFAULT_DEPTH; depth++) {
    if (!current || (typeof current !== "object" && typeof current !== "function")) {
      break;
    }
    if (seen.has(current)) break;
    seen.add(current);

    const record = current as ModuleRecord;
    const keys = getExportKeys(record);

    let hasCallable = false;
    let hasDefined = false;
    let hasAccessors = false;

    const diagnostic = keys.slice(0, 5).map((key) => {
      const { value, descriptorType } = readExportValue(record, key);
      if (descriptorType === "getter") {
        hasAccessors = true;
      }
      if (value !== undefined) {
        hasDefined = true;
      }
      if (typeof value === "function") {
        hasCallable = true;
      }
      return `${key}:${descriptorType === "getter" ? "getter" : typeof value}`;
    });

    levels.push({ record, depth, keys, hasCallable, hasDefined, hasAccessors });

    console.error(
      `[loadModuleFromRoot] "${path}" depth=${depth} ownKeys=[${diagnostic}]${
        "default" in record ? " hasDefault" : ""
      }`
    );

    if ("default" in record && record.default !== undefined) {
      current = record.default;
    } else {
      break;
    }
  }

  const preferred =
    levels.find((level) => level.hasCallable) ??
    levels.find((level) => level.hasDefined) ??
    levels.find((level) => level.hasAccessors) ??
    levels.at(-1);

  if (!preferred) {
    return mod as T;
  }

  const merged: ModuleRecord = {};
  const startIndex = levels.findIndex((l) => l.depth === preferred.depth);

  for (const level of levels.slice(startIndex)) {
    for (const key of level.keys) {
      if (key in merged) continue;
      const { value } = readExportValue(level.record, key);
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  const result: unknown = Object.keys(merged).length > 0 ? merged : preferred.record;

  console.error(
    `[loadModuleFromRoot] "${path}" resolved to ${typeof result}` +
      (result && typeof result === "object"
        ? ` keys=[${Object.getOwnPropertyNames(result).filter((k) => k !== "__esModule").slice(0, 5)}]`
        : "")
  );

  return result as T;
}

export const loadModuleFromRoot = async <T,>(path: string): Promise<T> => {
  const url = resolveFromRoot(path);
  const mod = (await import(url)) as ModuleRecord;
  return extractExports<T>(mod, path);
};
