import { Build, emptyBuild } from '../model';
import { buildBlocks, compound, encodeRoot, int, list, listTag, num, packLongs, paletteEntry, paletteState, readRoot, rootCompound, unpackLongs, validateDimensions } from './nbt';
import { TAG } from 'nbtify';

export async function importLitematic(input:Uint8Array):Promise<Build>{
  const root=await readRoot(input), version=num(root.Version,'Litematica version');
  if(version<1||version>7) throw new Error(`Unsupported Litematica version ${version}.`);
  const regions=compound(root.Regions), entries=Object.entries(regions);
  if(!entries.length||entries.length>16) throw new Error('Litematica must contain between 1 and 16 regions.');
  const metadata=compound(root.Metadata??{}), build=emptyBuild(); build.name=typeof metadata.Name==='string'?metadata.Name:'Imported Litematica';
  build.dataVersion=root.MinecraftDataVersion===undefined?undefined:num(root.MinecraftDataVersion,'Minecraft data version');
  build.metadata={sourceFormat:'Litematica',litematicaVersion:version,sourceMetadata:metadata};
  build.regions=[];
  for(const [name,value] of entries){
    const reg=compound(value), p=compound(reg.Position), sz=compound(reg.Size);
    const raw:[number,number,number]=[num(sz.x,'region width'),num(sz.y,'region height'),num(sz.z,'region length')];
    if(raw.some((n)=>n===0)) throw new Error('Litematica region sizes cannot be zero.');
    const size: [number,number,number]=raw.map(Math.abs) as [number,number,number]; const volume=validateDimensions(size);
    const origin:[number,number,number]=[num(p.x,'region x'),num(p.y,'region y'),num(p.z,'region z')];
    // Litematica stores the signed region extent; packed data starts at Position and
    // proceeds along each axis in the sign of Size.
    const step:[number,number,number]=raw.map((n)=>Math.sign(n)) as [number,number,number];
    const palette=list(reg.BlockStatePalette,'block state palette').map((item)=>paletteState([item],0));
    if(!palette.length||palette.length>65536) throw new Error('Invalid Litematica block palette.');
    const indices=unpackLongs(reg.BlockStates,volume,palette.length);
    const region=emptyBuild(size).regions[0]; region.name=name; region.origin=origin;
    for(let i=0;i<indices.length;i++){const idx=indices[i];if(idx>=palette.length)throw new Error('Litematica block state index is out of range.');const x=i%size[0],z=Math.floor(i/size[0])%size[2],y=Math.floor(i/(size[0]*size[2]));if(palette[idx].id!=='minecraft:air')region.blocks.set(`${origin[0]+step[0]*x},${origin[1]+step[1]*y},${origin[2]+step[2]*z}`,palette[idx]);}
    build.regions.push(region);
  }
  return build;
}

export async function exportLitematic(build:Build):Promise<Uint8Array>{
  const regions:Record<string,unknown>={};
  for(const [i,r] of build.regions.entries()){
    const size=r.size,volume=validateDimensions(size), values=buildBlocks(build,size,r.origin,r);
    const names=[...new Set(values.map(s=>JSON.stringify(paletteEntry(s))))];
    const palette=names.map((n)=>JSON.parse(n)); const byName=new Map(names.map((n,index)=>[n,index]));
    const indices=values.map(s=>byName.get(JSON.stringify(paletteEntry(s)))!);
    regions[r.name||`Region${i+1}`]={Position:{x:int(r.origin[0]),y:int(r.origin[1]),z:int(r.origin[2])},Size:{x:int(size[0]),y:int(size[1]),z:int(size[2])},BlockStatePalette:listTag(palette,TAG.COMPOUND),BlockStates:packLongs(indices,palette.length),TileEntities:listTag([],TAG.COMPOUND),Entities:listTag([],TAG.COMPOUND),PendingBlockTicks:listTag([],TAG.COMPOUND),PendingFluidTicks:listTag([],TAG.COMPOUND)};
    if(values.length!==volume)throw new Error('Internal region volume mismatch.');
  }
  const now=new Date(), all=build.regions;
  const min=[0,1,2].map(axis=>Math.min(...all.map(r=>r.origin[axis]))), max=[0,1,2].map(axis=>Math.max(...all.map(r=>r.origin[axis]+r.size[axis])));
  const previous=build.metadata.sourceMetadata&&typeof build.metadata.sourceMetadata==='object'?build.metadata.sourceMetadata as Record<string,unknown>:{};
  const metadata={...previous,Name:build.name,Author:typeof previous.Author==='string'?previous.Author:'Minecraft AI Builder',Description:typeof previous.Description==='string'?previous.Description:'',RegionCount:int(build.regions.length),TotalBlocks:int(build.regions.reduce((n,r)=>n+r.blocks.size,0)),TimeCreated:typeof previous.TimeCreated==='bigint'?previous.TimeCreated:BigInt(now.getTime()),TimeModified:BigInt(now.getTime()),EnclosingSize:{x:int(max[0]-min[0]),y:int(max[1]-min[1]),z:int(max[2]-min[2])}};
  const root={Version:int(7),SubVersion:int(1),MinecraftDataVersion:int(build.dataVersion??0),Metadata:metadata,Regions:regions};
  return encodeRoot('Litematic',root);
}
