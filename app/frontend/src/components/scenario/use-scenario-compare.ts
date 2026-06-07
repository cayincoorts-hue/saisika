import { useState, useCallback, useMemo } from 'react';
import { getScenarioParams, runScenarioCompare } from '../../utils/api';

export type ViewMode = 'normal' | 'editing' | 'comparing';

export interface ScenarioParam {
  name: string;
  type: 'integer' | 'enum';
  current: number | string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface ScenarioChange {
  node_id: string;
  param: string;
  to_value: number | string;
}

export interface CompareResult {
  original_scenario: any;
  modified_scenario: any;
  diff: { changes: string[]; risk_score_changes: Record<string, any>; affected_nodes: string[]; trend: string };
}

export interface NodeEntry {
  nodeId: string;
  params: ScenarioParam[];
  loading: boolean;
}

export function useScenarioCompare(batchId: string) {
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [nodes, setNodes] = useState<NodeEntry[]>([]);
  const [changes, setChanges] = useState<ScenarioChange[]>([]);
  const [panelError, setPanelError] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  const openPanel = (nodeIds: string[]) => {
    console.log('OPEN PANEL called with', nodeIds.length, 'nodes');
    if (!nodeIds.length) return;

    setViewMode('editing');
    setPanelError('');
    setNodes(nodeIds.map(nid => ({ nodeId: nid, params: [], loading: true })));

    // Load params for all nodes in parallel
    Promise.all(
      nodeIds.map(nid =>
        getScenarioParams(nid, batchId)
          .then(d => ({ nodeId: nid, params: (d.params || []) as ScenarioParam[], loading: false }))
          .catch(() => ({ nodeId: nid, params: [] as ScenarioParam[], loading: false }))
      )
    ).then(results => {
      setNodes(results);
    });
  };

  const updateChange = useCallback((nodeId: string, param: string, toValue: number | string) => {
    setChanges(prev => {
      const filtered = prev.filter(c => !(c.node_id === nodeId && c.param === param));
      return [...filtered, { node_id: nodeId, param, to_value: toValue }];
    });
  }, []);

  const removeNodeChanges = useCallback((nodeId: string) => {
    setChanges(prev => prev.filter(c => c.node_id !== nodeId));
  }, []);

  const resetChanges = useCallback(() => {
    setChanges([]);
  }, []);

  const runCompare = useCallback(async () => {
    if (changes.length === 0) return;
    setCompareLoading(true);
    setCompareError('');
    setPanelError('');
    try {
      const result = await runScenarioCompare(batchId, changes);
      setCompareResult(result);
      setViewMode('comparing');
    } catch (err: any) {
      const msg = err?.detail || err?.message || '对比计算失败';
      setCompareError(msg);
      setPanelError(msg);
    } finally {
      setCompareLoading(false);
    }
  }, [batchId, changes]);

  const backToEditor = useCallback(() => {
    setViewMode('editing');
    setCompareError('');
    setPanelError('');
  }, []);

  const closeEditor = useCallback(() => {
    setViewMode('normal');
    setNodes([]);
    setChanges([]);
    setPanelError('');
    setCompareError('');
  }, []);

  const hasChanges = changes.length > 0;

  const changedNodeIds = useMemo(
    () => [...new Set(changes.map(c => c.node_id))],
    [changes]
  );

  return {
    viewMode, nodes, changes, changedNodeIds,
    panelError, compareLoading, compareError, compareResult, hasChanges,
    openPanel, updateChange, removeNodeChanges, resetChanges,
    runCompare, backToEditor, closeEditor,
  };
}
