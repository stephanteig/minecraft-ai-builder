import * as THREE from 'three';
import type { BlockState, Build, Region } from '../model';
import { resolveTexture, selectBlockModels, type JsonObject, type ResolvedVariant } from './modelResolver';
import type { ResourcePack } from './resourcePack';

type AtlasRegion = { x: number; y: number; width: number; height: number; sourceWidth: number; sourceHeight: number; drawWidth: number; drawHeight: number };
type FaceVertex = [number, number, number];
type ChunkData = { opaque: number[]; opaqueUvs: number[]; opaqueColors: number[]; translucent: number[]; translucentUvs: number[]; translucentColors: number[] };
const DIRECTIONS: Record<string, { corners: (from: number[], to: number[]) => FaceVertex[]; normal: THREE.Vector3 }> = {
  down: { corners: (a,b) => [[a[0],a[1],b[2]],[b[0],a[1],b[2]],[b[0],a[1],a[2]],[a[0],a[1],a[2]]], normal: new THREE.Vector3(0,-1,0) },
  up: { corners: (a,b) => [[a[0],b[1],a[2]],[b[0],b[1],a[2]],[b[0],b[1],b[2]],[a[0],b[1],b[2]]], normal: new THREE.Vector3(0,1,0) },
  north: { corners: (a,b) => [[b[0],a[1],a[2]],[a[0],a[1],a[2]],[a[0],b[1],a[2]],[b[0],b[1],a[2]]], normal: new THREE.Vector3(0,0,-1) },
  south: { corners: (a,b) => [[a[0],a[1],b[2]],[b[0],a[1],b[2]],[b[0],b[1],b[2]],[a[0],b[1],b[2]]], normal: new THREE.Vector3(0,0,1) },
  west: { corners: (a,b) => [[a[0],a[1],a[2]],[a[0],a[1],b[2]],[a[0],b[1],b[2]],[a[0],b[1],a[2]]], normal: new THREE.Vector3(-1,0,0) },
  east: { corners: (a,b) => [[b[0],a[1],b[2]],[b[0],a[1],a[2]],[b[0],b[1],a[2]],[b[0],b[1],b[2]]], normal: new THREE.Vector3(1,0,0) },
};

function rotateModelPoint(point: number[], origin: number[], axis: string, angle: number): number[] {
  const v = new THREE.Vector3(point[0]-origin[0], point[1]-origin[1], point[2]-origin[2]);
  v.applyAxisAngle(axis === 'x' ? new THREE.Vector3(1,0,0) : axis === 'y' ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1), THREE.MathUtils.degToRad(angle));
  return [v.x+origin[0],v.y+origin[1],v.z+origin[2]];
}

export function rotateBlockPoint(point: number[], x: number, y: number): number[] {
  let v = new THREE.Vector3(point[0]-8,point[1]-8,point[2]-8);
  if (x) v.applyAxisAngle(new THREE.Vector3(1,0,0), THREE.MathUtils.degToRad(x));
  if (y) v.applyAxisAngle(new THREE.Vector3(0,1,0), THREE.MathUtils.degToRad(-y));
  return [v.x+8,v.y+8,v.z+8];
}

function isFullOpaqueNeighbor(state:BlockState|undefined):boolean {
  if(!state)return false;
  const id=state.id.split(':').pop()??'';
  if(/(?:air|glass|pane|ice|water|lava|leaves|slab|stairs|fence|wall|door|trapdoor|torch|plant|flower|carpet|bed|chest|barrel|lantern|chain|rail|sign|button|pressure_plate|snow|ladder|vine|crop|sapling)/.test(id))return false;
  return true;
}

function cullAgainstNeighbor(key:string, face:JsonObject, states:Map<string,BlockState>) {
  const direction=String(face.cullface??'');if(!direction)return false;
  const [x,y,z]=key.split(',').map(Number),offsets:Record<string,[number,number,number]>={north:[0,0,-1],south:[0,0,1],west:[-1,0,0],east:[1,0,0],up:[0,1,0],down:[0,-1,0]},offset=offsets[direction];
  if(!offset)return false;
  return isFullOpaqueNeighbor(states.get(`${x+offset[0]},${y+offset[1]},${z+offset[2]}`));
}

