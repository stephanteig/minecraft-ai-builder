import { Build, emptyBuild } from '../model';
import { bytes, compound, decodeVarints, encodeRoot, encodeVarints, int, list, listTag, num, paletteEntry, paletteState, readRoot, rootCompound, short, stateFromName, stateName, validateDimensions, yzx } from './nbt';
import { TAG } from 'nbtify';

export async function importSponge(input:Uint8Array):Promise<Build>{
  const root=rootCompound(await readRoot(input),'Schematic');
  const version=num(root.Version,'version');
  if(version!==2 && version!==3) throw new Error(`Unsupported Sponge schematic version ${version}; supported versions are 2 and 3.`);
  const blocks=version===2?root:compound(root.Blocks);
  const width=num(root.Width,'width'),height=num(root.Height,'height'),length=num(root.Length,'length');
  const size:[number,number,number]=[width,height,length], volume=validateDimensions(size);
  const palette=compound(blocks.BlockPalette??blocks.Palette), names=Object.keys(palette);
  if(!names.length || names.length>65536) throw new Error('Invalid Sponge block palette.');
  const states:Array<ReturnType<typeof paletteState>>=[];
  let max=-1;
  for(const name of names){const id=num(palette[name],`palette id for ${name}`); if(id<0||id>=names.length) throw new Error('Sponge palette ids must be contiguous from zero.'); states[id]=stateFromName(name); max=Math.max(max,id);}
  if(max!==names.length-1) throw new Error('Sponge palette ids must be contiguous from zero.');
  const data=bytes(blocks.BlockData ?? blocks.Data,'block data');
  const indices=decodeVarints(data,volume);
  const build=emptyBuild(size); const offset=root.Offset; const offsetValues=Array.isArray(offset)||offset instanceof Int32Array?Array.from(offset):[]; const origin:[number,number,number]=offsetValues.length===3?offsetValues.map((n:any)=>num(n,'offset')) as [number,number,number]:[0,0,0]; build.regions[0].origin=origin; build.name=typeof root.Metadata?.Name==='string'?root.Metadata.Name:'Imported Sponge Schematic';
  build.dataVersion=root.DataVersion===undefined?undefined:num(root.DataVersion,'data version');
  build.metadata={sourceFormat:'Sponge schematic',spongeVersion:version,sourceMetadata:root.Metadata??{}};
  for(let i=0;i<indices.length;i++) { const id=indices[i]; if(id>=states.length) throw new Error('Sponge block data references a missing palette entry.'); if(states[id].id!=='minecraft:air') {const x=i%width,z=Math.floor(i/width)%length,y=Math.floor(i/(width*length)); build.regions[0].blocks.set(`${origin[0]+x},${origin[1]+y},${origin[2]+z}`,states[id]);} }
  return build;
}

export async function exportSponge(build:Build):Promise<Uint8Array>{
  if(build.regions.length!==1) throw new Error('Sponge export currently supports one region at a time.');
  const r=build.regions[0], size=r.size; const volume=validateDimensions(size);
  const states=Array.from(new Map(buildBlocks(build,size,r.origin).map(s=>[stateName(s),s])).values());
  const names=['minecraft:air',...states.filter(s=>s.id!=='minecraft:air').map(stateName)];
  const unique=[...new Set(names)]; const ids=new Map(unique.map((s,i)=>[s,i]));
  const palette=Object.fromEntries(unique.map((name,i)=>[name,int(i)]));
  const blockdata=encodeVarints(buildBlocks(build,size,r.origin).map(s=>ids.get(stateName(s))??0));
  const previous=build.metadata.sourceMetadata&&typeof build.metadata.sourceMetadata==='object'?build.metadata.sourceMetadata as Record<string,unknown>:{};
  const metadata={...previous,Name:build.name,Author:typeof previous.Author==='string'?previous.Author:'Minecraft AI Builder'};
  const root={Version:int(2),DataVersion:int(build.dataVersion??0),Width:short(size[0]),Height:short(size[1]),Length:short(size[2]),Offset:Int32Array.from(r.origin),Metadata:metadata,Palette:palette,PaletteMax:int(unique.length),BlockData:blockdata,BlockEntities:listTag([],TAG.COMPOUND),Entities:listTag([],TAG.COMPOUND)};
  if(blockdata.length===0 && volume) throw new Error('Could not encode block data.');
  return encodeRoot('Schematic',root);
}
import { buildBlocks } from './nbt';
