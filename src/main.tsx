import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import type { Mesh } from 'three';
import './style.css';
import { AIR, Build, BlockState, emptyBuild, posKey, setBlock } from './model';
import { builderProjectData, parseImportedFile, serializeSchematic, SchematicFormat } from './formats';

type Tool = 'place' | 'remove' | 'eyedropper';
type History = { past: Build[]; present: Build; future: Build[] };
type PaletteBlock = { id: string; name: string; color: string };

const BLOCKS: PaletteBlock[] = [
  { id: 'minecraft:stone', name: 'Stone', color: '#858585' },
  { id: 'minecraft:oak_planks', name: 'Oak Planks', color: '#ad8758' },
  { id: 'minecraft:glass', name: 'Glass', color: '#9bcac5' },
  { id: 'minecraft:bricks', name: 'Bricks', color: '#995c4d' },
  { id: 'minecraft:dirt', name: 'Dirt', color: '#795d43' },
  { id: 'minecraft:oak_log', name: 'Oak Log', color: '#73553b' },
  { id: 'minecraft:white_wool', name: 'White Wool', color: '#e8e5dc' },
  { id: 'minecraft:pink_wool', name: 'Pink Wool', color: '#ed8eaa' },
];
const MAX_BLOCKS = 30_000;

function copyBuild(build: Build): Build {
  return {
    ...build,
    regions: build.regions.map((region) => ({
      ...region,
      origin: [...region.origin] as [number, number, number],
      size: [...region.size] as [number, number, number],
      blocks: new Map([...region.blocks].map(([key, block]) => [key, { ...block, properties: { ...block.properties } }])),
    })),
    metadata: { ...build.metadata },
  };
}

function fromFileData(value: unknown): Build {
  if (!value || typeof value !== 'object') throw new Error('This is not a Minecraft AI Builder project file.');
  const data = value as Record<string, unknown>;
  if (data.format !== 'minecraft-ai-builder' || data.version !== 1 || !Array.isArray(data.regions)) {
    throw new Error('Unsupported project file format or version.');
  }
  const regions = data.regions.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid region in project file.');
    const item = entry as Record<string, unknown>;
    if (!Array.isArray(item.size) || !Array.isArray(item.origin) || !Array.isArray(item.blocks)) throw new Error('Invalid region data.');
    const regionBuild = emptyBuild(item.size as [number, number, number]).regions[0];
    const origin = item.origin as number[];
    if (origin.length !== 3 || origin.some((n) => !Number.isInteger(n) || Math.abs(n) > 30_000)) throw new Error('Invalid region origin.');
    const blockEntries = item.blocks as [string, BlockState][];
    if (blockEntries.length > MAX_BLOCKS) throw new Error(`Projects are limited to ${MAX_BLOCKS.toLocaleString()} blocks.`);
    const blocks = new Map<string, BlockState>();
    for (const [key, block] of blockEntries) {
      if (typeof key !== 'string' || !block || typeof block.id !== 'string' || !block.id.startsWith('minecraft:')) throw new Error('Invalid block entry.');
      const coordinate = key.split(',').map(Number);
      if (coordinate.length !== 3 || coordinate.some((n, index) => !Number.isInteger(n) || n < origin[index] || n >= origin[index] + regionBuild.size[index])) throw new Error('A block falls outside its region bounds.');
      blocks.set(key, { id: block.id, properties: { ...block.properties } });
    }
    return {
      name: typeof item.name === 'string' ? item.name : 'Region',
      origin: origin as [number, number, number],
      size: regionBuild.size,
      blocks,
      visible: item.visible !== false,
    };
  });
  if (regions.length === 0 || regions.length > 16) throw new Error('A project must contain between 1 and 16 regions.');
  return {
    name: typeof data.name === 'string' ? data.name.slice(0, 80) : 'Untitled Build',
    regions,
    dataVersion: typeof data.dataVersion === 'number' ? data.dataVersion : undefined,
    metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata as Record<string, unknown> : {},
  };
}