function stateAt(region: Region, positions: Map<string, BlockState>, key: string, state: BlockState): BlockState {
  const id=state.id.split(':').pop()??'';
  const connects = (other: BlockState | undefined) => {
    if (!other || other.id.endsWith(':air')) return false;
    const otherId=other.id.split(':').pop()??'';
    if (id.includes('glass_pane')) return otherId.includes('glass_pane') || otherId.includes('fence') || !['torch','wall_torch','redstone_wire','rail','carpet','snow','short_grass'].includes(otherId);
    if (id.endsWith('_fence')) return otherId.endsWith('_fence') || otherId.endsWith('_fence_gate') || !['torch','wall_torch','redstone_wire','rail','carpet','snow','short_grass'].includes(otherId);
    if (id.endsWith('_wall')) return otherId.endsWith('_wall') || otherId.endsWith('_fence_gate') || !['torch','wall_torch','redstone_wire','rail','carpet','snow','short_grass'].includes(otherId);
    return false;
  };
  if (!id.includes('fence') && !id.endsWith('_wall') && !id.includes('glass_pane')) return state;
  const [x,y,z]=key.split(',').map(Number), props={...state.properties};
  for (const [name,dx,dy,dz] of [['north',0,0,-1],['south',0,0,1],['west',-1,0,0],['east',1,0,0]] as const) {
    props[name]=String(connects(positions.get(`${x+dx},${y+dy},${z+dz}`)));
  }
  return {...state,properties:props};
}

async function createAtlas(pack: ResourcePack, refs: string[]) {
  const unique=[...new Set(refs)], cell=64, columns=16, rows=Math.max(1,Math.ceil((unique.length+1)/columns));
  const canvas=document.createElement('canvas'); canvas.width=columns*cell; canvas.height=rows*cell;
  const context=canvas.getContext('2d'); if(!context) throw new Error('Could not create a texture atlas in this browser.');
  context.imageSmoothingEnabled=false;
  const regions=new Map<string,AtlasRegion>();
  const all=['minecraft:block/missingno',...unique];
  for (let index=0;index<all.length;index++) {
    const name=all[index], col=index%columns,row=Math.floor(index/columns), x=col*cell,y=row*cell;
    context.fillStyle='#ff00ff'; context.fillRect(x,y,cell,cell);
    if(name==='minecraft:block/missingno') {
      context.fillStyle='#222'; for(let cy=0;cy<4;cy++)for(let cx=0;cx<4;cx++)if((cx+cy)%2===0)context.fillRect(x+cx*16,y+cy*16,16,16);
      regions.set(name,{x,y,width:cell,height:cell,sourceWidth:16,sourceHeight:16,drawWidth:cell,drawHeight:cell}); continue;
    }
    const [namespace,path]=name.includes(':')?name.split(':'):['minecraft',name];
    const assetPath=`assets/${namespace}/textures/${path}.png`, raw=pack.files.get(assetPath);
    if(!raw) { regions.set(name,regions.get('minecraft:block/missingno')!); continue; }
    try {
      const bitmap=await createImageBitmap(new Blob([raw.slice().buffer as ArrayBuffer],{type:'image/png'}));
      const scale=Math.min(1,cell/bitmap.width,cell/bitmap.height), drawWidth=Math.max(1,Math.round(bitmap.width*scale)),drawHeight=Math.max(1,Math.round(bitmap.height*scale));
      const insetX=Math.floor((cell-drawWidth)/2),insetY=Math.floor((cell-drawHeight)/2);
      context.drawImage(bitmap,x+insetX,y+insetY,drawWidth,drawHeight);
      regions.set(name,{x:x+insetX,y:y+insetY,width:cell,height:cell,sourceWidth:bitmap.width,sourceHeight:bitmap.height,drawWidth,drawHeight});
      bitmap.close();
    } catch { regions.set(name,regions.get('minecraft:block/missingno')!); }
  }
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; texture.magFilter=THREE.NearestFilter; texture.minFilter=THREE.NearestMipmapNearestFilter; texture.generateMipmaps=true;
  return {texture,regions,canvasWidth:canvas.width,canvasHeight:canvas.height};
}

