// @vitest-environment jsdom
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyBuild } from '../model';
import { buildModelScene } from './buildModelScene';
import type { ResourcePack } from './resourcePack';

const encoder=new TextEncoder();
const faces=Object.fromEntries(['down','up','north','south','west','east'].map((direction)=>[direction,{texture:'#all',cullface:direction}]));
function pack(models:Record<string,unknown>):ResourcePack {
  return {label:'test pack',files:new Map(Object.entries(models).map(([path,value])=>[path,encoder.encode(JSON.stringify(value))]))};
}
function useCanvasMock(){
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({imageSmoothingEnabled:false,fillStyle:'',fillRect:vi.fn()} as never));
}
function modelFiles(id:string,from:number[],to:number[]):Record<string,unknown>{
  return {
    [`assets/minecraft/blockstates/${id}.json`]:{variants:{'':{model:`minecraft:block/${id}`}}},
    [`assets/minecraft/models/block/${id}.json`]:{textures:{all:'minecraft:block/test'},elements:[{from,to,faces}]},
  };
}
afterEach(()=>vi.restoreAllMocks());

describe('Minecraft model scene geometry',()=>{
  it('uses non-cube element bounds and assigns the atlas texture',async()=>{
    useCanvasMock();const build=emptyBuild([1,1,1]);build.regions[0].blocks.set('0,0,0',{id:'minecraft:test_slab',properties:{}});
    const result=await buildModelScene(pack(modelFiles('test_slab',[0,0,0],[16,8,16])),build.regions[0]);
    const meshes:THREE.Mesh[]=[];result.group.traverse((object)=>{if(object instanceof THREE.Mesh)meshes.push(object);});
    const positions=meshes[0].geometry.getAttribute('position'),ys=Array.from({length:positions.count},(_,i)=>positions.getY(i));
    expect(Math.max(...ys)).toBeCloseTo(0.5);expect(ys.some((y)=>y<0.5)).toBe(true);
    expect((meshes[0].material as THREE.MeshStandardMaterial).map).toBeInstanceOf(THREE.CanvasTexture);
    result.dispose();
  });
  it('uses transparent material for glass-like blocks',async()=>{
    useCanvasMock();const build=emptyBuild([1,1,1]);build.regions[0].blocks.set('0,0,0',{id:'minecraft:glass',properties:{}});
    const result=await buildModelScene(pack(modelFiles('glass',[0,0,0],[16,16,16])),build.regions[0]);
    let material:THREE.MeshStandardMaterial|undefined;result.group.traverse((object)=>{if(object instanceof THREE.Mesh)material=object.material as THREE.MeshStandardMaterial;});
    expect(material?.transparent).toBe(true);expect(material?.depthWrite).toBe(false);result.dispose();
  });
  it('culls shared faces between adjacent full opaque blocks',async()=>{
    useCanvasMock();const build=emptyBuild([2,1,1]);build.regions[0].blocks.set('0,0,0',{id:'minecraft:stone',properties:{}});build.regions[0].blocks.set('1,0,0',{id:'minecraft:stone',properties:{}});
    const result=await buildModelScene(pack(modelFiles('stone',[0,0,0],[16,16,16])),build.regions[0]);
    expect(result.vertices).toBe(60);result.dispose();
  });
  it('culls all four shared edges in a 2×2 opaque surface',async()=>{
    useCanvasMock();const build=emptyBuild([2,2,1]);for(let y=0;y<2;y++)for(let x=0;x<2;x++)build.regions[0].blocks.set(`${x},${y},0`,{id:'minecraft:stone',properties:{}});
    const result=await buildModelScene(pack(modelFiles('stone',[0,0,0],[16,16,16])),build.regions[0]);
    expect(result.vertices).toBe(96);result.dispose();
  });
  it('uses a visible missing-model cube for unknown blocks',async()=>{
    useCanvasMock();const build=emptyBuild([1,1,1]);build.regions[0].blocks.set('0,0,0',{id:'minecraft:unknown_block',properties:{}});
    const result=await buildModelScene(pack({}),build.regions[0]);expect(result.vertices).toBe(36);result.dispose();
  });
});
