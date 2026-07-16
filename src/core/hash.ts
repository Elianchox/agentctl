import { createHash } from "node:crypto";
import fs from "fs-extra";
import path from "node:path";

/**
 * Calcula un hash SHA-256 estable para una ruta de recurso, sea carpeta o archivo
 * suelto (los commands de algunos targets son un único .md).
 * Si la ruta no existe (recurso aún no instalado), devuelve null.
 */
export async function hashPath(target: string): Promise<string | null> {
  if (!(await fs.pathExists(target))) return null;

  const stat = await fs.stat(target);
  const combinedHash = createHash("sha256");

  if (stat.isFile()) {
    combinedHash.update(await fs.readFile(target));
    return combinedHash.digest("hex");
  }

  // Carpeta: recorre todos los archivos en orden alfabético y concatena su
  // contenido, así el hash no cambia por orden del filesystem pero sí cambia
  // si cualquier archivo cambia de contenido, se agrega o se borra.
  const files = await listFilesRecursive(target);
  files.sort();
  for (const file of files) {
    const relPath = path.relative(target, file);
    const content = await fs.readFile(file);
    combinedHash.update(relPath);
    combinedHash.update(content);
  }
  return combinedHash.digest("hex");
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}