function texturePixels(region: AtlasRegion, uv: number[], atlasWidth: number, atlasHeight: number) {
  const x=uv[0],y=uv[1];
  return [(region.x+(x/16)*region.drawWidth)/atlasWidth,1-(region.y+(y/16)*region.drawHeight)/atlasHeight] as [number,number];
}

function textureName(model: JsonObject, ref: string): string {
  const name=resolveTexture(model,ref);
  return name.endsWith('/missingno')?name:name;
}

function variantFaceGeometry(data: ChunkData, blockPosition: [number,number,number], from: number[], to: number[], direction: string, face: JsonObject, model: JsonObject, variant: ResolvedVariant, atlas: Awaited<ReturnType<typeof createAtlas>>, translucent: boolean) {
  const dir=DIRECTIONS[direction]; if(!dir) return;
  const raw=dir.corners(from,to);
  const elementRotation=face.__elementRotation as {origin:number[];axis:string;angle:number}|undefined;
  const uv=Array.isArray(face.uv)?face.uv as number[]:[0,0,16,16];
  let corners=[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]];
  const rotation=((Number(face.rotation??0)%360)+360)%360/90; for(let n=0;n<rotation;n++)corners=[corners[3],corners[0],corners[1],corners[2]];
  const texName=textureName(model,String(face.texture??'#missing')); const textureRegion=atlas.regions.get(texName)??atlas.regions.get('minecraft:block/missingno')!;
  const base=translucent?data.translucent:data.opaque,uvs=translucent?data.translucentUvs:data.opaqueUvs,colors=translucent?data.translucentColors:data.opaqueColors;
  const localPoints=raw.map((point)=>{
    let p=point;
    if(elementRotation) p=rotateModelPoint(p,elementRotation.origin,elementRotation.axis,elementRotation.angle) as FaceVertex;
    p=rotateBlockPoint(p,variant.x,variant.y) as FaceVertex;
    return [blockPosition[0]+p[0]/16,blockPosition[1]+p[1]/16,blockPosition[2]+p[2]/16] as [number,number,number];
  });
  const tint=face.tintindex===undefined?new THREE.Color(1,1,1):new THREE.Color(0.7,0.86,0.55);
  const order=[0,1,2,0,2,3];
  for(const cornerIndex of order){const p=localPoints[cornerIndex];base.push(p[0],p[1],p[2]);const tex=texturePixels(textureRegion,corners[cornerIndex],atlas.canvasWidth,atlas.canvasHeight);uvs.push(tex[0],tex[1]);colors.push(tint.r,tint.g,tint.b);}
}

