import { describe, expect, it } from 'vitest';
import { parseJsonFile, resolveModel, resolveTexture, selectBlockModels } from './modelResolver';
import { parseResourcePack } from './resourcePack';
import { rotateBlockPoint } from './buildModelScene';
import { zipSync, strToU8 } from 'fflate';

const text=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));

describe('Minecraft resource-pack model resolution',()=>{
  it('reads ZIP/JAR assets and rejects archives without blockstates',()=>{
    const pack=parseResourcePack(zipSync({'assets/minecraft/blockstates/stone.json':strToU8('{}'),'pack.mcmeta':strToU8('{}')}),'fixture.zip');
    expect(pack.label).toBe('fixture.zip');expect(pack.files.has('assets/minecraft/blockstates/stone.json')).toBe(true);
    expect(()=>parseResourcePack(zipSync({'readme.txt':strToU8('no')}))).toThrow(/no Minecraft blockstate assets/);
  });
  it('resolves model parents and texture aliases',async()=>{
    const files=new Map<string,Uint8Array>([
      ['assets/minecraft/models/block/base.json',text({textures:{side:'block/stone'},elements:[{from:[0,0,0],to:[16,16,16]}]})],
      ['assets/minecraft/models/block/child.json',text({parent:'minecraft:block/base',textures:{top:'block/oak_planks'}})],
    ]);
    const model=await resolveModel(files,'minecraft:block/child');
    expect(model.elements).toHaveLength(1);expect(model.textures.side).toBe('block/stone');expect(resolveTexture(model,'#top')).toBe('minecraft:block/oak_planks');
  });
  it('resolves object texture descriptors used by current vanilla assets',()=>{
    expect(resolveTexture({textures:{pane:{force_translucent:true,sprite:'minecraft:block/glass'}}},'#pane')).toBe('minecraft:block/glass');
  });
  it('selects the most specific blockstate variant and multipart conditions',async()=>{
    const files=new Map<string,Uint8Array>([
      ['assets/minecraft/blockstates/test.json',text({variants:{'':{model:'minecraft:block/default'},'facing=north':{model:'minecraft:block/north'},'facing=north,half=top':{model:'minecraft:block/north_top'}},multipart:[{when:{east:'true'},apply:{model:'minecraft:block/connected'}}]})],
      ...['default','north','north_top','connected'].map((name)=>[`assets/minecraft/models/block/${name}.json`,text({textures:{all:'block/stone'},elements:[]})] as [string,Uint8Array]),
    ]);
    const selected=await selectBlockModels(files,'minecraft:test',{facing:'north',half:'top',east:'true'},[0,0,0]);
    expect(selected.map((item)=>item.model.textures.all)).toEqual(['block/stone','block/stone']);
    expect(selected.map((item)=>item.model).length).toBe(2);
    expect(parseJsonFile(files,'assets/minecraft/blockstates/test.json').variants['facing=north,half=top'].model).toBe('minecraft:block/north_top');
  });
  it('returns no models for an unknown block so the scene can use its missing-model fallback',async()=>{
    const files=new Map<string,Uint8Array>();
    await expect(selectBlockModels(files,'minecraft:not_in_pack',{},[0,0,0])).rejects.toThrow(/missing/);
  });
  it('rotates block model geometry around the block center',()=>{
    expect(rotateBlockPoint([0,8,8],0,90)[0]).toBeCloseTo(8);expect(rotateBlockPoint([0,8,8],0,90)[2]).toBeCloseTo(0);
  });
});
