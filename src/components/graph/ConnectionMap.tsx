'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphData, EntityType } from '@/lib/types';

const TYPE_COLORS: Record<EntityType, string> = {
  PERSON: '#3B6FE0',
  COMPANY: '#2FB6C9',
  PUBLIC_BODY: '#E8A23D',
  LEGAL_CASE: '#E0533B',
  CONTRACT: '#F07A66',
  ADDRESS: '#9AAABD',
  DOCUMENT: '#E0533B',
  WEBSITE: '#5B86E8',
  OTHER: '#5E6E81',
};

const TYPE_LABELS: Record<EntityType, string> = {
  PERSON: 'PF',
  COMPANY: 'PJ',
  PUBLIC_BODY: 'Órgão',
  LEGAL_CASE: 'Processo',
  CONTRACT: 'Contrato',
  ADDRESS: 'Endereço',
  DOCUMENT: 'Doc',
  WEBSITE: 'Web',
  OTHER: 'Outro',
};

function EntityNode({ data }: { data: { label: string; entityType: EntityType } }) {
  const color = TYPE_COLORS[data.entityType] || '#5E6E81';
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
      <div
        className="rounded-full flex items-center justify-center border-2"
        style={{
          width: data.entityType === 'PERSON' ? 60 : 50,
          height: data.entityType === 'PERSON' ? 60 : 50,
          borderColor: color,
          background: `${color}22`,
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: data.entityType === 'PERSON' ? 24 : 20,
            height: data.entityType === 'PERSON' ? 24 : 20,
            background: color,
          }}
        />
      </div>
      <div className="mt-1.5 text-[10px] text-[var(--txt-2)] font-medium text-center max-w-[100px] leading-tight">
        {data.label}
      </div>
      <div className="text-[8px] text-[var(--txt-faint)] font-mono mt-0.5">
        {TYPE_LABELS[data.entityType]}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

interface ConnectionMapProps {
  graphData: GraphData;
}

export default function ConnectionMap({ graphData }: ConnectionMapProps) {
  const nodes: Node[] = useMemo(() => {
    const positions = generatePositions(graphData.nodes.length);
    return graphData.nodes.map((n, i) => ({
      id: n.id,
      type: 'entity',
      position: positions[i],
      data: { label: n.label, entityType: n.type },
    }));
  }, [graphData.nodes]);

  const edges: Edge[] = useMemo(() =>
    graphData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      style: { stroke: 'var(--line)', strokeWidth: 1.3 },
      labelStyle: { fontSize: 9, fill: 'var(--txt-faint)', fontFamily: 'var(--mono)' },
      labelBgStyle: { fill: 'var(--void)', fillOpacity: 0.8 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 3,
    })),
  [graphData.edges]);

  const onInit = useCallback(() => {}, []);

  return (
    <div className="panel overflow-hidden" style={{ height: 520 }}>
      <div className="relative w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,111,224,.04),transparent_70%)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
        >
          <Background color="var(--line-soft)" gap={40} size={1} />
          <Controls
            className="!bg-[var(--glass-2)] !border-[var(--line-soft)] !rounded-[var(--r-sm)] [&>button]:!bg-[var(--graphite)] [&>button]:!border-[var(--line-soft)] [&>button]:!text-[var(--txt-2)] [&>button:hover]:!bg-[var(--slate)]"
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-[14px] left-[14px] flex flex-col gap-[7px] bg-[var(--glass-2)] backdrop-blur-[8px] border border-[var(--line-soft)] rounded-[var(--r-sm)] p-3">
          {Object.entries(TYPE_COLORS).slice(0, 4).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-[11px] text-[var(--txt-2)]">
              <span className="w-[10px] h-[10px] rounded-full" style={{ background: color }} />
              {TYPE_LABELS[type as EntityType]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function generatePositions(count: number): { x: number; y: number }[] {
  const centerX = 400;
  const centerY = 220;
  const positions: { x: number; y: number }[] = [];

  if (count === 0) return positions;

  positions.push({ x: centerX, y: centerY });

  for (let i = 1; i < count; i++) {
    const angle = ((i - 1) / (count - 1)) * Math.PI * 2;
    const radius = 180 + (i % 2) * 40;
    positions.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  return positions;
}
