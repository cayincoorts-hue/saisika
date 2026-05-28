"""导出分析结果为 JSON 和 HTML。

输出文件存入 data/results/ 目录，启动时自动扫描。
"""

import json
import os
from datetime import datetime
from pathlib import Path


class ResultExporter:
    """分析结果导出器。

    用法:
        exporter = ResultExporter(output_dir="data/results")
        paths = exporter.export(analysis_result, batch_id="batch_001")
    """

    def __init__(self, output_dir: str = "data/results"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export(self, analysis_result: dict, batch_id: str = "") -> dict:
        """导出分析结果。

        Args:
            analysis_result: analysis_engine 组装的完整结果
            batch_id: 批次标识，为空则自动生成

        Returns:
            dict: {"json_path": str, "html_path": str, "batch_id": str}
        """
        if not batch_id:
            batch_id = datetime.now().strftime("batch_%Y%m%d_%H%M%S")

        # 补上生成时间
        analysis_result["meta"]["generated_at"] = datetime.now().isoformat()

        # 导出 JSON
        json_path = self.output_dir / f"{batch_id}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2, default=str)

        # 导出 HTML
        html_path = self.output_dir / f"{batch_id}.html"
        html = self._build_html(analysis_result, batch_id)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)

        return {
            "json_path": str(json_path),
            "html_path": str(html_path),
            "batch_id": batch_id,
        }

    def scan_existing(self) -> list[dict]:
        """扫描已有分析结果，用于启动时恢复历史记录。"""
        results = []
        for f in sorted(self.output_dir.glob("*.json"), reverse=True):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                batch_id = f.stem
                results.append({
                    "batch_id": batch_id,
                    "generated_at": data.get("meta", {}).get("generated_at", ""),
                    "node_count": data.get("input_summary", {}).get("node_count", 0),
                    "file_count": data.get("input_summary", {}).get("file_count", 0),
                })
            except Exception:
                continue
        return results

    def delete_result(self, batch_id: str):
        """删除某批次的分析结果。"""
        for ext in (".json", ".html"):
            path = self.output_dir / f"{batch_id}{ext}"
            if path.exists():
                path.unlink()

    # ── HTML 报告生成 ──────────────────────────────────────

    def _build_html(self, result: dict, batch_id: str) -> str:
        """生成可独立查看的 HTML 报告（v1.3：含推理链条和领域洞察）。"""
        meta = result.get("meta", {})
        summary = result.get("input_summary", {})
        text = result.get("text_summary", {})
        visuals = result.get("visuals", {})

        # 高风险节点表格行（含动作类型）
        risk_rows = ""
        for node in visuals.get("high_risk_nodes", {}).get("rows", [])[:20]:
            level_label = {"high": "高风险", "medium": "中风险", "low": "低风险"}
            level = level_label.get(node.get("risk_level", ""), node.get("risk_level", ""))
            causes = "、".join(node.get("risk_causes", []))
            action_type = node.get("action_type", "")
            risk_rows += f"""
            <tr>
                <td>{node.get('node_id', '')}</td>
                <td>{node.get('risk_score', 0):.3f}</td>
                <td class="risk-{node.get('risk_level', 'low')}">{level}</td>
                <td>{causes}</td>
                <td>{action_type}：{node.get('recommended_action', '')}</td>
            </tr>"""

        # 推理过程（高风险节点的计算步骤）
        reasoning_html = ""
        for node in visuals.get("high_risk_nodes", {}).get("rows", [])[:5]:
            trail = node.get("reasoning_trail", {})
            if not trail:
                continue
            steps = trail.get("steps", [])
            data_sources = trail.get("data_sources", [])
            reasoning_html += f"""
            <details style="margin: 8px 0;">
                <summary><strong>{node.get('node_id', '')}</strong> — 风险评分 {node.get('risk_score', 0):.3f}（{node.get('action_type', '')}）</summary>
                <div style="padding: 8px 16px; font-size: 0.9em; line-height: 1.8;">
                <p>数据来源：{', '.join(data_sources) if data_sources else '无'}</p>"""

            for step in steps:
                reasoning_html += f"""
                <p><strong>步骤 {step['step']}：{step['name']}</strong><br>
                {step['description']}</p>"""

            # 原因详情（阈值对比）
            causes_detail = node.get("risk_causes_detail", [])
            if causes_detail:
                reasoning_html += "<p><strong>触发原因详情：</strong><ul>"
                for d in causes_detail:
                    reasoning_html += (
                        f"<li>{d.get('label', '')}："
                        f"实际值 {d.get('actual_value', '')}，"
                        f"阈值 {d.get('threshold', '')}"
                        f"{'，超出 ' + str(d.get('excess_ratio', '')) + '%' if d.get('excess_ratio') else ''}"
                        f"</li>"
                    )
                reasoning_html += "</ul></p>"

            # 动作追溯
            justification = node.get("action_justification", {})
            if justification:
                reasons = justification.get("reasons", [])
                alternatives = justification.get("alternatives", [])
                if reasons:
                    reasoning_html += f"<p><strong>动作依据：</strong>{'；'.join(reasons)}</p>"
                if alternatives:
                    reasoning_html += f"<p><strong>替代方案：</strong>{'；'.join(alternatives)}</p>"

            reasoning_html += "</div></details>"

        # 领域洞察
        domain = visuals.get("domain_insights", {})
        domain_html = ""
        if domain:
            domain_html = f"""
            <div class="section">
                <h2>6. 供应链领域洞察</h2>
                <p>{domain.get('summary', '')}</p>"""
            for n in domain.get("bullwhip_nodes", []):
                domain_html += f"<p>• 牛鞭效应：节点 {n.get('node_id', '')} — {n.get('detail', '')}</p>"
            for n in domain.get("vmi_nodes", []):
                domain_html += f"<p>• VMI 模式：节点 {n.get('node_id', '')} — {n.get('detail', '')}</p>"
            for n in domain.get("qr_nodes", []):
                domain_html += f"<p>• QR 特征：节点 {n.get('node_id', '')} — {n.get('detail', '')}</p>"
            domain_html += "</div>"

        # 确定性指纹
        fingerprint = meta.get("deterministic_fingerprint", "")

        return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>供应链风险分析报告 — {batch_id}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
       max-width: 960px; margin: 0 auto; padding: 24px; color: #2c3e50; }}