function BlockCube({
  coordinate, state, color, size, origin, onAction,
}: {
  coordinate: [number, number, number]; state: BlockState; color: string; size: [number, number, number]; origin: [number, number, number];
  onAction: (event: ThreeEvent<MouseEvent>, coordinate: [number, number, number]) => void;
}) {
  const mesh = useRef<Mesh>(null);
  const local: [number, number, number] = [
    coordinate[0] - origin[0] - size[0] / 2 + 0.5,
    coordinate[1] - origin[1] + 0.5,
    coordinate[2] - origin[2] - size[2] / 2 + 0.5,
  ];
  const id=state.id.slice(state.id.indexOf(':')+1),props=state.properties;
  const transparent=/(?:glass|ice|water|honey|slime)/.test(id);
  const material=<meshStandardMaterial color={color} roughness={transparent?0.22:0.82} transparent={transparent} opacity={transparent?0.58:1} depthWrite={!transparent} />;
  const at=(geometry:[number,number,number],position:[number,number,number]=[0,0,0],key='part')=><mesh key={key} ref={key==='main'?mesh:undefined} position={position} onClick={(event)=>onAction(event,coordinate)} castShadow receiveShadow><boxGeometry args={geometry}/>{material}</mesh>;
  if(id.endsWith('_slab'))return <group position={local}>{at([0.98,0.49,0.98],[0,props.type==='top'?0.75:0.25,0],'slab')}</group>;
  if(id==='snow') {const h=Math.max(1,Math.min(8,Number(props.layers??1)))/8;return <group position={local}>{at([0.98,h,0.98],[0,h/2-0.5,0],'snow')}</group>;}
  if(id.endsWith('_carpet'))return <group position={local}>{at([0.98,0.0625,0.98],[0,-0.46875,0],'carpet')}</group>;
  if(id.endsWith('_stairs')) {
    const yaw=({south:0,west:Math.PI/2,north:Math.PI,east:-Math.PI/2} as Record<string,number>)[props.facing??'north']??0;
    const upside=props.half==='top';
    return <group position={local} rotation={[0,yaw,0]}>{at([0.98,0.49,0.98],[0,upside?0.25:-0.25,0],'stair-base')}{at([0.98,0.49,0.49],[0,upside?-0.25:0.25,-0.245],'stair-step')}</group>;
  }
  if(id.endsWith('_door')) {
    const yaw=({south:0,west:Math.PI/2,north:Math.PI,east:-Math.PI/2} as Record<string,number>)[props.facing??'north']??0;
    return <group position={local} rotation={[0,yaw+(props.open==='true'?Math.PI/2:0),0]}>{at([0.96,0.98,0.08],[0,0,-0.45],'door')}</group>;
  }
  return <mesh ref={mesh} position={local} onClick={(event)=>onAction(event,coordinate)} castShadow receiveShadow><boxGeometry args={[0.98,0.98,0.98]} />{material}</mesh>;
}

