"""FastAPI 主应用。

路由：
  POST /api/upload              — 上传 CSV/Excel 文件
  POST /api/analyze             — 开始分析（SSE 流式推送进度）
  GET  /api/results/{batch_id}  — 获取分析结果
  GET  /api/history             — 获取历史分析列表
  DELETE /api/history/{batch_id} — 删除某次分析
  GET  /api/nodes/{node_id}     — 获取节点详情
  GET  /api/license/status      — 检查激活状态
  POST /api/license/activate    — 输入激活码
  GET  /                        — 前端首页（static/）
"""

import asyncio
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from adapters.excel_adapter import ExcelAdapter
from services.field_mapper import FieldMapper
from services.data_merger import DataMerger
from services.graph_builder import GraphBuilder
from services.risk_engine import RiskEngine
from services.decision_engine import DecisionEngine
from services.analysis_engine import AnalysisEngine
from services.prompt_builder import PromptBuilder
from services.result_exporter import ResultExporter
from utils.path_utils import app_path, data_path
from utils.license import LicenseManager

# ── 应用初始化 ──────────────────────────────────────────────

app = FastAPI(title="Saisca — 供应链风险分析系统", version="1.3.0")

# ── 序列号中间件 ──────────────────────────────────────────────

EXEMPT_PREFIXES = ("/api/license", "/api/health", "/docs", "/openapi.json")

@app.middleware("http")
async def license_middleware(request: Request, call_next):
    """拦截未激活的请求。

    API 请求（/api/*）未激活时返回 403。
    页面请求（/ 和静态资源）放行，让前端激活页面正常显示。
    health、docs、license 端点始终放行。
    """
    path = request.url.path

    # 安全端点始终放行
    if any(path.startswith(p) for p in EXEMPT_PREFIXES):
        return await call_next(request)

    # API 请求需要检查激活状态
    if path.startswith("/api/"):
        license_mgr = LicenseManager()
        if not license_mgr.is_activated():
            return JSONResponse(
                status_code=403,
                content={
                    "error": "not_activated",
                    "machine_id": license_mgr.get_machine_id(),
                    "message": "产品未激活，请先输入激活码。",
                },
            )

    return await call_next(request)

UPLOAD_DIR = data_path("uploads")
RESULT_DIR = data_path("results")
TEMPLATE_DIR = data_path("templates")

for d in (UPLOAD_DIR, RESULT_DIR, TEMPLATE_DIR):
    d.mkdir(parents=True, exist_ok=True)

# 加载已知节点列表（如果存在）
KNOWN_NODES_PATH = data_path("known_nodes.json")
KNOWN_NODES: list[str] = []
if KNOWN_NODES_PATH.exists():
    with open(KNOWN_NODES_PATH, "r") as f:
        KNOWN_NODES = json.load(f)


def _save_known_nodes(nodes: list[str]):
    with open(KNOWN_NODES_PATH, "w") as f:
        json.dump(nodes, f, ensure_ascii=False)


# ── 路由：上传 ──────────────────────────────────────────────

