import {describe,expect,it} from 'vitest';
import {emptyBuild} from './model';
import {transformBlockState,transformBuild} from './transforms';

describe('block state preserving transforms',()=>{
  it('rotates coordinates, region bounds, facing, axis, and directional connections',()=>{
    const build=emptyBuild([3,2,2]);build.regions[0].blocks.set('0,0,0',{id:'minecraft:oak_log',properties:{axis:'x'}});build.regions[0].blocks.set('2,1,1',{id:'minecraft:oak_stairs',properties:{facing:'east',half:'top',shape:'inner_left',waterlogged:'true'}});
    const out=transformBuild(build,1),region=out.regions[0];expect(region.size).toEqual([2,2,3]);expect(region.blocks.get('1,0,0')?.properties.axis).toBe('z');expect(region.blocks.get('0,1,2')?.properties).toEqual({facing:'south',half:'top',shape:'inner_left',waterlogged:'true'});
  });
  it('mirrors doors and preserves bed head/foot relationship',()=>{
    const door=transformBlockState({id:'minecraft:oak_door',properties:{facing:'east',hinge:'left',half:'lower',open:'true'}},0,true);expect(door.properties).toEqual({facing:'west',hinge:'right',half:'lower',open:'true'});
    const bed=transformBlockState({id:'minecraft:white_bed',properties:{facing:'north',part:'head',occupied:'false'}},2);expect(bed.properties.part).toBe('head');expect(bed.properties.facing).toBe('south');
  });
});
