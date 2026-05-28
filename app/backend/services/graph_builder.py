"""构建供应链网络图 + 推断层次关系。

输入：data_merger 输出的 nodes 和 edges
输出：图结构 dict（节点列表 + 边列表 + 层次信息）

不假设 node1→node2 的方向即上下游关系，
只基于边的连接数推断"更可能是上游"的节点。
"""

from collections import defaultdict
from typing import Optional

from utils.error_utils import WarningCollector


class GraphBuilder:
    """供应链网络图构建器。

    用法:
        builder = GraphBuilder()
        graph = builder.build(nodes=unified["nodes"], edges=unified["edges"])
    """

    def __init__(self):
        self.warnings = WarningCollector()

    def build(
        self,
        nodes: list[dict],
        edges: list[dict],
    ) -> dict:
        """构建图结构。

        Args:
            nodes: 节点列表，每个 dict 需含 node_id
            edges: 边列表，每个 dict 需含 upstream_node_id / downstream_node_id
                   或 node1 / node2

        Returns:
            dict:
                - nodes: 增强后的节点列表（含层次、度数）
                - edges: 标准化后的边列表（含方向推断结果）
                - graph_meta: 图元信息
                - adjacency: 邻接表
                - warnings: 图构建过程中的问题
        """
        self.warnings = WarningCollector()

        if not nodes:
            self.warnings.add_warning(
                type="no_nodes",
                message="没有节点数据，无法构建网络图。",
            )
            return self._empty_graph()

        # 标准化节点和边
        node_map = self._normalize_nodes(nodes)
        edge_list = self._normalize_edges(edges, node_map)

        if not edge_list:
            self.warnings.add_warning(
                type="no_edges",
                message="没有边数据，网络图将只包含孤立节点。",
            )

        # 计算度数
        in_degree: dict[str, int] = defaultdict(int)
        out_degree: dict[str, int] = defaultdict(int)
        adjacency: dict[str, list[str]] = defaultdict(list)

        for edge in edge_list:
            src = edge["source"]
            tgt = edge["target"]
            out_degree[src] += 1
            in_degree[tgt] += 1
            adjacency[src].append(tgt)
            adjacency[tgt].append(src)

        # 推断层次关系
        level_map = self._infer_levels(node_map, in_degree, out_degree)

        # 增强节点信息
        enhanced_nodes = []
        for nid, info in node_map.items():
            enhanced_nodes.append({
                "node_id": nid,
                "node_name": info.get("node_name", nid),
                "node_type": info.get("node_type", ""),
                "level": level_map.get(nid, -1),
                "in_degree": in_degree.get(nid, 0),
                "out_degree": out_degree.get(nid, 0),
                "attributes": info.get("attributes", {}),
            })

        graph_meta = {
            "node_count": len(enhanced_nodes),
            "edge_count": len(edge_list),
            "max_level": max(level_map.values()) if level_map else -1,
            "isolated_nodes": len(node_map) - len(in_degree) - len(out_degree),
            "direction_inferred": True,
            "direction_note": "方向基于度数推断，上游=出度>入度，下游=入度>出度。未确认的供应链实际方向以 limited 标记。",
        }

        return {
            "nodes": enhanced_nodes,
            "edges": edge_list,
            "graph_meta": graph_meta,
            "adjacency": dict(adjacency),
            "warnings": self.warnings.to_list(),
        }

    # ── 标准化 ──────────────────────────────────────────────

    def _normalize_nodes(self, nodes: list[dict]) -> dict[str, dict]:
        """标准化节点：以 node_id 为 key 构建查找表。"""
        node_map = {}
        for n in nodes:
            nid = n.get("node_id", "")
            if not nid:
                continue
            node_map[str(nid)] = {
                "node_name": n.get("node_name", nid),
                "node_type": n.get("node_type", ""),
                "attributes": {k: v for k, v in n.items()
                               if k not in ("node_id", "node_name", "node_type")},
            }
        return node_map

    def _normalize_edges(
        self, edges: list[dict], node_map: dict[str, dict]
    ) -> list[dict]:
        """标准化边：统一用 source/target 表示。

        处理两种列名格式：
        - upstream_node_id / downstream_node_id
        - node1 / node2
        """
        result = []
        for e in edges:
            src = e.get("upstream_node_id") or e.get("node1") or e.get("node_id", "")
            tgt = e.get("downstream_node_id") or e.get("node2") or ""
            src = str(src).strip()
            tgt = str(tgt).strip()

            if not src or not tgt:
                continue
            if src == tgt:
                continue  # 跳过自环

            # 验证节点存在于节点列表中
            if node_map and (src not in node_map or tgt not in node_map):
                self.warnings.add_warning(
                    type="edge_unknown_node",
                    message=f"边 ({src} → {tgt}) 中包含不在节点列表中的节点。",
                )

            rel_type = e.get("relation_type") or self._infer_relation_type(e)
            context = e.get("context", "")

            result.append({
                "source": src,
                "target": tgt,
                "relation_type": rel_type,
                "context": context,
                "context_value": e.get("context_value", ""),
            })

        return result

    def _infer_relation_type(self, edge: dict) -> str:
        """推断边的关���类型。"""
        ctx = str(edge.get("context", "")).lower()
        if "plant" in ctx:
            return "plant_relation"
        if "storage" in ctx:
            return "storage_relation"
        if "product" in ctx or "group" in ctx or "sub" in ctx:
            return "product_hierarchy"
        return "unknown"

    # ── 层次推断 ────────────────────────────────────────────

    def _infer_levels(
        self,
        node_map: dict[str, dict],
        in_degree: dict[str, int],
        out_degree: dict[str, int],
    ) -> dict[str, int]:
        """推断每个节点的层次位置。

        规则：
        - 出度 > 入度 → 更可能是上游（level 小）
        - 入度 > 出度 → 更可能是下游（level 大）
        - 通过 BFS 从上游节点向下游传播 level
        """
        if not node_map:
            return {}

        # 找到可能的根节点（只出不进或出度 >> 入度）
        roots = []
        for nid in node_map:
            o_deg = out_degree.get(nid, 0)
            i_deg = in_degree.get(nid, 0)
            if o_deg > 0 and i_deg == 0:
                roots.append(nid)
            elif o_deg > i_deg * 2:
                roots.append(nid)

        # 如果没有明显根节点，取出度最大的节点
        if not roots:
            max_out = max(out_degree.values()) if out_degree else 0
            roots = [nid for nid, d in out_degree.items() if d == max_out]

        # BFS 分配 level
        levels = {}
        for root in roots:
            levels[root] = 0

        # 从根节点出发，按邻接关系传播
        visited = set(roots)
        queue = list(roots)
        while queue:
            current = queue.pop(0)
            current_level = levels[current]

            # 找到当前节点的邻居
            for nid in node_map:
                if nid not in visited:
                    # 如果与当前节点共享出/入度关系
                    if out_degree.get(current, 0) > 0 and in_degree.get(nid, 0) > 0:
                        levels[nid] = min(levels.get(nid, 999), current_level + 1)
                        if nid not in visited:
                            visited.add(nid)
                            queue.append(nid)

        # 未分配 level 的节点给默认值
        for nid in node_map:
            if nid not in levels:
                levels[nid] = -1

        return levels

    # ── 辅助 ──────────────────────────────────────────────

    @staticmethod
    def _empty_graph() -> dict:
        return {
            "nodes": [],
            "edges": [],
            "graph_meta": {
                "node_count": 0,
                "edge_count": 0,
                "max_level": -1,
                "isolated_nodes": 0,
                "direction_inferred": False,
            },
            "adjacency": {},
            "warnings": [],
        }
