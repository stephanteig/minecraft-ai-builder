export type JsonObject = Record<string, any>;
export type ModelRef = { model: string; x?: number; y?: number; uvlock?: boolean; weight?: number };
export type ResolvedVariant = { model: JsonObject; x: number; y: number; uvlock: boolean };

export function parseJsonFile(files: Map<string, Uint8Array>, path: string): JsonObject {
  const bytes = files.get(path);
  if (!bytes) throw new Error(`Resource pack is missing ${path}.`);
  try { return JSON.parse(new TextDecoder().decode(bytes)) as JsonObject; }
  catch { throw new Error(`Resource pack file ${path} is not valid JSON.`); }
}

export function modelPath(identifier: string): string {
  const [namespace, ...rest] = identifier.includes(':') ? identifier.split(':') : ['minecraft', identifier];
  return `assets/${namespace}/models/${rest.join(':')}.json`;
}

export async function resolveModel(files: Map<string, Uint8Array>, identifier: string, cache = new Map<string, JsonObject>(), stack = new Set<string>()): Promise<JsonObject> {
  const path = modelPath(identifier);
  const cached = cache.get(path);
  if (cached) return cached;
  if (stack.has(path)) throw new Error(`Minecraft model parent cycle at ${identifier}.`);
  stack.add(path);
  const source = parseJsonFile(files, path);
  const parent = typeof source.parent === 'string' && source.parent !== 'builtin/generated'
    ? await resolveModel(files, source.parent, cache, stack)
    : {};
  const resolved: JsonObject = {
    ...parent,
    ...source,
    textures: { ...(parent.textures ?? {}), ...(source.textures ?? {}) },
    ...(source.elements === undefined && parent.elements ? { elements: parent.elements } : {}),
  };
  delete resolved.parent;
  stack.delete(path);
  cache.set(path, resolved);
  return resolved;
}

function conditionMatches(condition: unknown, properties: Record<string, string>): boolean {
  if (Array.isArray(condition)) return condition.some((item) => conditionMatches(item, properties));
  if (!condition || typeof condition !== 'object') return true;
  const record = condition as JsonObject;
  if (typeof record.OR === 'object') return conditionMatches(record.OR, properties);
  if (typeof record.AND === 'object') return conditionMatches(record.AND, properties) && Object.entries(record).filter(([k]) => k !== 'AND').every(([k, v]) => properties[k] === String(v));
  return Object.entries(record).every(([key, value]) => {
    if (key === 'OR' || key === 'AND') return conditionMatches({ [key]: value }, properties);
    const actual = properties[key];
    return actual !== undefined && String(value).split('|').includes(actual);
  });
}

function chooseWeighted(items: ModelRef[], seed: number): ModelRef | undefined {
  if (items.length <= 1) return items[0];
  const total = items.reduce((sum, item) => sum + Math.max(1, item.weight ?? 1), 0);
  let pick = Math.abs(seed) % total;
  for (const item of items) { pick -= Math.max(1, item.weight ?? 1); if (pick < 0) return item; }
  return items[0];
}

export async function selectBlockModels(
  files: Map<string, Uint8Array>,
  id: string,
  properties: Record<string, string>,
  position: [number, number, number],
  cache = new Map<string, JsonObject>(),
): Promise<ResolvedVariant[]> {
  const [namespace, blockId] = id.includes(':') ? id.split(':') : ['minecraft', id];
  const statePath = `assets/${namespace}/blockstates/${blockId}.json`;
  const blockstate = parseJsonFile(files, statePath);
  const refs: ModelRef[] = [];
  if (blockstate.variants) {
    const entries = Object.entries(blockstate.variants as Record<string, ModelRef | ModelRef[]>);
    const matches = entries.filter(([key]) => key.split(',').filter(Boolean).every((part) => {
      const [name, value] = part.split('='); return properties[name] === value;
    }));
    matches.sort((a, b) => b[0].split(',').filter(Boolean).length - a[0].split(',').filter(Boolean).length);
    const selected = matches[0]?.[1];
    if (selected) { const choice = chooseWeighted(Array.isArray(selected) ? selected : [selected], position[0] * 31 + position[1] * 17 + position[2]); if (choice) refs.push(choice); }
  }
  if (Array.isArray(blockstate.multipart)) {
    for (const part of blockstate.multipart as Array<{ when?: unknown; apply: ModelRef | ModelRef[] }>) {
      if (conditionMatches(part.when, properties)) { const choice = chooseWeighted(Array.isArray(part.apply) ? part.apply : [part.apply], position[0] * 31 + position[1] * 17 + position[2]); if (choice) refs.push(choice); }
    }
  }
  if (!refs.length) return [];
  return Promise.all(refs.map(async (ref) => ({ model: await resolveModel(files, ref.model, cache), x: ref.x ?? 0, y: ref.y ?? 0, uvlock: ref.uvlock ?? false })));
}

export function resolveTexture(model: JsonObject, reference: string): string {
  let value = reference;
  const visited = new Set<string>();
  while (value.startsWith('#')) {
    const key = value.slice(1);
    if (visited.has(key)) return 'minecraft:block/missingno';
    visited.add(key);
    const next = model.textures?.[key];
    if (typeof next === 'string') value=next;
    else if (next && typeof next === 'object' && typeof next.sprite === 'string') value=next.sprite;
    else return 'minecraft:block/missingno';
  }
  if (value.startsWith('#')) return 'minecraft:block/missingno';
  if (value.startsWith('minecraft:')) return value;
  if (value.includes(':')) return value;
  return `minecraft:${value.startsWith('block/') || value.startsWith('item/') ? value : `block/${value}`}`;
}
