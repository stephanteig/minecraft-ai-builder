export type BlockState = { id: string; properties: Record<string,string> };
export type Region = { name: string; origin: [number,number,number]; size: [number,number,number]; blocks: Map<string,BlockState>; visible: boolean };
export type Build = { name: string; regions: Region[]; dataVersion?: number; metadata: Record<string,unknown> };
export const posKey = (x:number,y:number,z:number) => `${x},${y},${z}`;
export const parseKey = (key:string):[number,number,number] => key.split(',').map(Number) as [number,number,number];
export const AIR: BlockState = {id:'minecraft:air',properties:{}};
export function emptyBuild(size:[number,number,number]=[16,16,16]):Build {
  if(size.some(n=>!Number.isInteger(n)||n<1||n>512)) throw new Error('Dimensions must be integers from 1 to 512.');
  return {name:'Untitled Build',regions:[{name:'Region 1',origin:[0,0,0],size,blocks:new Map(),visible:true}],metadata:{}};
}
export function setBlock(build:Build,regionIndex:number,x:number,y:number,z:number,state:BlockState):BlockState {
  const region=build.regions[regionIndex]; if(!region) throw new Error('Unknown region.');
  const [ox,oy,oz]=region.origin,[sx,sy,sz]=region.size;
  if(x<ox||y<oy||z<oz||x>=ox+sx||y>=oy+sy||z>=oz+sz) throw new Error('Block coordinate is outside the region.');
  const key=posKey(x,y,z),prev=region.blocks.get(key)??AIR;
  if(state.id==='minecraft:air') region.blocks.delete(key); else region.blocks.set(key,{id:state.id,properties:{...state.properties}});
  return prev;
}
export function transformPoint(p:[number,number,number],size:[number,number,number],turns:number,mirrorX=false):[number,number,number] {
  let [x,y,z]=p; const [sx,,sz]=size; if(mirrorX)x=sx-1-x;
  for(let i=0;i<((turns%4)+4)%4;i++) [x,z]=[sz-1-z,x];
  return [x,y,z];
}