export async function buildModelScene(pack: ResourcePack, region: Region, onProgress?: (done: number,total:number)=>void): Promise<{group:THREE.Group;dispose:()=>void;drawCalls:number;vertices:number}> {
  const blockEntries=[...region.blocks.entries()], positionStates=new Map(blockEntries), modelCache=new Map<string,JsonObject>(), resolvedByPosition=new Map<string,ResolvedVariant[]>(), textureNames:string[]=[];
  const allStates=new Map<string,{state:BlockState;entries:Array<[string,BlockState]>}>();
  for(const entry of blockEntries){const [key,state]=entry,effective=stateAt(region,positionStates,key,state),signature=JSON.stringify(effective);const group=allStates.get(signature)??{state:effective,entries:[]};group.entries.push(entry);allStates.set(signature,group);}
  let complete=0;
  for(const group of allStates.values()){
    const {state,entries}=group;
    for(const [key] of entries){
      const pos=key.split(',').map(Number) as [number,number,number];
      try {
        let variants=await selectBlockModels(pack.files,state.id,state.properties,pos,modelCache);
        if(!variants.length)variants=[{model:{textures:{missing:'minecraft:block/missingno'},elements:[{from:[0,0,0],to:[16,16,16],faces:Object.fromEntries(Object.keys(DIRECTIONS).map((direction)=>[direction,{texture:'#missing'}]))}]},x:0,y:0,uvlock:false}];
        for(const variant of variants){for(const element of variant.model.elements??[])for(const face of Object.values(element.faces??{}) as JsonObject[]){textureNames.push(textureName(variant.model,String(face.texture??'#missing')));}}
        resolvedByPosition.set(key,variants);
      } catch { const model={textures:{missing:'minecraft:block/missingno'},elements:[{from:[0,0,0],to:[16,16,16],faces:Object.fromEntries(Object.keys(DIRECTIONS).map((direction)=>[direction,{texture:'#missing'}]))}]};resolvedByPosition.set(key,[{model,x:0,y:0,uvlock:false}]);textureNames.push('minecraft:block/missingno'); }
      complete++;onProgress?.(complete,blockEntries.length);
    }
  }
  const atlas=await createAtlas(pack,textureNames);
  const chunks=new Map<string,ChunkData>();
  const getChunk=(x:number,y:number,z:number)=>{const cx=Math.floor(x/16)*16,cy=Math.floor(y/16)*16,cz=Math.floor(z/16)*16,key=`${cx},${cy},${cz}`;let data=chunks.get(key);if(!data){data={opaque:[],opaqueUvs:[],opaqueColors:[],translucent:[],translucentUvs:[],translucentColors:[]};chunks.set(key,data);}return {data,origin:[cx,cy,cz] as [number,number,number]};};
  for(const [key,state] of blockEntries){
    const effective=stateAt(region,positionStates,key,state),variants=resolvedByPosition.get(key)??[],absolute=key.split(',').map(Number),local=[absolute[0]-region.origin[0],absolute[1]-region.origin[1],absolute[2]-region.origin[2]],chunk=getChunk(local[0],local[1],local[2]), id=state.id.split(':').pop()??'', translucent=/(?:glass|ice|water|lava|honey|slime|stained_glass|stained_glass_pane)/.test(id);
    for(const variant of variants) for(const element of variant.model.elements??[]){
      const from=Array.isArray(element.from)?element.from:[0,0,0],to=Array.isArray(element.to)?element.to:[16,16,16];
      for(const [direction,faceValue] of Object.entries(element.faces??{})){
        if(!variant.x&&!variant.y&&!element.rotation&&cullAgainstNeighbor(key,faceValue as JsonObject,positionStates))continue;
        const face={...(faceValue as JsonObject),__elementRotation:element.rotation?{origin:element.rotation.origin??[8,8,8],axis:element.rotation.axis??'y',angle:element.rotation.angle??0}:undefined};
        variantFaceGeometry(chunk.data,[local[0]-chunk.origin[0],local[1]-chunk.origin[1],local[2]-chunk.origin[2]],from,to,direction,face,variant.model,variant,atlas,translucent);
      }
    }
  }
  const group=new THREE.Group();group.name='Minecraft model scene';group.position.set(-region.size[0]/2,0,-region.size[2]/2);
  const opaqueMaterial=new THREE.MeshStandardMaterial({map:atlas.texture,vertexColors:true,roughness:0.86,alphaTest:0.08,side:THREE.DoubleSide});
  const translucentMaterial=new THREE.MeshStandardMaterial({map:atlas.texture,vertexColors:true,roughness:0.22,transparent:true,opacity:0.62,depthWrite:false,alphaTest:0.01,side:THREE.DoubleSide});
  let drawCalls=0,vertices=0;
  for(const [key,data] of chunks){const origin=key.split(',').map(Number);for(const [positions,uvs,colors,material] of [[data.opaque,data.opaqueUvs,data.opaqueColors,opaqueMaterial],[data.translucent,data.translucentUvs,data.translucentColors,translucentMaterial]] as const){if(!positions.length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.position.set(origin[0],origin[1],origin[2]);mesh.frustumCulled=true;group.add(mesh);drawCalls++;vertices+=positions.length/3;}}
  return {group,drawCalls,vertices,dispose:()=>{group.traverse((obj)=>{if(obj instanceof THREE.Mesh)obj.geometry.dispose();});opaqueMaterial.dispose();translucentMaterial.dispose();atlas.texture.dispose();}};
}
