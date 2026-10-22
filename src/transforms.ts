import type { BlockState, Build } from './model';
import { parseKey, posKey } from './model';

const DIRECTIONS=['north','east','south','west'] as const;
function transformState(source:BlockState,turns:number,mirrorX:boolean):BlockState {
  const properties={...source.properties};
  const rotate=(value:string)=>{const index=DIRECTIONS.indexOf(value as typeof DIRECTIONS[number]);return index<0?value:DIRECTIONS[(index+turns+4)%4];};
  if(mirrorX){
    if(properties.facing==='east')properties.facing='west';else if(properties.facing==='west')properties.facing='east';
    [properties.east,properties.west]=[properties.west,properties.east];
    if(properties.hinge==='left')properties.hinge='right';else if(properties.hinge==='right')properties.hinge='left';
    if(properties.shape?.includes('_left'))properties.shape=properties.shape.replace('_left','_right');else if(properties.shape?.includes('_right'))properties.shape=properties.shape.replace('_right','_left');
  }
  if(properties.facing)properties.facing=rotate(properties.facing);
  if(properties.axis&&(turns%2))properties.axis=properties.axis==='x'?'z':properties.axis==='z'?'x':properties.axis;
  if(properties.rotation!==undefined)properties.rotation=String((Number(properties.rotation)+(mirrorX?-(Number(properties.rotation)*2):0)+turns*4+64)%16);
  for(const direction of DIRECTIONS)delete properties[direction];
  for(const direction of DIRECTIONS){if(source.properties[direction]===undefined)continue;let target:string=mirrorX?(direction==='east'?'west':direction==='west'?'east':direction):direction;target=rotate(target);properties[target]=source.properties[direction];}
  return {id:source.id,properties};
}

export function transformBuild(build:Build,turns:number,mirrorX=false):Build {
  const count=((Math.trunc(turns)%4)+4)%4, next:Build={...build,metadata:{...build.metadata},regions:build.regions.map((region)=>{
    const [sx,sy,sz]=region.size,newSize:[number,number,number]=count%2?[sz,sy,sx]:[sx,sy,sz], blocks=new Map<string,BlockState>();
    for(const [key,state] of region.blocks){let [x,y,z]=parseKey(key);x-=region.origin[0];y-=region.origin[1];z-=region.origin[2];if(mirrorX)x=sx-1-x;if(count===1)[x,z]=[sz-1-z,x];else if(count===2){x=sx-1-x;z=sz-1-z;}else if(count===3)[x,z]=[z,sx-1-x];blocks.set(posKey(region.origin[0]+x,region.origin[1]+y,region.origin[2]+z),transformState(state,count,mirrorX));}
    return {...region,size:newSize,blocks};
  })};
  return next;
}

export function transformBlockState(state:BlockState,turns:number,mirrorX=false){return transformState(state,((Math.trunc(turns)%4)+4)%4,mirrorX);}
