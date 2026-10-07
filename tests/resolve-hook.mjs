import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exts = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"];

function withExtension(abs) {
  if (path.extname(abs) && existsSync(abs)) return abs;
  for (const ext of exts) {
    if (existsSync(abs + ext)) return abs + ext;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("node:") || specifier.startsWith("file:") || specifier.startsWith("data:")) {
    return nextResolve(specifier, context);
  }
  if (specifier.startsWith("next/") && !path.extname(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }
  let target = specifier;
  if (specifier.startsWith("@/")) {
    target = path.join(repo, "src", specifier.slice(2));
  }
  if (specifier.startsWith("@/") || target.startsWith(".") || path.isAbsolute(target)) {
    const parent = context.parentURL ? fileURLToPath(context.parentURL) : path.join(repo, "package.json");
    const abs = path.isAbsolute(target) ? target : path.resolve(path.dirname(parent), target);
    const resolved = withExtension(abs);
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }
  return nextResolve(specifier, context);
}
