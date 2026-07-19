import fs from "fs-extra";
import path from "node:path";

/**
 * Copia todo el contenido de `srcDir` a `destDir` excepto `meta.json`.
 * Ambos son directorios. Crea `destDir` si no existe.
 */
export async function copyResourceContent(
  srcDir: string,
  destDir: string
): Promise<void> {
  await fs.ensureDir(destDir);
  const entries = await fs.readdir(srcDir);
  for (const entry of entries) {
    if (entry === "meta.json") continue;
    await fs.copy(path.join(srcDir, entry), path.join(destDir, entry));
  }
}
