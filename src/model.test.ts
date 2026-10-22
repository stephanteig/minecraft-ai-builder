import {describe,expect,it} from 'vitest';
import {emptyBuild,posKey,parseKey,setBlock,transformPoint} from './model';

describe('canonical build model',()=>{
  it('creates bounded empty regions',()=>{
    expect(emptyBuild([3,4,5]).regions[0].size).toEqual([3,4,5]);
    expect(()=>emptyBuild([0,1,1])).toThrow();
    expect(()=>emptyBuild([513,1,1])).toThrow();
  });
  it('round trips signed coordinate keys',()=>{
    expect(parseKey(posKey(-12,0,36))).toEqual([-12,0,36]);
  });
  it('places and removes a block while returning previous state',()=>{
    const build=emptyBuild([2,2,2]);
    const stone={id:'minecraft:stone',properties:{}};
    expect(setBlock(build,0,1,1,1,stone).id).toBe('minecraft:air');
    expect(build.regions[0].blocks.get('1,1,1')).toEqual(stone);
    expect(setBlock(build,0,1,1,1,{id:'minecraft:air',properties:{}})).toEqual(stone);
    expect(build.regions[0].blocks.size).toBe(0);
    expect(()=>setBlock(build,0,-1,0,0,stone)).toThrow();
  });
  it('normalizes quarter turns and mirrors local coordinates',()=>{
    expect(transformPoint([0,0,0],[3,2,3],1)).toEqual([2,0,0]);
    expect(transformPoint([0,0,0],[3,2,3],0,true)).toEqual([2,0,0]);
    expect(transformPoint([1,0,1],[3,2,3],4)).toEqual([1,0,1]);
  });
});