h1 {{ border-bottom: 2px solid #3498db; padding-bottom: 8px; }}
h2 {{ margin-top: 32px; color: #2980b9; }}
.section {{ background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; }}
table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #dee2e6; }}
th {{ background: #e9ecef; }}
.risk-high {{ color: #e74c3c; font-weight: bold; }}
.risk-medium {{ color: #f39c12; font-weight: bold; }}
.risk-low {{ color: #27ae60; }}
.meta {{ color: #7f8c8d; font-size: 0.9em; }}
details {{ background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 8px; }}
summary {{ cursor: pointer; padding: 4px; }}
.reasoning-step {{ margin: 4px 0; padding: 4px 0; border-left: 2px solid #3498db; padding-left: 12px; }}
</style>
</head>
<body>
<h1>供应链风险分析报告</h1>
<p class="meta">
    生成时间：{meta.get('generated_at', '')} | 批次：{batch_id}<br>
    可复现性指纹：{fingerprint}
</p>

<div class="section">
    <h3>数据概况</h3>
    <p>文件数：{summary.get('file_count', 0)} |
       数据行数：{summary.get('row_count', 0)} |
       节点数：{summary.get('node_count', 0)} |
       边数：{summary.get('edge_count', 0)}</p>
</div>

<div class="section">
    <h2>1. 当前判断</h2>
    <p>{text.get('current_judgment', '暂无')}</p>
</div>

<div class="section">
    <h2>2. 主要原因</h2>
    <p>{text.get('main_causes', '暂无')}</p>
</div>

<div class="section">
    <h2>3. 影响对象</h2>
    <p>{text.get('impact_targets', '暂无').replace(chr(10), '<br>')}</p>
</div>

<div class="section">
    <h2>4. 建议动作</h2>
    <p>{text.get('recommended_actions', '暂无').replace(chr(10), '<br>')}</p>
</div>

<div class="section">
    <h2>5. 还需补充</h2>
    <p>{text.get('need_more', '暂无').replace(chr(10), '<br>')}</p>
</div>

{domain_html}

<div class="section">
    <h2>高风险节点明细</h2>
    <table>
        <thead>
            <tr><th>节点ID</th><th>风险评分</th><th>等级</th><th>原因</th><th>建议动作</th></tr>
        </thead>
        <tbody>{risk_rows}</tbody>
    </table>
</div>

<div class="section">
    <h2>推理过程</h2>
    <p style="font-size:0.85rem;color:#7f8c8d;">以下为高风险节点的完整计算过程。每个步骤引用具体数据来源。</p>
    {reasoning_html}
</div>

<p class="meta" style="margin-top: 32px;">
    报告由供应链风险分析系统自动生成 | 版本 v1.3 |
    数据可信度：{visuals.get('data_confidence', {}).get('confidence_level', 'unknown')}<br>
    确定性规则引擎：同一份输入数据在任意机器上产生完全相同的结果。
</p>
</body>
</html>"""