@app.post("/api/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    """批量上传 CSV/Excel 文件，存入 data/uploads/<batch_id>/"""
    batch_id = datetime.now().strftime("batch_%Y%m%d_%H%M%S")
    batch_dir = UPLOAD_DIR / batch_id
    batch_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    errors = []

    for f in files:
        if not f.filename:
            continue
        ext = Path(f.filename).suffix.lower()
        if ext not in (".csv", ".xlsx", ".xls"):
            errors.append({"file": f.filename, "error": f"不支持的文件格式：{ext}"})
            continue

        content = await f.read()
        file_path = batch_dir / f.filename
        with open(file_path, "wb") as fp:
            fp.write(content)
        saved.append(f.filename)

    if not saved and errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    return {
        "batch_id": batch_id,
        "saved_files": saved,
        "errors": errors,
        "total_files": len(saved),
    }


# ── 路由：分析（SSE 流式推送）───────────────────────────────

@app.post("/api/analyze")
async def analyze(batch_id: str = Query(...)):
    """对指定批次执行全流程分析，通过 SSE 流式推送进度。

    进度阶段：
      reading → mapping → merging → graph → risk → analysis → done
    """
    batch_dir = UPLOAD_DIR / batch_id
    if not batch_dir.exists():
        raise HTTPException(status_code=404, detail=f"批次 {batch_id} 不存在")

    async def event_stream():
        yield _sse("progress", {"stage": "start", "message": "开始分析..."})
        await asyncio.sleep(0.1)

        try:
            # 收集文件
            csv_files = sorted(batch_dir.glob("*.csv")) + sorted(batch_dir.glob("*.xlsx")) + sorted(batch_dir.glob("*.xls"))
            if not csv_files:
                yield _sse("error", {"message": "该批次中没有可分析的文件。"})
                return

            yield _sse("progress", {"stage": "reading", "message": f"读取 {len(csv_files)} 个文件..."})
            await asyncio.sleep(0.1)

            # Step 1-2: adapter → mapper
            adapter = ExcelAdapter()
            global KNOWN_NODES
            mapper = FieldMapper(known_nodes=KNOWN_NODES)
            map_results = []

            for f in csv_files:
                adapter_out = adapter.read(str(f))
                if adapter_out["role"] == "error":
                    continue
                map_result = mapper.process(adapter_out)
                map_results.append(map_result)

            # 更新已知节点列表
            if not KNOWN_NODES:
                all_node_ids = set()
                for mr in map_results:
                    if mr.role == "fact_table":
                        for m in mr.mappings:
                            if m.node_id:
                                all_node_ids.add(m.node_id)
                if all_node_ids:
                    KNOWN_NODES = sorted(all_node_ids)
                    _save_known_nodes(KNOWN_NODES)

            yield _sse("progress", {"stage": "mapping", "message": f"字段映射完成，{len(map_results)} 个文件已识别",
                                     "details": {"files_mapped": len(map_results)}})
            await asyncio.sleep(0.2)

            # Step 3: merge
            yield _sse("progress", {"stage": "merging", "message": "正在合并跨场景数据..."})
            await asyncio.sleep(0.1)
            merger = DataMerger()
            unified = merger.merge(map_results)

            yield _sse("progress", {"stage": "merging", "message": f"合并完成：{unified['merge_report']['total_rows_unified']} 行统一数据",
                                     "details": unified["merge_report"]})
            await asyncio.sleep(0.2)

            # Step 4: graph
            yield _sse("progress", {"stage": "graph", "message": "正在构建供应链网络图..."})
            await asyncio.sleep(0.1)
            gb = GraphBuilder()
            graph = gb.build(nodes=unified["nodes"], edges=unified["edges"])

            yield _sse("progress", {"stage": "graph", "message": f"网络图构建完成：{graph['graph_meta']['node_count']} 节点，{graph['graph_meta']['edge_count']} 边",
                                     "details": graph["graph_meta"]})
            await asyncio.sleep(0.2)

            # Step 5: risk
            yield _sse("progress", {"stage": "risk", "message": "正在计算风险评分..."})
            await asyncio.sleep(0.1)
            engine = RiskEngine()
            scores = engine.calculate(unified_table=unified["unified_table"], graph=graph)

            high = sum(1 for s in scores.values() if s["risk_level"] == "high")
            med = sum(1 for s in scores.values() if s["risk_level"] == "medium")
            low = sum(1 for s in scores.values() if s["risk_level"] == "low")
            yield _sse("progress", {"stage": "risk", "message": f"风险计算完成：高{high} 中{med} 低{low}",
                                     "details": {"high": high, "medium": med, "low": low}})
            await asyncio.sleep(0.2)

            # Step 5b: decision — 动作建议
            yield _sse("progress", {"stage": "decision", "message": "正在生成处置建议..."})
            await asyncio.sleep(0.1)
            dec_engine = DecisionEngine()
            scores = dec_engine.decide(scores=scores, graph=graph)

            # Step 6-7: analysis + text
            yield _sse("progress", {"stage": "analysis", "message": "正在生成分析结果和文字结论..."})
            await asyncio.sleep(0.3)
            ae = AnalysisEngine()
            analysis = ae.assemble(
                unified_table=unified["unified_table"],
                scores=scores,
                graph=graph,
                merge_report=unified["merge_report"],
            )
            pb = PromptBuilder()
            text = pb.build(
                scores=scores,
                graph=graph,
                confidence=analysis["visuals"]["data_confidence"],
            )
            analysis["text_summary"] = text

            # Step 8: export
            exporter = ResultExporter(output_dir=str(RESULT_DIR))
            exported = exporter.export(analysis, batch_id=batch_id)

            yield _sse("progress", {"stage": "done", "message": "分析完成！",
                                     "details": {"batch_id": batch_id, "json_path": exported["json_path"]}})
            await asyncio.sleep(0.1)

            # 推送五段文字（按段流式）
            yield _sse("text", {"section": "current_judgment", "content": text.get("current_judgment", "")})
            await asyncio.sleep(0.3)
            yield _sse("text", {"section": "main_causes", "content": text.get("main_causes", "")})
            await asyncio.sleep(0.3)
            yield _sse("text", {"section": "impact_targets", "content": text.get("impact_targets", "")})
            await asyncio.sleep(0.3)
            yield _sse("text", {"section": "recommended_actions", "content": text.get("recommended_actions", "")})
            await asyncio.sleep(0.3)
            yield _sse("text", {"section": "need_more", "content": text.get("need_more", "")})

            yield _sse("complete", {"batch_id": batch_id})

        except Exception as e:
            yield _sse("error", {"message": f"分析过程出错：{str(e)}"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── 路由：结果查询 ──────────────────────────────────────────

@app.get("/api/results/{batch_id}")
async def get_results(batch_id: str):
    """获取指定批次的分析结果。"""
    result_path = RESULT_DIR / f"{batch_id}.json"
    if not result_path.exists():
        raise HTTPException(status_code=404, detail=f"批次 {batch_id} 的分析结果不存在")

    with open(result_path, "r") as f:
        return json.load(f)


@app.get("/api/results/{batch_id}/download")
async def download_result(batch_id: str, format: str = "json"):
    """下载分析结果文件。"""
    ext = "html" if format == "html" else "json"
    result_path = RESULT_DIR / f"{batch_id}.{ext}"
    if not result_path.exists():
        raise HTTPException(status_code=404, detail=f"文件不存在")

    media_type = "text/html" if format == "html" else "application/json"
    with open(result_path, "r") as f:
        content = f.read()
    return HTMLResponse(content=content, media_type=media_type)


# ── 路由：历史记录 ──────────────────────────────────────────

@app.get("/api/history")
async def get_history():
    """获取所有历史分析记录（按时间倒序）。"""
    exporter = ResultExporter(output_dir=str(RESULT_DIR))
    records = exporter.scan_existing()

    # 补充上传批次信息
    for r in records:
        batch_dir = UPLOAD_DIR / r["batch_id"]
        if batch_dir.exists():
            files = [f.name for f in batch_dir.iterdir() if f.is_file()]
            r["files"] = files

    return records


@app.delete("/api/history/{batch_id}")
async def delete_history(batch_id: str):
    """删除指定批次的上传文件和分析结果。"""
    exporter = ResultExporter(output_dir=str(RESULT_DIR))
    exporter.delete_result(batch_id)

    batch_dir = UPLOAD_DIR / batch_id
    if batch_dir.exists():
        shutil.rmtree(batch_dir)

    return {"status": "deleted", "batch_id": batch_id}


# ── 路由：节点详情 ──────────────────────────────────────────

@app.get("/api/nodes/{node_id}")
async def get_node_detail(node_id: str, batch_id: Optional[str] = None):
    """获取单个节点的详细信息。

    如果没有指定 batch_id，取最新的分析结果。
    """
    if not batch_id:
        exporter = ResultExporter(output_dir=str(RESULT_DIR))
        records = exporter.scan_existing()
        if not records:
            raise HTTPException(status_code=404, detail="没有可用的分析结果")
        batch_id = records[0]["batch_id"]

    result_path = RESULT_DIR / f"{batch_id}.json"
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="分析结果不存在")

    with open(result_path, "r") as f:
        data = json.load(f)

    # 从 visuals 中提取该节点的信息
    node_info = {"node_id": node_id}

    # 从高风险节点表中查找
    high_risk = data.get("visuals", {}).get("high_risk_nodes", {}).get("rows", [])
    for row in high_risk:
        if row.get("node_id") == node_id:
            node_info["risk_info"] = row
            break

    # 从传播图中查找
    prop_nodes = data.get("visuals", {}).get("propagation_timeline", {}).get("nodes", [])
    for n in prop_nodes:
        if n.get("id") == node_id:
            node_info["graph_info"] = n
            break

    # 查找关联的上下游节点
    edges = data.get("visuals", {}).get("propagation_timeline", {}).get("edges", [])
    upstream = [e for e in edges if e.get("target") == node_id]
    downstream = [e for e in edges if e.get("source") == node_id]
    node_info["upstream"] = upstream
    node_info["downstream"] = downstream

    return node_info


# ── 路由：健康检查 ──────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.3.0"}


# ── 路由：序列号激活 ──────────────────────────────────────────

@app.get("/api/license/status")
async def license_status():
    """获取当前激活状态和机器 ID。"""
    mgr = LicenseManager()
    return mgr.get_status()


@app.post("/api/license/activate")
async def license_activate(payload: dict):
    """输入激活码完成激活。

    Request body: {"key": "SAISKA-XXXX-XXXX-XXXX"}
    """
    key = payload.get("key", "")
    if not key:
        raise HTTPException(status_code=400, detail="请输入激活码。")

    mgr = LicenseManager()
    ok, message = mgr.activate(key)
    if not ok:
        raise HTTPException(status_code=400, detail=message)

    return {"status": "activated", "message": message}


# ── 静态文件服务 ──────────────────────────────────────────

STATIC_DIR = app_path("app", "backend", "static")
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# 确保 static/ 下至少有一个 index.html
index_path = STATIC_DIR / "index.html"
if not index_path.exists():
    index_path.write_text("""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Saisca — 供应链风险分析系统</title>
<style>
body { font-family: -apple-system, sans-serif; display: flex; justify-content: center;
       align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
.card { background: white; border-radius: 12px; padding: 40px; text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 480px; }
h1 { color: #2c3e50; } p { color: #7f8c8d; }
.status { color: #27ae60; font-weight: bold; }
</style>
</head>
<body>
<div class="card">
<h1>Saisca</h1>
<p>后端服务运行中 <span class="status">✓</span></p>
<p>前端页面构建完成后将在此显示完整界面。</p>
<p style="font-size: 0.85rem; color: #95a5a6;">API 文档：<a href="/docs">/docs</a></p>
</div>
</body>
</html>""")

app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")


# ── 静态文件：static/ 根目录下的文件（favicon、icons 等） ────

@app.get("/{full_path:path}")
async def serve_static_or_spa(full_path: str):
    """如果 static/ 下存在对应文件则直接返回，否则走 SPA fallback。"""
    static_file = STATIC_DIR / full_path
    # 安全检查：确保路径不逃逸出 static/ 目录
    try:
        static_file.resolve().relative_to(STATIC_DIR.resolve())
    except ValueError:
        return HTMLResponse(content="<h1>禁止访问</h1>", status_code=403)
    if static_file.is_file():
        return FileResponse(str(static_file))

    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text("utf-8"))
    return HTMLResponse(content="<h1>前端页面未构建</h1>", status_code=404)


# ── 辅助 ──────────────────────────────────────────────────

def _sse(event: str, data: dict) -> str:
    """生成 SSE 格式的消息。"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
