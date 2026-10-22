import { Build } from '../model';
import { exportLegacy, importLegacy } from './legacy';
import { exportLitematic, importLitematic } from './litematic';
import { exportSponge, importSponge } from './sponge';

export type SchematicFormat='schem'|'litematic'|'schematic';
export function builderProjectData(build:Build){return {format:'minecraft-ai-builder',version:1,name:build.name,dataVersion:build.dataVersion,metadata:build.metadata,regions:build.regions.map(r=>({name:r.name,origin:r.origin,size:r.size,visible:r.visible,blocks:[...r.blocks.entries()]}))};}
export async function parseImportedFile(file:File,parseBuilder:(v:unknown)=>Build):Promise<Build>{
  const ext=file.name.toLowerCase().split('.').pop();
  if(ext==='json'){return parseBuilder(JSON.parse(await file.text()));}
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(ext==='schem')return importSponge(bytes);
  if(ext==='litematic')return importLitematic(bytes);
  if(ext==='schematic')return importLegacy(bytes);
  throw new Error('Choose a Builder JSON, Sponge .schem, Litematica .litematic, or legacy .schematic file.');
}
export async function serializeSchematic(build:Build,format:SchematicFormat){
  if(format==='schem')return exportSponge(build);if(format==='litematic')return exportLitematic(build);return exportLegacy(build);
}
export async function readSchematic(input:Uint8Array,format:SchematicFormat){
  if(format==='schem')return importSponge(input);if(format==='litematic')return importLitematic(input);return importLegacy(input);
}
