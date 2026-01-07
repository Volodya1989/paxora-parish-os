import { resolve as pathResolve } from "node:path";
import { pathToFileURL } from "node:url";

export const resolveFromRoot = (path: string) =>
  pathToFileURL(pathResolve(process.cwd(), path)).href;
