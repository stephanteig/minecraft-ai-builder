import { unzipSync } from 'fflate';

export type ResourcePack = { files: Map<string, Uint8Array>; label: string };

export function parseResourcePack(bytes: Uint8Array, label = 'Minecraft resource pack'): ResourcePack {
  let archive: Record<string, Uint8Array>;
  try { archive = unzipSync(bytes); }
  catch { throw new Error('Could not read this ZIP/JAR. Choose a Java client JAR or resource-pack ZIP.'); }
  const files = new Map<string, Uint8Array>();
  for (const [rawPath, value] of Object.entries(archive)) {
    const path = rawPath.replace(/^\.\//, '');
    if (path.startsWith('assets/') && !path.endsWith('/')) files.set(path, value);
  }
  const hasModels = [...files.keys()].some((path) => /^assets\/[^/]+\/blockstates\/[^/]+\.json$/.test(path));
  if (!hasModels) throw new Error('This archive contains no Minecraft blockstate assets under assets/<namespace>/blockstates.');
  return { files, label };
}
