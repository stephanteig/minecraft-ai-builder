import { read, write, Int8, Int16, Int32, TAG, TAG_TYPE } from 'nbtify';
import type { Build, BlockState } from '../model';

export type Compound = Record<string, any>;
export function compound(value: unknown): Compound {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid NBT compound.');
  return value as Compound;
}
export function num(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error(`Invalid ${label} in schematic.`);
  return n;
}
export function list(value: unknown, label: string): any[] {
  if (!Array.isArray(value)) throw new Error(`Missing ${label} list.`);
  return value;
}
export function bytes(value: unknown, label: string): Uint8Array {
  if (value instanceof Uint8Array || value instanceof Int8Array) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new Error(`Missing ${label} byte array.`);
}
export async function readRoot(input: Uint8Array): Promise<Compound> {
  const parsed = await read(input, { endian: 'big', rootName: true });
  return compound(parsed.data);
}
export async function encodeRoot(rootName: string, value: Compound): Promise<Uint8Array> {
  return write(value, { endian: 'big', rootName, compression: 'gzip' });
}
export function rootCompound(root: Compound, expected: string): Compound {
  if (root[expected] && typeof root[expected] === 'object') return compound(root[expected]);
  return root;
}
export function stateFromName(value: unknown): BlockState {
  if (typeof value !== 'string') throw new Error('Invalid block state name.');
  const normalized=value.includes(':')?value:`minecraft:${value}`;
  const match = /^([a-z0-9_.-]+:[a-z0-9_./-]+)(?:\[([^\]]*)\])?$/.exec(normalized);
  if (!match) throw new Error(`Invalid block state: ${value}`);
  const properties: Record<string, string> = {};
  if (match[2]) for (const item of match[2].split(',')) {
    const [key, val, ...extra] = item.split('=');
    if (!key || val === undefined || extra.length) throw new Error(`Invalid block state property: ${item}`);
    properties[key] = val;
  }
  return { id: match[1], properties };
}
export function stateName(state: BlockState): string {
  const props = Object.entries(state.properties).sort(([a],[b]) => a.localeCompare(b));
  return state.id + (props.length ? `[${props.map(([k,v]) => `${k}=${v}`).join(',')}]` : '');
}
export function paletteState(palette: any[], index: number): BlockState {
  const entry = palette[index];
  if (!entry) throw new Error('Block palette index is out of range.');
  const name = typeof entry === 'string' ? entry : compound(entry).Name;
  if (typeof name !== 'string') throw new Error('Block palette entry has no name.');
  const props = typeof entry === 'string' ? {} : compound(entry).Properties ?? {};
  if (!props || typeof props !== 'object' || Array.isArray(props)) throw new Error('Invalid block properties.');
  return { id: name, properties: Object.fromEntries(Object.entries(props).map(([k,v]) => [k, String(v)])) };
}
export function paletteEntry(state: BlockState): Compound {
  return { Name: state.id, ...(Object.keys(state.properties).length ? { Properties: state.properties } : {}) };
}
export function validateDimensions(size: [number, number, number], limit = 2_000_000): number {
  const volume = size.reduce((a,b) => a*b, 1);
  if (size.some((n) => !Number.isInteger(n) || n < 1 || n > 512) || volume > limit) throw new Error('Schematic dimensions exceed the supported limit (512 per side, 2 million blocks total).');
  return volume;
}
export function yzx(x:number,y:number,z:number,s:[number,number,number]) { return (y*s[2]+z)*s[0]+x; }
export function decodeVarints(data: Uint8Array, count: number): number[] {
  const out: number[] = []; let value=0,shift=0;
  for (const byte of data) {
    value |= (byte & 0x7f) << shift; shift += 7;
    if (shift > 28) throw new Error('Invalid block palette varint.');
    if (!(byte & 0x80)) { out.push(value >>> 0); value=0; shift=0; if (out.length === count) break; }
  }
  if (out.length !== count || shift) throw new Error('Block data length does not match schematic dimensions.');
  return out;
}
export function encodeVarints(values: number[]): Uint8Array {
  const out:number[]=[];
  for(let v of values) { v >>>= 0; while(v > 0x7f) { out.push((v&0x7f)|0x80); v >>>= 7; } out.push(v); }
  return new Uint8Array(out);
}
export function unpackLongs(longs: unknown, count: number, paletteSize: number): number[] {
  if (!(longs instanceof BigInt64Array || longs instanceof BigUint64Array)) throw new Error('Missing packed block state long array.');
  const bits=Math.max(2,Math.ceil(Math.log2(paletteSize))), mask=(1n<<BigInt(bits))-1n;
  if (longs.length < Math.ceil(count*bits/64)) throw new Error('Packed block state array is too short.');
  return Array.from({length:count},(_,i)=>{const offset=i*bits,word=Math.floor(offset/64),shift=offset%64;let value=BigInt.asUintN(64,BigInt(longs[word]))>>BigInt(shift);if(shift+bits>64)value|=BigInt.asUintN(64,BigInt(longs[word+1]))<<BigInt(64-shift);return Number(value&mask);});
}
export function packLongs(values:number[], paletteSize:number): BigInt64Array {
  const bits=Math.max(2,Math.ceil(Math.log2(paletteSize))), words=Array<bigint>(Math.ceil(values.length*bits/64)).fill(0n),mask=(1n<<BigInt(bits))-1n;
  values.forEach((v,i)=>{const offset=i*bits,word=Math.floor(offset/64),shift=offset%64,value=BigInt(v)&mask;words[word]|=value<<BigInt(shift);if(shift+bits>64)words[word+1]|=value>>BigInt(64-shift);});
  return BigInt64Array.from(words.map(v=>BigInt.asIntN(64,v)));
}
export function short(value:number){return new Int16(value)}
export function int(value:number){return new Int32(value)}
export function byte(value:number){return new Int8(value)}
export function listTag<T>(values:T[],type:TAG): T[] { Object.defineProperty(values,TAG_TYPE,{value:type,enumerable:false}); return values; }
export function buildBlocks(build:Build, size:[number,number,number], origin:[number,number,number], region=build.regions[0]) {
  const map=new Map<string,BlockState>();
  for(const [key,state] of region.blocks) map.set(key,state);
  const values:BlockState[]=[];
  for(let y=0;y<size[1];y++) for(let z=0;z<size[2];z++) for(let x=0;x<size[0];x++) values.push(map.get(`${origin[0]+x},${origin[1]+y},${origin[2]+z}`) ?? {id:'minecraft:air',properties:{}});
  return values;
}
