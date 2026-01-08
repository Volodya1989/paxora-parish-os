import { existsSync, statSync } from "node:fs";
import { extname, resolve as pathResolve } from "node:path";
import { pathToFileURL } from "node:url";

const extensionCandidates = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

const resolveModulePath = (absolutePath: string) => {
  if (existsSync(absolutePath)) {
    const stats = statSync(absolutePath);
    if (stats.isFile()) {
      return absolutePath;
    }
    if (stats.isDirectory()) {
      for (const extension of extensionCandidates) {
        const indexPath = pathResolve(absolutePath, `index${extension}`);
        if (existsSync(indexPath)) {
          return indexPath;
        }
      }
    }
  }

  if (!extname(absolutePath)) {
    for (const extension of extensionCandidates) {
      const candidate = `${absolutePath}${extension}`;
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return absolutePath;
};

export const resolveFromRoot = (path: string) => {
  const absolutePath = pathResolve(process.cwd(), path);
  return pathToFileURL(resolveModulePath(absolutePath)).href;
};
