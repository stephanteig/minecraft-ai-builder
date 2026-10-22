import {describe,expect,it} from 'vitest';
import {emptyBuild} from '../model';
import {exportSponge,importSponge} from './sponge';
import {exportLitematic,importLitematic} from './litematic';
import {exportLegacy,importLegacy} from './legacy';
import {encodeRoot,int,short,encodeVarints,packLongs,unpackLongs} from './nbt';

const sample=()=>{const b=emptyBuild([3,2,2]);b.name='Format Test';b.regions[0].origin=[-2,4,7];b.regions[0].blocks.set('-2,4,7',{id:'minecraft:oak_planks',properties:{}});b.regions[0].blocks.set('-1,4,7',{id:'minecraft:oak_stairs',properties:{facing:'north',half:'bottom',shape:'straight',waterlogged:'false'}});return b;};
describe('Minecraft schematic NBT formats',()=>{
  it('round trips Sponge v2 dimensions, offset, palette and block states',async()=>{
    const out=await importSponge(await exportSponge(sample()));expect(out.name).toBe('Format Test');expect(out.regions[0].origin).toEqual([-2,4,7]);expect(out.regions[0].blocks.get('-1,4,7')).toEqual({id:'minecraft:oak_stairs',properties:{facing:'north',half:'bottom',shape:'straight',waterlogged:'false'}});
  });
  it('imports Sponge v3 palette data from its Blocks compound',async()=>{
    const fixture=await encodeRoot('Schematic',{Schematic:{Version:int(3),DataVersion:int(3465),Width:short(2),Height:short(1),Length:short(1),Offset:Int32Array.from([0,0,0]),Metadata:{Name:'v3 fixture'},Blocks:{BlockPalette:{'minecraft:air':int(0),'minecraft:pink_wool':int(1)},Data:encodeVarints([0,1])}}});
    const out=await importSponge(fixture);expect(out.name).toBe('v3 fixture');expect(out.dataVersion).toBe(3465);expect(out.regions[0].blocks.get('1,0,0')?.id).toBe('minecraft:pink_wool');
  });
  it('round trips Litematica packed palette states and signed positions',async()=>{
    const out=await importLitematic(await exportLitematic(sample()));expect(out.name).toBe('Format Test');expect(out.regions[0].origin).toEqual([-2,4,7]);expect(out.regions[0].blocks.get('-1,4,7')?.id).toBe('minecraft:oak_stairs');
  });
  it('maps Litematica blocks along signed region extents',async()=>{
    const fixture=await encodeRoot('Litematica',{Version:int(7),MinecraftDataVersion:int(0),Metadata:{Name:'negative extent'},Regions:{negative:{Position:{x:int(10),y:int(0),z:int(0)},Size:{x:int(-2),y:int(1),z:int(1)},BlockStatePalette:[{Name:'minecraft:stone'},{Name:'minecraft:dirt'}],BlockStates:packLongs([1,0],2)}}});
    const out=await importLitematic(fixture);expect(out.regions[0].blocks.get('10,0,0')?.id).toBe('minecraft:dirt');expect(out.regions[0].blocks.get('9,0,0')?.id).toBe('minecraft:stone');
  });
  it('round trips palettes with several padded packed-long words',async()=>{
    const b=emptyBuild([40,1,1]);const ids=['stone','dirt','glass','oak_planks','pink_wool','bricks','sand','gravel'];
    for(let x=0;x<40;x++)b.regions[0].blocks.set(`${x},0,0`,{id:`minecraft:${ids[x%ids.length]}`,properties:{}});
    const out=await importLitematic(await exportLitematic(b));for(let x=0;x<40;x++)expect(out.regions[0].blocks.get(`${x},0,0`)?.id).toBe(`minecraft:${ids[x%ids.length]}`);
  });
  it('uses continuous Litematica bit packing when values cross 64-bit boundaries',()=>{
    const words=packLongs(Array(22).fill(7),8);expect([...words]).toEqual([-1n,3n]);expect(unpackLongs(words,22,8)).toEqual(Array(22).fill(7));
  });
  it('round trips representable legacy Alpha block ids and data',async()=>{
    const b=emptyBuild([2,1,1]);b.regions[0].blocks.set('0,0,0',{id:'minecraft:stone',properties:{}});const out=await importLegacy(await exportLegacy(b));expect(out.regions[0].blocks.get('0,0,0')?.id).toBe('minecraft:stone');
  });
});