function App() {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: emptyBuild(), future: [] }));
  const [selectedBlock, setSelectedBlock] = useState(BLOCKS[0].id);
  const [tool, setTool] = useState<Tool>('place');
  const [blockSearch, setBlockSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [dimensions, setDimensions] = useState<[number, number, number]>([16, 16, 16]);
  const fileInput = useRef<HTMLInputElement>(null);
  const build = history.present;
  const region = build.regions[0];
  const blockCount = region.blocks.size;
  const selected = BLOCKS.find((block) => block.id === selectedBlock) ?? BLOCKS[0];
  const visibleBlocks = useMemo(() => [...region.blocks.entries()], [region.blocks]);
  const palette = BLOCKS.filter((block) => block.name.toLowerCase().includes(blockSearch.toLowerCase()));

  function commit(next: Build) {
    setHistory((current) => ({ past: [...current.past.slice(-49), current.present], present: next, future: [] }));
    setNotice('');
  }

  function updateBlock(coordinate: [number, number, number], state: BlockState) {
    const next = copyBuild(build);
    if (state.id !== 'minecraft:air' && !next.regions[0].blocks.has(posKey(...coordinate)) && blockCount >= MAX_BLOCKS) {
      setNotice(`This build is limited to ${MAX_BLOCKS.toLocaleString()} blocks.`);
      return;
    }
    try {
      setBlock(next, 0, ...coordinate, state);
      commit(next);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update block.');
    }
  }

  function actOnBlock(event: ThreeEvent<MouseEvent>, coordinate: [number, number, number]) {
    event.stopPropagation();
    if (tool === 'remove') {
      updateBlock(coordinate, AIR);
      return;
    }
    if (tool === 'eyedropper') {
      const block = region.blocks.get(posKey(...coordinate));
      if (block) {
        setSelectedBlock(block.id);
        setTool('place');
      }
      return;
    }
    const normal = event.face?.normal;
    if (!normal) return;
    const nextCoordinate: [number, number, number] = [
      coordinate[0] + Math.round(normal.x),
      coordinate[1] + Math.round(normal.y),
      coordinate[2] + Math.round(normal.z),
    ];
    updateBlock(nextCoordinate, { id: selectedBlock, properties: {} });
  }

  function placeOnFloor(event: ThreeEvent<MouseEvent>) {
    if (tool !== 'place') return;
    const coordinate: [number, number, number] = [
      Math.floor(event.point.x + region.size[0] / 2) + region.origin[0],
      region.origin[1],
      Math.floor(event.point.z + region.size[2] / 2) + region.origin[2],
    ];
    updateBlock(coordinate, { id: selectedBlock, properties: {} });
  }

  function fillBaseLayer() {
    const next = copyBuild(build);
    const [sx, , sz] = region.size;
    if (blockCount + sx * sz > MAX_BLOCKS) {
      setNotice(`The base layer would exceed the ${MAX_BLOCKS.toLocaleString()} block limit.`);
      return;
    }
    for (let z = 0; z < sz; z += 1) for (let x = 0; x < sx; x += 1) {
      setBlock(next, 0, x + region.origin[0], region.origin[1], z + region.origin[2], { id: selectedBlock, properties: {} });
    }
    commit(next);
  }

  function undo() {
    setHistory((current) => {
      if (!current.past.length) return current;
      const previous = current.past[current.past.length - 1];
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  }

  function redo() {
    setHistory((current) => {
      if (!current.future.length) return current;
      const [next, ...future] = current.future;
      return { past: [...current.past, current.present], present: next, future };
    });
  }

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [history]);

  function createBuild(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blockCount > 0 && !window.confirm('Create a new schematic? Unsaved edits in the current build will be cleared.')) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || 'Untitled Build').trim().slice(0, 80) || 'Untitled Build';
    try {
      const next = emptyBuild(dimensions);
      next.name = name;
      setHistory({ past: [], present: next, future: [] });
      setDialogOpen(false);
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Invalid dimensions.');
    }
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeName() { return build.name.replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'build'; }

  function exportProject() {
    const blob = new Blob([JSON.stringify(builderProjectData(build), null, 2)], { type: 'application/json' });
    download(blob, `${safeName()}.mcbuilder.json`);
  }

  async function exportMinecraft(format: SchematicFormat) {
    try {
      const result = await serializeSchematic(build, format);
      const label = format === 'schem' ? 'Sponge' : format === 'litematic' ? 'Litematica' : 'Legacy';
      download(new Blob([Uint8Array.from(result).buffer], { type: 'application/octet-stream' }), `${safeName()}.${format}`);
      setNotice(`${label} schematic exported.`);
    } catch(error) { setNotice(error instanceof Error ? error.message : 'Could not export schematic.'); }
  }

  async function importProject(file?: File) {
    if (!file) return;
    try {
      const next = await parseImportedFile(file, fromFileData);
      setHistory({ past: [], present: next, future: [] });
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not open project file.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <main className="app">
      <header>
        <strong className="brand">▦ &nbsp; MINECRAFT <span>AI BUILDER</span></strong>
        <nav aria-label="Project actions">
          <button onClick={() => setDialogOpen(true)}>New</button>
          <button onClick={undo} disabled={!history.past.length} title="Undo (Ctrl+Z)">Undo</button>
          <button onClick={redo} disabled={!history.future.length} title="Redo (Ctrl+Y)">Redo</button>
          <button onClick={() => fileInput.current?.click()}>Open</button>
          <button onClick={exportProject}>Save JSON</button>
          <button onClick={() => void exportMinecraft('schem')}>Export .schem</button>
          <button onClick={() => void exportMinecraft('litematic')}>Export .litematic</button>
          <button onClick={() => void exportMinecraft('schematic')}>Export .schematic</button>
          <input ref={fileInput} className="file-input" type="file" accept=".json,.mcbuilder.json,.schem,.litematic,.schematic,application/json,application/octet-stream" onChange={(event) => void importProject(event.target.files?.[0])} />
        </nav>
        <div className="project">{build.name.toUpperCase()} <i /></div>
      </header>
      <aside className="left">
        <section><h2>PROJECT</h2><div className="region selected">▰ &nbsp; {region.name}<small>{region.size.join(' × ')}</small></div></section>
        <section>
          <h2>TOOLS</h2>
          {([
            ['＋', 'Place block', 'place'], ['−', 'Remove block', 'remove'], ['⌗', 'Eyedropper', 'eyedropper'],
          ] as const).map(([icon, label, value]) => <button className={`tool ${tool === value ? 'active' : ''}`} key={value} onClick={() => setTool(value)}><b>{icon}</b>{label}</button>)}
          <button className="tool" onClick={fillBaseLayer}><b>▧</b>Fill base layer</button>
        </section>
        <section>
          <h2>BLOCK LIBRARY</h2>
          <input aria-label="Search blocks" placeholder="⌕  Search blocks" value={blockSearch} onChange={(event) => setBlockSearch(event.target.value)} />
          <div className="blocks">{palette.map((block) => <button className={`block ${selectedBlock === block.id ? 'chosen' : ''}`} key={block.id} onClick={() => { setSelectedBlock(block.id); setTool('place'); }}><i style={{ background: block.color }} />{block.name}</button>)}</div>
        </section>
      </aside>
      <section className="viewport">
        <div className="viewhead"><span>VIEWPORT <small>Perspective · drag to orbit · scroll to zoom</small></span><div><button onClick={fillBaseLayer}>Fill layer</button></div></div>
        <div className="scene">
          <Canvas camera={{ position: [17, 16, 21], fov: 42 }} shadows dpr={[1, 1.5]}>
            <color attach="background" args={['#11151b']} />
            <ambientLight intensity={1.4} />
            <directionalLight position={[8, 16, 6]} intensity={2.2} castShadow />
            <group>
              {visibleBlocks.map(([key, block]) => {
                const coordinate = key.split(',').map(Number) as [number, number, number];
                const paletteBlock = BLOCKS.find((item) => item.id === block.id);
                return <BlockCube key={key} coordinate={coordinate} state={block} color={paletteBlock?.color ?? '#888'} size={region.size} origin={region.origin} onAction={actOnBlock} />;
              })}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} onClick={placeOnFloor}>
                <planeGeometry args={[region.size[0], region.size[2]]} />
                <meshStandardMaterial color="#313a46" />
              </mesh>
              <Grid position={[0, 0, 0]} args={[region.size[0], region.size[2]]} cellSize={1} cellThickness={0.7} cellColor="#637284" sectionSize={4} sectionThickness={1.1} sectionColor="#8594a3" fadeDistance={40} infiniteGrid={false} />
            </group>
            <OrbitControls makeDefault target={[0, region.size[1] / 3, 0]} minDistance={5} maxDistance={80} maxPolarAngle={Math.PI * 0.49} />
          </Canvas>
          {blockCount === 0 && <div className="empty"><div className="cube">⬡</div><strong>YOUR BUILD STARTS HERE</strong><p>Choose a block, then click the grid to place it.</p><button className="primary" onClick={() => setDialogOpen(true)}>Create new schematic</button></div>}
          <div className="axis">X <b>Y</b> Z</div>
          <div className="coords">{selected.name} · {blockCount.toLocaleString()} BLOCKS</div>
        </div>
        <footer>{blockCount.toLocaleString()} BLOCKS <span>·</span> DIMENSIONS {region.size.join(' × ')} <span>·</span> LOCAL PROJECT</footer>
      </section>
      <aside className="right">
        <section><h2>INSPECTOR <span>⌄</span></h2><div className="selected-inspector"><i style={{ background: selected.color }} />{selected.name}<small>{selected.id}</small></div><p className="muted">Click a placed block to remove it or place the selected block beside it.</p></section>
        <section><h2>REGION</h2><p className="muted">Origin&nbsp; 0, 0, 0</p><p className="muted">Size&nbsp;&nbsp;&nbsp; {region.size.join(', ')}</p></section>
        <section className="future"><div className="spark">✳</div><h3>BUILDING OPERATIONS</h3><p>AI-assisted generation is planned for a later phase. Edits here are direct and undoable.</p></section>
        <section className="format-note"><h2>FORMAT SUPPORT</h2><p>Open and export Builder JSON and Sponge .schem, Litematica .litematic, and Alpha-era legacy .schematic NBT files. Legacy conversion covers a documented subset of classic block IDs.</p></section>
      </aside>
      <div className="status"><span>● LOCAL PROJECT</span><span>{tool.toUpperCase()} TOOL</span><span>PHASE 1 DEVELOPMENT</span></div>
      {notice && <div className="notice" role="alert">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
      {dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
        <form className="dialog" onSubmit={createBuild} aria-label="Create schematic">
          <div className="dialog-head"><div><h2>New schematic</h2><p>Choose the size of your editable region.</p></div><button type="button" aria-label="Close" onClick={() => setDialogOpen(false)}>×</button></div>
          <label>Build name<input name="name" defaultValue="Untitled Build" maxLength={80} /></label>
          <fieldset><legend>Dimensions (1–512)</legend>{(['Width', 'Height', 'Length'] as const).map((label, index) => <label key={label}>{label}<input type="number" min="1" max="512" value={dimensions[index]} onChange={(event) => setDimensions((current) => current.map((n, i) => i === index ? Number(event.target.value) : n) as [number, number, number])} /></label>)}</fieldset>
          <div className="dialog-actions"><button type="button" onClick={() => setDialogOpen(false)}>Cancel</button><button className="primary" type="submit">Create region</button></div>
        </form>
      </div>}
    </main>
  );
}

const rootStoreKey='__minecraftAiBuilderReactRoot';
const rootStore=window as Window & { [rootStoreKey]?: ReturnType<typeof createRoot> };
rootStore[rootStoreKey]??=createRoot(document.getElementById('root')!);
rootStore[rootStoreKey]!.render(<React.StrictMode><App /></React.StrictMode>);
