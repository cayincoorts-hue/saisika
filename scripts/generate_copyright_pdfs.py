#!/usr/bin/env python3
"""生成软著鉴别材料 PDF（文档 + 源代码）。

用法:
    python3 scripts/generate_copyright_pdfs.py

输出:
    - 文档鉴别材料.pdf  → 软件使用说明与设计开发文档
    - 程序鉴别材料.pdf  → 源代码前30页+后30页

格式:
    A4 纵向、页眉 "saiska V1.4"、右上角页码、中文字体嵌入
"""

import os
import sys
from pathlib import Path
from fpdf import FPDF

# ── 配置 ──────────────────────────────────────────────────

SOFTWARE_NAME = "saiska"
VERSION = "V1.4"
APPLICANT = "曾陈奕成"

# 字体配置（符合中国版权保护中心规范）
#   正文：宋体 小四号(12pt)
#   一级标题：黑体 四号(14pt)
#   二级标题：黑体 小四(12pt)
#   页眉：宋体 小五号(9pt)
FONT_BODY_PATH = "/System/Library/Fonts/Supplemental/Songti.ttc"
FONT_BODY_NAME = "Songti"
FONT_HEADING_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_HEADING_NAME = "Heiti"

FONT_BODY_SIZE = 12       # 小四号
FONT_SMALL_SIZE = 10      # 五号（密集内容）
FONT_HEADING1_SIZE = 14   # 四号
FONT_HEADING2_SIZE = 12   # 小四号
FONT_HEADER_SIZE = 9      # 页眉页脚

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "app" / "backend"
SCREENSHOTS_DIR = PROJECT_ROOT / "assets" / "screenshots"
OUTPUT_DIR = PROJECT_ROOT / "docs" / "copyright"

# ── 页面设置常量 ──────────────────────────────────────────

A4_W = 210  # mm
A4_H = 297  # mm
MARGIN_L = 25  # mm（左边距，含装订线）
MARGIN_R = 15  # mm
MARGIN_T = 20  # mm（含页眉）
MARGIN_B = 20  # mm

CONTENT_W = A4_W - MARGIN_L - MARGIN_R  # ~170mm

# ── PDF 基类 ──────────────────────────────────────────────

class BasePDF(FPDF):
    """带页眉页脚的 PDF 基类，使用宋体正文 + 黑体标题。"""

    def __init__(self):
        super().__init__("P", "mm", "A4")
        # 注册三种字体
        self.add_font(FONT_BODY_NAME, "", FONT_BODY_PATH)
        self.add_font(FONT_HEADING_NAME, "", FONT_HEADING_PATH)
        # 设置自动分页
        self.set_auto_page_break(True, MARGIN_B)
        self.set_left_margin(MARGIN_L)
        self.set_right_margin(MARGIN_R)

    def header(self):
        """每页页眉：宋体小五号，软件名称 + 版本号（左），页码（右）。"""
        self.set_font(FONT_BODY_NAME, "", FONT_HEADER_SIZE)
        self.set_text_color(100, 100, 100)
        # 页眉线
        self.set_y(10)
        self.set_draw_color(180, 180, 180)
        self.line(MARGIN_L, 14, A4_W - MARGIN_R, 14)
        # 软件名称 + 版本
        self.set_xy(MARGIN_L, 11)
        self.cell(80, 5, f"{SOFTWARE_NAME} {VERSION}", align="L")
        # 页码
        self.set_xy(MARGIN_L + 80, 11)
        self.cell(CONTENT_W - 80, 5, str(self.page_no()), align="R")

    def footer(self):
        """页脚不额外显示内容（页码已在页眉）。"""
        pass


# ═══════════════════════════════════════════════════════════
# 一、文档鉴别材料
# ═══════════════════════════════════════════════════════════

def generate_doc_pdf():
    pdf = BasePDF()

    # ── 封面 ──
    pdf.add_page()
    _doc_cover(pdf)

    # ── 目录 ──
    pdf.add_page()
    _doc_toc(pdf)

    # ── 第一章 软件概述 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第一章 软件概述")
    _doc_section(pdf, "1.1 产品简介",
        "saiska（赛斯卡）是一款离线供应链风险分析工具。用户导入 Excel/CSV 格式的供应链数据后，"
        "系统自动完成数据解析、字段映射、风险计算、可视化呈现的全流程分析，输出风险趋势图、"
        "风险分布图、传播网络图、高风险节点表、数据可信度面板和供应链领域洞察六类结果。"
        "系统完全在本地运行，数据不出用户电脑，无需任何网络连接。",
        "系统内置确定性规则引擎——同一份输入数据在任何机器上产生完全相同的分析结果，"
        "便于审计追溯和结果复现。同时支持中英双语界面切换，面向全球供应链从业者。"
    )

    _doc_section(pdf, "1.2 目标用户",
        "本软件面向供应链管理者、运营决策者和企业风控人员。用户无需编程背景或算法知识，"
        "只需准备好 Excel/CSV 格式的供应链运营数据，即可通过浏览器界面完成全套风险分析。"
    )

    _doc_section(pdf, "1.3 核心能力",
        "系统提供六类核心分析输出：",
        "（1）风险趋势图：展示风险评分随时间的变化曲线，回答「风险是在加剧还是缓解」；",
        "（2）风险分布图：当前时刻高/中/低风险节点的数量分布，含柱状图和环形图；",
        "（3）风险传播网络图：以三维力导向图展示供应链网络拓扑，节点按风险等级着色；",
        "（4）高风险节点表：中高风险节点明细，含风险评分、风险等级、优先级排序、"
        "6步完整推理链条和结构化处置建议；",
        "（5）数据可信度面板：字段覆盖情况、各图表能否生成的能力状态一览、"
        "缺失数据对照表（「缺什么→怎么影响→补了能解锁什么」）；",
        "（6）供应链领域洞察：自动检测牛鞭效应、VMI信息共享模式、QR快速补货模式。"
    )

    _doc_section(pdf, "1.4 技术特性",
        "（1）完全离线运行：数据不出本地，所有计算在用户电脑上完成，无需云端服务；",
        "（2）确定性规则引擎：基于输入数据的 SHA256 采样哈希生成可复现性指纹，"
        "确保同一份输入数据在任何机器上产生完全相同的结果；",
        "（3）透明推理链条：每个节点的风险评分都附带完整的6步推理过程，"
        "每一步标注数据来源文件和计算公式，支持审计追溯；",
        "（4）中英双语：界面和报告均支持中文和英文切换，由 localStorage 记住用户偏好；",
        "（5）零外部依赖部署：前端 React 构建产物为纯静态文件，FastAPI 直接 serve，"
        "用户无需安装 Node.js。"
    )

    _doc_section(pdf, "1.5 运行环境",
        "操作系统：macOS、Windows、Linux；",
        "Python 版本：3.9 及以上；",
        "内存建议：12—16GB（支持大文件分析）；",
        "Python 依赖：pandas、openpyxl、fastapi、uvicorn、fpdf2 等（详见 requirements.txt）。"
    )

    # ── 第二章 安装与启动 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第二章 安装与启动")

    _doc_section(pdf, "2.1 环境要求",
        "使用本软件前，请确保系统已安装 Python 3.9 或更高版本。可在终端中执行以下命令检查：",
        "  python3 --version",
        "如未安装 Python，请从 https://www.python.org/downloads/ 下载安装。"
    )

    _doc_section(pdf, "2.2 安装依赖",
        "在项目根目录下执行以下命令，安装所需 Python 依赖包：",
        "  pip install -r requirements.txt",
        "主要依赖包括：pandas（Excel/CSV解析）、openpyxl（.xlsx支持）、"
        "fastapi（Web框架）、uvicorn（HTTP服务器）、fpdf2（PDF生成）。"
    )

    _doc_section(pdf, "2.3 一键启动",
        "在项目根目录下执行：",
        "  python run.py",
        "系统将自动启动 FastAPI 后端服务器（默认监听 8000 端口），"
        "并在控制台输出访问地址。打开浏览器访问 http://localhost:8000 即可使用。",
        "无需单独安装或配置 Node.js——前端 React 应用已预构建为静态文件，"
        "由 FastAPI 直接提供。",
        "启动后在浏览器地址栏输入 http://localhost:8000，即可看到数据导入页面。"
    )

    _doc_section(pdf, "2.4 桌面版安装（macOS）",
        "对于 macOS 用户，本软件还提供 .dmg 格式的桌面安装包。",
        "从 GitHub Releases 页面下载 .dmg 文件 → 双击挂载 → "
        "将 saisca.app 拖入 Applications 文件夹 → 右键点击应用图标选择「打开」即可。",
        "桌面版内置了 Python 运行环境，用户无需手动安装任何依赖。"
    )

    _doc_section(pdf, "2.5 健康检查",
        "系统启动后，可通过以下命令确认服务正常运行：",
        "  curl http://localhost:8000/api/health",
        "正常返回示例：",
        '  {"status": "ok", "version": "1.3.0"}',
        "此外，访问 http://localhost:8000/docs 可查看 FastAPI 自动生成的交互式 API 文档。"
    )

    # ── 第三章 功能使用说明 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第三章 功能使用说明")
    _doc_text(pdf, "本章详细介绍 saiska 四个核心操作页面的功能和使用方法，"
        "帮助用户快速上手完成从数据导入到分析结果查看的完整流程。")

    # 3.1 数据导入页
    _doc_section(pdf, "3.1 数据导入页",
        "数据导入页是用户进入系统后的第一个页面。用户在此页面上传需要分析的 "
        "供应链数据文件，系统将自动识别文件格式并存储。"
    )
    _doc_subsection(pdf, "3.1.1 支持的文件格式",
        "系统支持以下三种文件格式：",
        "  • .csv — 逗号分隔的文本文件（推荐使用 UTF-8 编码）",
        "  • .xlsx — Microsoft Excel 2007+ 格式",
        "  • .xls — Microsoft Excel 97-2003 格式",
        "不支持的文件格式（如 .pdf、.docx、图片文件等）将被系统自动拒绝并提示错误。"
    )
    _doc_subsection(pdf, "3.1.2 操作步骤",
        "步骤1：点击页面中央的虚线框区域，或直接将文件拖拽到该区域；",
        "步骤2：在弹出的文件选择对话框中，选择一个或多个待分析的文件；",
        "步骤3：确认文件列表无误后，点击「上传分析」按钮；",
        "步骤4：系统自动上传文件并跳转到文件理解确认页。",
        "系统支持批量上传——一次可选择多个 CSV 或 Excel 文件同时上传。"
    )
    _doc_subsection(pdf, "3.1.3 后端处理流程",
        "文件上传后，后端执行以下操作：",
        "（1）校验文件扩展名，拒绝不支持的格式；",
        "（2）为本次上传创建一个唯一的批次ID（格式：batch_YYYYMMDD_HHMMSS）；",
        "（3）将文件保存到 data/uploads/<批次ID>/ 目录下；",
        "（4）返回批次ID、已保存文件和错误信息给前端。"
    )
    _doc_subsection(pdf, "3.1.4 Demo 数据说明",
        "系统附带一组 Demo 模拟数据，位于 demo_data/demo_scenario/ 目录下，包含：",
        "  • Nodes.csv — 10个节点的基本信息（制造商、分销商、零售商等）",
        "  • Sales Order.csv — 26周的销售订单数据（宽表格式）",
        "  • Production.csv — 26周的生产数据",
        "  • Delivery To Distributor.csv — 26周的配送数据",
        "  • Factory Issue.csv — 26周的工厂出货数据",
        "以上5个文件共同模拟了一条从制造到零售的完整供应链，"
        "用户可以用这些文件体验系统的全部分析功能。"
    )

    _doc_screenshot(pdf, "数据导入页界面", "upload.png")

    # 3.2 文件理解确认页
    _doc_section(pdf, "3.2 文件理解确认页",
        "文件上传成功后，系统进入文件理解确认页。此页面展示系统对每个上传文件的"
        "自动识别结果，包括文件的基本信息和角色判定。"
    )
    _doc_subsection(pdf, "3.2.1 文件角色识别",
        "系统通过 excel_adapter 模块自动分析每个文件的结构，将其归类为以下角色之一：",
        "  • 事实表（fact_table）：包含时序指标数据的宽表，行为时间、列为节点",
        "  • 节点表（node_table）：包含节点属性信息的表",
        "  • 边表（edge_table）：包含节点间关系的数据",
        "  • 元数据表（metadata）：包含额外说明信息的表",
        "  • 错误（error）：无法解析的文件"
    )
    _doc_subsection(pdf, "3.2.2 文件摘要信息",
        "对于每个识别成功的文件，页面展示以下摘要信息：",
        "  • 文件名 — 原始上传文件名",
        "  • 角色类型 — 系统判定的角色",
        "  • 行数 — 数据总行数",
        "  • 列数 — 数据总列数",
        "  • 列名预览 — 前几列的列名，帮助用户确认文件内容正确"
    )
    _doc_subsection(pdf, "3.2.3 操作说明",
        "用户确认文件角色识别无误后，点击「确认并继续」按钮进入下一阶段"
        "——字段映射确认页。如有问题可返回上传页重新提交文件。"
    )

    _doc_screenshot(pdf, "文件理解确认页界面", "confirm.png")

    # 3.3 字段映射确认页
    _doc_section(pdf, "3.3 字段映射确认页",
        "字段映射确认页是本系统最重要的交互环节之一。系统在此阶段尝试将原始数据文件中的"
        "列名自动映射到内部标准字段，并以三态标注每个映射的置信度。用户在此页面上确认、"
        "修正或手动指定字段映射关系。"
    )
    _doc_subsection(pdf, "3.3.1 三态识别机制",
        "系统采用三态标记法标注每个字段映射的置信度：",
        "  • 已识别（identified）：高置信度自动映射，字段名与内部标准高度匹配，无需用户干预",
        "  • 待确认（pending）：中等置信度，字段名存在歧义，需要用户确认或修改",
        "  • 未识别（unrecognized）：无法匹配到任何内部标准字段，需要用户手动指定",
        "",
        "其中，以下情况系统会标记为「待确认」：",
        "  - 列名为「数量」——无法确定是订单量、交付量还是库存量",
        "  - 列名为「日期」——无法确定是下单日、交付日还是到货日",
        "  - 列名为「状态」——无法确定是订单状态、运输状态还是风险状态",
        "  - 列名为「类型」——无法确定是节点类型、物料类型还是业务类型"
    )
    _doc_subsection(pdf, "3.3.2 必填字段",
        "以下字段是进行分析的必要前提，必须在映射确认页全部得到满足：",
        "  （1）节点ID（node_id）— 唯一标识供应链中的每个节点",
        "  （2）节点名称（node_name）— 节点的可读名称",
        "  （3）节点类型（node_type）— 如制造商、分销商、零售商等",
        "  （4）时间（time）— 数据的时间维度，用于时序分析",
        "  （5）至少一个风险指标字段（metric_name）— 用于风险计算的数值指标",
        "缺少任意必填字段时，系统将阻止用户开始分析，并明确提示缺失项。"
    )
    _doc_subsection(pdf, "3.3.3 交互规则",
        "字段映射遵循以下规则：",
        "  • 一个原始列只能映射到一个标准字段",
        "  • 一个标准字段默认只能被一个原始列占用",
        "  • 发生冲突时不自动覆盖，必须提示用户处理",
        "  • 模糊字段默认进入「待确认」状态",
        "  • 未确认的关键字段不能直接开始分析"
    )
    _doc_subsection(pdf, "3.3.4 按钮与功能",
        "页面提供以下操作按钮：",
        "  • [确认并开始分析]：所有必填字段满足后可用，点击启动全流程分析",
        "  • [保存当前映射]：将当前映射关系保存为模板，下次上传同类文件时自动套用",
        "  • [恢复系统建议]：放弃所有手动修改，回退到系统最初的自动映射结果",
        "",
        "用户每修改一次字段映射，页面右侧实时更新以下信息：",
        "  - 当前可以生成哪些图表",
        "  - 当前暂时不能生成哪些图表",
        "  - 缺什么字段",
        "  - 为什么缺"
    )
    _doc_subsection(pdf, "3.3.5 映射模板记忆",
        "系统支持将映射关系保存为模板，存储在本地 data/templates/ 目录。"
        "模板指纹由归一化列名集合、工作表名、文件类型和列数量联合生成。",
        "下次上传结构相似的文件时，系统自动匹配已有模板：",
        "  • 完全命中：文件结构完全匹配，直接套用全部字段映射",
        "  • 部分命中：部分字段结构匹配，只套用高置信字段",
        "  • 低命中：提示存在历史模板但结构差异较大，建议重新确认",
        "模板仅存储在用户本地，不上传任何服务器。"
    )

    _doc_screenshot(pdf, "字段映射确认页界面", "mapping.png")

    # 3.4 分析结果页
    _doc_section(pdf, "3.4 分析结果页",
        "分析结果页是系统的核心输出页面。用户点击「确认并开始分析」后，"
        "系统按固定流水线依次执行8个处理步骤，并通过 SSE（Server-Sent Events）"
        "流式推送进度到前端。所有分析完成后，页面展示六类可视化结果、"
        "五段文字摘要和可导出的完整分析报告。"
    )

    _doc_subsection(pdf, "3.4.1 分析流水线",
        "后端按以下顺序执行全流程分析：",
        "  Step 1 reading：读取所有上传文件",
        "  Step 2 mapping：执行字段映射和三态识别",
        "  Step 3 merging：跨场景数据合并，生成统一长表",
        "  Step 4 graph：构建供应链有向网络图，推断节点层次关系",
        "  Step 5 risk：计算所有节点的风险评分和语义标注",
        "  Step 6 decision：为每个节点生成结构化处置建议",
        "  Step 7 analysis：组装全部六类可视化结果对象",
        "  Step 8 export：导出 JSON 和 HTML 格式的分析报告",
        "每个步骤通过 SSE 事件实时推送进度到前端，用户可看到当前处理阶段和中间统计信息。"
    )

    _doc_subsection(pdf, "3.4.2 五段流式文字结论",
        "分析完成后，系统以流式方式依次推送五段文字结论（每段间隔0.3秒）：",
        "  1. 当前判断：对当前供应链风险状况的总体评估",
        "  2. 主要原因：识别出的主要风险成因（基于 risk_causes 语义标注）",
        "  3. 影响对象：受风险影响的关键节点和链路",
        "  4. 建议动作：针对性的处置建议（由 decision_engine 生成）",
        "  5. 还需补充：当前分析中缺失的数据及补充后能获得的价值",
        "文字结论由 prompt_builder 模块生成，该模块只读取 risk_engine 输出的"
        "语义标签，不重新计算任何数值阈值，确保结论与数据一致。"
    )

    _doc_subsection(pdf, "3.4.3 六类可视化结果",
        "（1）风险趋势图（risk_trend）",
        "  以折线图展示全网平均风险评分和最高风险评分随时间的变化。"
        "当数据中包含有效的时间字段时正常生成；缺少时间字段时状态为 unavailable，"
        "并提示「缺少时间字段，暂时无法可靠生成风险趋势图」。",
        "",
        "（2）风险分布图（risk_distribution）",
        "  以柱状图和环形图展示当前时刻高/中/低风险节点的数量分布（红/橙/绿三色）。"
        "高≥0.6，中≥0.3，低<0.3。",
        "",
        "（3）风险传播网络图（propagation_timeline）",
        "  以三维力导向图展示供应链网络拓扑：节点按风险等级着色，"
        "边表示物料或信息流动方向。缺少节点关系字段时为 limited 状态，"
        "仅展示节点状态而无法显示完整的传播路径。",
        "",
        "（4）高风险节点表（high_risk_nodes）",
        "  列出所有中高风险节点的详细信息：风险评分、风险等级、优先级、"
        "传播系数、风险原因标签（含阈值对比详情）、结构化动作类型、"
        "完整的6步推理链条。优先级按 Risk×Propagation 降序排列，"
        "帮助管理者确定处置顺序。",
        "",
        "（5）数据可信度面板（data_confidence）",
        "  展示四个关键字段（时间、节点标识、节点关系、风险指标）的可用状态；"
        "五个能力（各图表能否生成）的状态矩阵；"
        "以及 supplement_map 对照表（格式：「缺什么 → 怎么影响 → 补了能解锁什么」）。",
        "",
        "（6）供应链领域洞察（domain_insights）",
        "  自动检测三种供应链特有的领域模式：",
        "  • 牛鞭效应：上游 CV / 下游平均 CV > 1.5",
        "  • VMI 信息共享：节点 CV / 同层平均 CV < 0.5",
        "  • QR 快速补货：CV < 0.15 且数据点 > 200",
        "如果未检测到显著模式，系统会明确说明当前数据不足以触发检测阈值。"
    )

    _doc_subsection(pdf, "3.4.4 六步推理链条",
        "每个高风险节点的风险评分附带完整的6步推理过程（reasoning_trail）：",
        "  第1步 指标聚合：从多个文件聚合各指标的时序数据（均值、标准差、变异系数），"
        "标注数据来源文件",
        "  第2步 分量计算：计算 volatility、inventory、delivery_delay、delay_flag 四个风险分量的原始值",
        "  第3步 百分位归一化：将各分量的原始值在所有节点中进行排名，"
        "转换为 0-1 之间的归一化得分",
        "  第4步 风险加权：Risk = volatility×0.30 + inventory×0.25 + delivery_delay×0.25 + delay_flag×0.20",
        "  第5步 传播系数：Propagation = 0.5 + 0.3×度因子 + 0.2×位置因子，"
        "衡量该节点在网络结构中的影响力",
        "  第6步 最终评分：Score = Risk × Propagation（封顶至1.0），"
        "按阈值划分为高/中/低三个等级",
        "前端 ReasoningPanel 组件支持折叠展开，用户可逐步骤查看计算过程和数据来源。"
    )

    _doc_subsection(pdf, "3.4.5 动作建议分类",
        "decision_engine 模块为每个节点生成结构化的处置建议，包含三种信息：",
        "  • action_type：7种结构化动作类型之一",
        "  • recommended_action：面向管理层的处置建议文案",
        "  • action_justification：为何推荐此动作 + 替代方案为何不可用",
        "",
        "七种动作类型的触发条件：",
        "  • 补货 — 库存风险分 > 0.6",
        "  • 转单 — 交期偏差风险 > 0.3 且传播系数 > 0.7",
        "  • 切换供应商 — 历史延迟标记 > 0.5",
        "  • 调整运输路径 — 传播系数 > 0.8",
        "  • 核查波动原因 — 波动性 > 0.5 且风险等级为中",
        "  • 加强监控 — 风险等级为中，但未触发具体动作阈值",
        "  • 维持现状 — 低风险等级"
    )

    _doc_screenshot(pdf, "分析结果页概览", "results-full.png")
    _doc_screenshot(pdf, "分析结果页详情视图", "results.png")

    # ── 第四章 系统架构设计 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第四章 系统架构设计")

    _doc_section(pdf, "4.1 总体架构",
        "saiska 采用三层逻辑架构：",
        "  （1）数据与证据层：负责数据输入、解析和标准化。"
        "包含 excel_adapter、field_mapper、data_merger 三个模块。",
        "  （2）风险状态层：负责图结构构建、风险计算和语义标注。"
        "包含 graph_builder、risk_engine 两个核心模块。",
        "  （3）决策与解释层：负责动作建议生成、可视化组装和文字结论输出。"
        "包含 decision_engine、analysis_engine、prompt_builder、result_exporter 四个模块。",
        "",
        "三层之间通过 dict 结构传递数据，下游模块接收上游模块的完整输出，"
        "内部自行提取所需字段。字段取不到时明确报错，不使用静默默认值。"
    )

    _doc_section(pdf, "4.2 数据流架构",
        "系统的完整数据流共有8步：",
        "  用户上传 Excel/CSV",
        "    → excel_adapter：读取文件，识别角色（事实表/节点表/边表/元数据表）",
        "    → field_mapper：宽表 melt 转长表 → 列名映射 → 三态识别 → 收集 warnings",
        "    → data_merger：跨场景合并 → 生成统一长表 → 标记合并异常",
        "    → graph_builder：构建供应链有向图 → 节点+边 → 推断层次关系",
        "    → risk_engine：计算风险分 → 生成 risk_causes 语义标注 → "
        "6步推理链条 → 领域模式检测",
        "    → decision_engine：动作分类追溯 → 生成 action_type + action_justification",
        "    → analysis_engine：组装六类结果对象（含 domain_insights + "
        "deterministic_fingerprint）",
        "    → prompt_builder：从 risk_causes 生成五段文字结论（只读语义标注，不碰原始数字）",
        "    → result_exporter：导出 JSON + HTML 报告",
        "每一步的 warnings 汇聚传递，不静默丢弃。"
    )

    _doc_section(pdf, "4.3 后端模块详细说明",
        "后端共10个核心服务模块，按数据流顺序排列："
    )

    _doc_subsection(pdf, "4.3.1 excel_adapter（数据输入适配器）",
        "职责：读取 Excel/CSV 文件，输出角色标签和原始数据 dict。",
        "输入：文件路径（.csv/.xlsx/.xls）",
        "输出：{'role': 'fact_table'|'node_table'|'edge_table'|'metadata'|'error', "
        "'data': [...], 'columns': [...], 'file_name': '...'}",
        "关键逻辑：通过分析 Sheet 结构、列名特征和数据模式自动判定文件角色。"
    )
    _doc_subsection(pdf, "4.3.2 field_mapper（字段映射器）",
        "职责：将宽表 melt 为长表，自动识别列名到内部标准字段的映射关系，输出三态标注。",
        "输入：adapter 输出的 dict",
        "输出：标准化映射结果 + warnings 列表",
        "关键逻辑：基于关键词匹配和列名相似度算法实现自动识别，"
        "低置信度字段标记为 pending 而非强行匹配。"
    )
    _doc_subsection(pdf, "4.3.3 data_merger（数据合并器）",
        "职责：将来自不同场景的映射结果合并为一张统一长表。",
        "输入：多个 mapper 输出",
        "输出：{'unified_table': [...], 'nodes': [...], 'edges': [...], 'merge_report': {...}}",
        "关键逻辑：检测同场景重复文件，标记 different_measurement_basis 而非自动合并数值。"
    )
    _doc_subsection(pdf, "4.3.4 graph_builder（图构建器）",
        "职责：基于节点表和边表构建供应链有向网络图，推断节点层次关系。",
        "输入：节点列表 + 边列表",
        "输出：{'nodes': [{'node_id', 'level', 'in_degree', 'out_degree', ...}], "
        "'edges': [...], 'adjacency': {...}, 'graph_meta': {...}}",
        "关键逻辑：通过拓扑排序推断节点的层级位置（上游→下游）。"
    )
    _doc_subsection(pdf, "4.3.5 risk_engine（风险计算引擎）",
        "职责：计算所有节点的风险评分、生成语义标注、构建推理链条、检测领域模式。"
        "这是系统的核心算法模块。",
        "输入：统一长表 + 图结构",
        "输出：{node_id: {risk_score, risk_level, priority, risk_components, risk_causes, "
        "propagation_coefficient, reasoning_trail, risk_causes_detail}}",
        "关键算法：6步推理过程、百分位归一化、加权传播模型、三种领域模式检测。"
        "所有阈值在此模块中唯一定义，下游模块只消费输出标签，不重复计算。"
    )
    _doc_subsection(pdf, "4.3.6 decision_engine（决策引擎）",
        "职责：基于风险评分和网络结构，为每个节点生成结构化动作建议。",
        "输入：risk_engine 输出的 scores + 图结构",
        "输出：为 scores 中每个节点增加 action_type、recommended_action、action_justification 字段",
        "关键逻辑：7种动作类型的分级触发机制，"
        "每种动作附带推荐理由和替代方案不可用原因。"
    )
    _doc_subsection(pdf, "4.3.7 analysis_engine（分析结果组装器）",
        "职责：将上游所有模块的输出组装为六类可视化结果对象 + 确定性指纹。",
        "输入：统一长表 + scores + graph + merge_report",
        "输出：{'meta': {..., 'deterministic_fingerprint': '...'}, "
        "'visuals': {risk_trend, risk_distribution, high_risk_nodes, "
        "propagation_timeline, data_confidence, domain_insights}}",
        "关键逻辑：对每类结果判断 ok/limited/unavailable/error 四种状态，"
        "缺失数据时明确说明原因。"
    )
    _doc_subsection(pdf, "4.3.8 prompt_builder（文字结论生成器）",
        "职责：从 risk_causes 语义标注生成五段自然语言文字结论。",
        "输入：scores + graph + confidence 数据",
        "输出：{'current_judgment': '...', 'main_causes': '...', "
        "'impact_targets': '...', 'recommended_actions': '...', 'need_more': '...'}",
        "关键原则：只读语义标签，不重复计算任何数值阈值。"
    )
    _doc_subsection(pdf, "4.3.9 result_exporter（结果导出器）",
        "职责：将分析结果导出为 JSON 和 HTML 格式的文件。",
        "输入：analysis_engine 输出的完整结果 dict",
        "输出：{'json_path': '...', 'html_path': '...'}",
        "关键逻辑：JSON 用于程序读取和存档，HTML 用于人工查看和打印。"
    )
    _doc_subsection(pdf, "4.3.10 scenario_runner（场景对比运行器）",
        "职责：执行 What-if 场景对比分析。用户修改特定参数后，"
        "系统重新运行分析并与原始结果对比。",
        "输入：batch_id + changes（节点参数变更列表）",
        "输出：包含原始和修改后场景的对比结果",
        "支持的可调参数：supplier_count（供应商数量）、inventory_strategy（库存策略）、"
        "replenishment_frequency（补货频率）、transport_path（运输路径）。"
    )

    _doc_section(pdf, "4.4 前端架构",
        "前端采用 React + TypeScript + Vite 技术栈，构建产物为纯静态文件，"
        "由 FastAPI 直接 serve。页面分为四层结构：",
        "  • pages/：4个页面级组件（UploadPage、ConfirmPage、MappingPage、ResultPage），"
        "对应分析流程的四个步骤",
        "  • components/：按功能分5组的可复用组件（layout、upload、mapping、result、charts）",
        "  • styles/：3个全局样式文件（globals.css、tokens.css、charts.css），"
        "风格变量不散落在组件中",
        "  • utils/：前端通用工具（API调用、动画系统、标签翻译）",
        "",
        "图表引擎使用 ECharts，内嵌在 static/lib/ 目录下，零外部 CDN 依赖。"
        "传播网络图采用三维力导向布局，支持缩放、旋转和节点点击交互。"
    )

    _doc_section(pdf, "4.5 API 路由设计",
        "系统提供以下10个 HTTP API 端点：",
        "  POST /api/upload — 批量上传 CSV/Excel 文件，返回批次 ID",
        "  POST /api/analyze — 开始分析，通过 SSE（Server-Sent Events）流式推送进度和结果",
        "  GET  /api/results/{batch_id} — 获取指定批次的分析结果（JSON）",
        "  GET  /api/results/{batch_id}/download — 下载分析结果文件（JSON 或 HTML）",
        "  GET  /api/history — 获取历史分析记录列表（按时间倒序）",
        "  DELETE /api/history/{batch_id} — 删除某个批次的上传文件和分析结果",
        "  GET  /api/nodes/{node_id} — 获取单个节点的详细信息（含上下游关系）",
        "  POST /api/scenario/compare — 执行 What-if 场景对比分析",
        "  GET  /api/scenario/params/{node_id} — 获取节点的可调参数及当前值",
        "  GET  /api/health — 健康检查，返回服务状态和版本号",
        "此外，FastAPI 自动生成 /docs 交互式 API 文档页面。"
    )

    _doc_section(pdf, "4.6 数据持久化",
        "系统默认将用户数据存储在项目 data/ 目录下，结构如下：",
        "  data/uploads/ — 用户上传的原始文件（按批次ID分子目录存储）",
        "  data/results/ — 分析结果 JSON 和 HTML 文件（按批次ID命名）",
        "  data/templates/ — 历史字段映射模板",
        "系统启动时自动扫描 data/uploads/，发现未处理的批次提示用户继续分析。"
        "用户可在设置中关闭自动存储或切换目录。所有数据仅存储在本地，不上传任何服务器。"
    )

    # ── 第五章 核心算法说明 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第五章 核心算法说明")

    _doc_section(pdf, "5.1 风险计算模型概述",
        "系统采用确定性的加权评分模型计算每个供应链节点的风险值，"
        "不使用机器学习或随机过程，确保结果可复现且可审计。",
        "核心公式：",
        "  Risk = volatility_risk × 0.30 + inventory_risk × 0.25 "
        "+ delivery_delay_risk × 0.25 + delay_flag_risk × 0.20",
        "  Score = Risk × Propagation（封顶至 1.0）",
        "其中四个分量为百分位归一化后的 0-1 得分，Propagation 为网络传播系数。"
    )

    _doc_section(pdf, "5.2 六步推理过程",
        "每个节点的风险评分经过以下六个步骤计算，每步的数据来源和计算过程均可追溯："
    )

    _doc_subsection(pdf, "第1步：指标聚合",
        "按 node_id 分组，对每个指标计算以下统计量：",
        "  • mean：均值（所有时间点的算术平均）",
        "  • std：标准差（衡量数据波动幅度）",
        "  • cv：变异系数（std / mean，消除量纲影响后比较波动程度）",
        "  • total：指标总值",
        "  • count：数据点数量",
        "同时记录每个指标的源文件列表（source_files），用于追溯数据来源。",
        "此外，计算跨场景对比指标：",
        "  • _so_prod_ratio：Production 均值 / Sales Order 均值（产销比）",
        "  • _delivery_per_order：Delivery 总量 / (Sales Order 均值 × 数据点数)（交付/订单比）"
    )

    _doc_subsection(pdf, "第2步：分量计算",
        "基于聚合后的统计数据，计算四个风险分量的原始值：",
        "  • volatility_risk_raw：各指标 CV 的平均值（衡量指标的总体波动性）",
        "  • inventory_risk_raw：第一版暂用波动性作为代理指标（"
        "当系统能接入独立的库存水位数据后，将改用真实库存健康度计算）",
        "  • delivery_delay_risk_raw：基于 _delivery_per_order 与 1.0 的偏差量"
        "（交付量偏离订单量的程度）",
        "  • delay_flag_risk_raw：基于 _so_prod_ratio 与 1.0 的偏差量"
        "（生产量偏离销售量的程度，作为历史延迟标记的代理指标）"
    )

    _doc_subsection(pdf, "第3步：百分位归一化",
        "将每个节点的四个原始分量值在所有节点中进行排名比较，"
        "转换为 0-1 之间的归一化得分。",
        "归一化方法：对于分量 X，节点 i 的归一化得分 = "
        "（比节点 i 的原始值更小的节点数）/ 总节点数。",
        "这样得到一个在 [0, 1] 范围内的相对排名值，"
        "使得不同量纲的分量可以在统一尺度下加权组合。"
    )

    _doc_subsection(pdf, "第4步：风险加权",
        "将四个归一化后的风险分量按固定权重加权求和：",
        "  Risk = volatility × 0.30 + inventory × 0.25 + delivery_delay × 0.25 + delay_flag × 0.20",
        "权重设计依据：波动性是最通用的风险信号（权重最高0.30），"
        "库存健康度和交付偏差是供应链管理的两大核心指标（各0.25），"
        "历史延迟标记提供辅助参考（0.20）。"
    )

    _doc_subsection(pdf, "第5步：传播系数",
        "传播系数衡量一个节点在供应链网络中的结构影响力：",
        "  degree_factor = 节点的度（入度+出度）/ 网络中最大度",
        "  position_factor = 1.0 - |节点层级 - 网络中间层级| / 最大层级",
        "  Propagation = 0.5 + 0.3 × degree_factor + 0.2 × position_factor",
        "基础传播系数为0.5（每个节点至少有一定传播影响力），"
        "度因子贡献权重0.3（连接越多的节点影响越大），"
        "位置因子权重0.2（靠近网络中间位置的节点传播潜力更大）。"
        "传播系数取值范围约在 [0.5, 1.0] 之间。"
    )

    _doc_subsection(pdf, "第6步：最终评分",
        "  Score = Risk × Propagation，封顶至 1.0",
        "风险等级划分：",
        "  • 高风险（high）：Score ≥ 0.6",
        "  • 中风险（medium）：0.3 ≤ Score < 0.6",
        "  • 低风险（low）：Score < 0.3",
        "优先级（Priority）直接取最终评分 Score，"
        "供管理者按优先级降序安排处置顺序。"
    )

    _doc_section(pdf, "5.3 语义标注生成",
        "风险评分计算完成后，risk_engine 基于以下四个阈值（系统内唯一定义）"
        "生成语义化的风险原因标签：",
        "  • 库存水位严重偏低 — inventory_risk > 0.6",
        "  • 存在历史延迟记录 — delay_flag_risk > 0.5",
        "  • 存在较大交期偏差 — delivery_delay_risk > 0.3",
        "  • 指标波动异常偏高 — volatility_risk > 0.5",
        "如果以上阈值均未触发且存在分量 > 0.2，系统标注「多个指标存在轻度风险」；"
        "否则标注「当前风险主要来自供应链网络结构性因素」。",
        "每个标签附带阈值对比详情（risk_causes_detail）："
        "触发指标名、实际值、阈值、超出百分比。"
    )

    _doc_section(pdf, "5.4 动作分类算法",
        "decision_engine 基于风险等级和各分量值，按以下优先级分级触发动作类型：",
        "  （1）若等级为 low → 维持现状",
        "  （2）若 inventory_risk > 0.6 → 补货",
        "  （3）若 delivery_delay_risk > 0.3 且 propagation > 0.7 → 转单",
        "  （4）若 delay_flag_risk > 0.5 → 切换供应商",
        "  （5）若 propagation > 0.8 → 调整运输路径",
        "  （6）若等级为 medium 且 volatility_risk > 0.5 → 核查波动原因",
        "  （7）若等级为 medium（其他情况）→ 加强监控",
        "动作类型按优先级顺序匹配，命中的第一个类型即为输出。"
        "每种动作附带 reasons（推荐原因）和 alternatives（替代方案及不可用原因）。"
    )

    _doc_section(pdf, "5.5 领域模式检测",
        "系统在风险计算完成后，统一检测三种供应链领域的典型模式：",
        "",
        "（1）牛鞭效应（Bullwhip Effect）",
        "  检测方法：计算节点的平均 CV 除以其下游邻居的平均 CV",
        "  触发阈值：上游 CV / 下游平均 CV > 1.5",
        "  依据：Isaksson & Seifert (2016) 实证研究发现牛鞭效应的平均放大约 1.90 倍，"
        "本系统取保守值 1.5 作为检测阈值。",
        "",
        "（2）VMI 信息共享模式",
        "  检测方法：计算节点 CV 除以同层级所有节点的平均 CV",
        "  触发阈值：CV / 同层平均 CV < 0.5",
        "  依据：文献支持 VMI 模式可将需求波动降低 30-50%，"
        "因此波动显著低于同层节点的可能是 VMI 节点。",
        "",
        "（3）QR 快速补货模式",
        "  检测方法：检查变异系数和数据点数量",
        "  触发阈值：CV < 0.15 且数据点总数 > 200",
        "  依据：QR 的特征是高频小幅补货，"
        "低变异系数反映波动小，大数据点量反映频次高。",
        "",
        "检测结果以 domain_insights 输出，"
        "包含每个匹配节点的模式类型、标签说明和触发阈值对比。"
        "未检测到显著模式时，系统明确说明而非静默跳过。"
    )

    _doc_section(pdf, "5.6 确定性指纹",
        "系统为每次分析计算一个确定性指纹（deterministic_fingerprint），"
        "用于验证结果的可复现性。",
        "指纹算法：SHA256 哈希（输入数据行数 + 节点数 + 边数 + 前50行采样数据 "
        "的 date/node_id/metric_name 三元组），取前 16 位十六进制。",
        "此指纹确保：同一份输入数据在任何机器、任何操作系统上产生完全相同的结果。"
        "分析结果的 meta.deterministic_fingerprint 字段记录了此指纹值。"
    )

    # ── 第六章 数据格式说明 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第六章 数据格式说明")

    _doc_section(pdf, "6.1 输入文件格式",
        "系统接受以下三种格式的输入文件：",
        "  • CSV — 逗号分隔值文件，推荐使用 UTF-8 编码以确保中文字段正确解析",
        "  • XLSX — Microsoft Excel 2007 及以上版本的默认格式",
        "  • XLS — Microsoft Excel 97-2003 格式（兼容旧版）",
        "文件可包含多个工作表（对 Excel 文件），系统以第一个有效工作表为准。"
    )

    _doc_section(pdf, "6.2 必填字段说明",
        "为确保分析能够正常执行，数据文件必须包含以下字段（原始列名不限，"
        "但数据内容需对应）：",
        "  （1）节点ID（node_id）— 每个供应链实体的唯一标识符，如编码或编号",
        "  （2）节点名称（node_name）— 节点的可读名称，用于图表和报告展示",
        "  （3）节点类型（node_type）— 如 Manufacturer、Distributor、Retailer、Supplier 等",
        "  （4）时间（time）— 数据的日期或时间维度，格式如 YYYY-MM-DD 或 YYYY/MM/DD",
        "  （5）至少一个风险指标字段 — 用于评估风险的数值型指标，"
        "如订单量、交付量、库存量等",
        "以上五项必须全部满足，否则系统将在字段映射确认页阻止用户开始分析。"
    )

    _doc_section(pdf, "6.3 建议字段说明",
        "以下字段可显著提升分析的准确性和深度：",
        "  • 上游节点ID（upstream_node_id）— 标识原材料的来源节点",
        "  • 下游节点ID（downstream_node_id）— 标识产品的流向节点",
        "  • 物料/SKU（sku）— 产品物料编码，支持物料级分析",
        "  • 库存（inventory）— 库存水位数据，提升库存风险评估精度",
        "  • 交期偏差（delivery_delay）— 计划交期 vs 实际交期的偏差",
        "  • 订单量（order_qty）— 下游客户下单数量",
        "  • 交付量（delivery_qty）— 实际交付的数量",
        "  • 区域/地点（region）— 地理维度信息",
        "  • 补货模式（replenishment_mode）— VMI/QR/传统补货的标注",
        "缺少建议字段不会阻止分析，但会在数据可信度面板中标注影响。"
    )

    _doc_section(pdf, "6.4 标准字段映射表",
        "系统内部定义了以下标准字段，field_mapper 自动将原始列名匹配到这些字段：",
        "  time, node_id, node_name, node_type,",
        "  upstream_node_id, downstream_node_id,",
        "  sku, inventory, lead_time, delivery_delay,",
        "  order_qty, delivery_qty, risk_flag, region",
        "自动识别基于关键词匹配和列名相似度算法。高置信度（如原始列名恰好为 "
        "'node_id'）直接标记为 identified；歧义较大（如原始列名为 '数量'）"
        "标记为 pending 等待用户确认。"
    )

    _doc_section(pdf, "6.5 Demo 数据说明",
        "系统附带的 Demo 数据位于 demo_data/demo_scenario/ 目录，"
        "包含 5 个 CSV 文件，模拟了一条包含 10 个节点的供应链在 26 周内的运营数据：",
        "  Nodes.csv — 10个节点的基本属性（ID、名称、类型、层级）",
        "  Sales Order.csv — 宽表格式，行为周次、列为节点的销售订单量",
        "  Production.csv — 宽表格式，行为周次、列为节点的生产量",
        "  Delivery To Distributor.csv — 宽表格式，行为周次、列为节点的配送量",
        "  Factory Issue.csv — 宽表格式，行为周次、列为节点的工厂出货量",
        "宽表格式是 saiska 支持的核心数据格式——每行是一个时间点，"
        "每列是一个节点的指标值。系统通过 field_mapper 自动将其转为长表进行分析。"
    )

    _doc_section(pdf, "6.6 输出 JSON 结构",
        "完整分析结果存储为 JSON 文件，顶层结构如下：",
        '{',
        '  "meta": {             // 元数据：版本号、生成时间、确定性指纹',
        '    "version": "v1.3",',
        '    "deterministic_fingerprint": "a1b2c3d4e5f6g7h8"',
        '  },',
        '  "input_summary": {    // 输入摘要：文件数、行数、节点数、边数',
        '  },',
        '  "text_summary": {     // 五段文字结论',
        '    "current_judgment", "main_causes", "impact_targets",',
        '    "recommended_actions", "need_more"',
        '  },',
        '  "visuals": {          // 六类可视化结果',
        '    "risk_trend", "risk_distribution", "high_risk_nodes",',
        '    "propagation_timeline", "data_confidence", "domain_insights"',
        '  }',
        '}',
        '每类结果的状态字段（status）取值为 ok/limited/unavailable/error 之一，'
        '分别表示正常、受限、不可用和错误状态。'
    )

    # ── 第七章 输出结果说明 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第七章 输出结果说明")

    _doc_section(pdf, "7.1 六类可视化结果详述",
        "（1）风险趋势图（risk_trend）",
        "  数据字段：x（日期数组）、series（平均风险+最高风险两条折线）",
        "  状态条件：has_time=True → ok；否则 → unavailable",
        "",
        "（2）风险分布图（risk_distribution）",
        "  数据字段：bar（柱状图数据）、donut（环形图数据，含百分比）",
        "  状态条件：has_scores=True → ok；否则 → unavailable",
        "",
        "（3）风险传播网络图（propagation_timeline）",
        "  数据字段：nodes（节点列表含位置、颜色、风险等级）、edges（边列表含上下文信息）",
        "  状态条件：has_graph且has_edges → ok；has_graph但无edges → limited；无graph → unavailable",
        "",
        "（4）高风险节点表（high_risk_nodes）",
        "  数据字段：rows（中高风险节点数组），每行含 risk_score、risk_level、priority、"
        "risk_causes、risk_causes_detail、action_type、action_justification、reasoning_trail",
        "  状态条件：has_scores且有中高风险节点 → ok；无中高风险节点 → limited；无scores → unavailable",
        "",
        "（5）数据可信度面板（data_confidence）",
        "  数据字段：field_coverage（字段覆盖）、capability_status（能力状态矩阵）、"
        "supplement_map（缺失→影响→解锁对照表）、confidence_level（综合可信度等级）",
        "  状态条件：始终可用（不受数据限制）",
        "",
        "（6）供应链领域洞察（domain_insights）",
        "  数据字段：bullwhip_nodes、vmi_nodes、qr_nodes（各模式的匹配节点列表）",
        "  状态条件：检测到至少一种模式 → ok；否则 → limited"
    )

    _doc_section(pdf, "7.2 风险等级颜色编码",
        "系统使用以下颜色方案统一标注风险等级：",
        "  • 高风险（high）— 红色 #e74c3c",
        "  • 中风险（medium）— 橙色 #f39c12",
        "  • 低风险（low）— 绿色 #27ae60",
        "所有图表和表格中的风险颜色保持一致，便于用户快速识别。"
    )

    _doc_section(pdf, "7.3 动作建议类型",
        "系统输出七种结构化动作类型，每种对应明确的触发条件和处置建议：",
        "  • 补货 — 启动补货计划，根据库存消耗速率确定补货批量和优先级",
        "  • 转单 — 评估替代供应商交期能力，将部分订单重分配至可用供应源",
        "  • 切换供应商 — 评估备选供应商质量与交期记录，启动供应商切换评估流程",
        "  • 调整运输路径 — 核查该节点在网络中的关键程度，评估替代运输路径的可行性",
        "  • 核查波动原因 — 核查指标波动原因，确认是否为季节性因素或偶发事件",
        "  • 加强监控 — 提高监控频率，持续关注指标变化趋势",
        "  • 维持现状 — 维持正常监控节奏，定期复查"
    )

    _doc_section(pdf, "7.4 结果导出",
        "分析完成后，用户可通过以下方式导出结果：",
        "  • JSON 下载：GET /api/results/{batch_id}/download?format=json，"
        "获取完整的结构化分析数据",
        "  • HTML 下载：GET /api/results/{batch_id}/download?format=html，"
        "获取可打印的 HTML 报告",
        "结果文件保存在 data/results/ 目录下，按批次ID命名（如 batch_20260628_223000.json）。"
    )

    _doc_section(pdf, "7.5 历史记录管理",
        "系统提供完整的历史记录管理功能：",
        "  • 查看历史：GET /api/history 返回所有历史分析批次，按时间倒序排列",
        "  • 删除记录：DELETE /api/history/{batch_id} 删除指定批次的"
        "上传文件和分析结果",
        "  • 场景对比：POST /api/scenario/compare 基于历史批次数据，"
        "修改特定参数后重新分析并对比结果",
        "场景对比支持修改 supplier_count、inventory_strategy、"
        "replenishment_frequency、transport_path 四个参数。"
    )

    # ── 第八章 附录 ──
    pdf.add_page()
    _doc_chapter_title(pdf, "第八章 附录")

    _doc_section(pdf, "8.1 常见问题",
        "Q1：启动报错 'No module named xxx'？",
        "  A：请确认已执行 pip install -r requirements.txt，确保所有依赖已安装。",
        "",
        "Q2：上传文件后显示'不支持的文件格式'？",
        "  A：系统仅支持 .csv、.xlsx、.xls 三种格式。请检查文件扩展名是否正确。",
        "",
        "Q3：字段映射页提示缺少必填字段？",
        "  A：检查数据文件是否包含节点ID、节点名称、节点类型、时间和至少一个数值指标。"
        "可参考 Demo 数据的列结构。",
        "",
        "Q4：分析完成后某些图表显示为灰色无法查看？",
        "  A：图表状态为 unavailable 意味着对应数据缺失。查看图表内的提示信息，"
        "了解缺少什么字段以及补充后能获得什么结果。",
        "",
        "Q5：浏览器打开后页面空白或报错？",
        "  A：确认前端已构建。执行 cd app/frontend && npm run build，"
        "或重新运行 python run.py 启动服务。",
        "",
        "Q6：能否修改分析结果的保存位置？",
        "  A：默认保存在 data/ 目录下。可在设置中修改，但因为隐私设计，"
        "系统不会自动将数据上传到任何远程服务器。"
    )

    _doc_section(pdf, "8.2 错误状态说明",
        "系统使用四种状态标记分析和输出能力：",
        "  • ok — 数据完备，功能正常。图表正常渲染。",
        "  • limited — 数据不完整但可生成受限版本。图表正常渲染但附受限说明。",
        "  • unavailable — 关键数据缺失，无法生成该图表。不渲染空图，显示具体原因。",
        "  • error — 阻断性错误，影响流程继续。红色报错并阻止后续操作。",
        "",
        "阻断性错误（error）的触发条件包括：文件无法读取、工作表为空、"
        "必填字段缺失、字段映射冲突未解决、模型或后端分析失败。"
        "非阻断性提示（limited）使用柔和橙色标注，放在对应卡片内，"
        "直接说明受限原因。"
    )

    _doc_section(pdf, "8.3 场景对比功能（What-if 分析）",
        "场景对比功能允许用户在已有分析结果的基础上，修改特定参数后查看变化：",
        "支持的可调参数：",
        "  • supplier_count — 供应商数量（影响供应链的冗余度）",
        "  • inventory_strategy — 库存策略",
        "  • replenishment_frequency — 补货频率",
        "  • transport_path — 运输路径",
        "",
        "对比结果展示每个变更的 delta（变化量），"
        "帮助管理者评估不同决策方案的风险影响。前端以并排对比视图呈现。"
    )

    _doc_section(pdf, "8.4 技术栈清单",
        "后端技术：",
        "  • Python 3.9+ — 主编程语言",
        "  • FastAPI — Web 框架",
        "  • Uvicorn — ASGI HTTP 服务器",
        "  • pandas — 数据处理和分析",
        "  • openpyxl — Excel 文件读写",
        "  • fpdf2 — PDF 生成",
        "前端技术：",
        "  • React 18 — UI 框架",
        "  • TypeScript — 类型安全",
        "  • Vite — 构建工具",
        "  • ECharts — 图表可视化引擎",
        "  • GSAP — 动画效果",
        "  • react-i18next — 国际化（中英双语）",
        "打包分发：",
        "  • PyInstaller — Python 后端打包",
        "  • Electron + electron-builder — 桌面应用打包",
        "  • GitHub Actions — 跨平台 CI 自动构建",
        "全部依赖在 requirements.txt 和 package.json 中完整声明。"
    )

    _doc_section(pdf, "8.5 许可证信息",
        "本软件采用 MIT 许可证开源发布。完整许可证文本见项目根目录 LICENSE 文件。",
        "本软件不含任何外部 CDN 依赖，不使用 Google Fonts 或第三方图标库。"
        "所有字体使用操作系统内置字体（SF Pro / Segoe UI / PingFang SC），"
        "所有图标以 SVG 内嵌方式实现。"
    )

    # ── 保存 ──
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "文档鉴别材料.pdf"
    pdf.output(str(output_path))
    print(f"✅ 文档鉴别材料已生成: {output_path}")
    print(f"   总页数: {pdf.page_no()}")
    return output_path


# ═══════════════════════════════════════════════════════════
# 二、程序鉴别材料
# ═══════════════════════════════════════════════════════════

# 源文件列表（按数据流顺序）
SOURCE_FILES = [
    ("run.py", PROJECT_ROOT / "run.py"),
    ("main.py", BACKEND_DIR / "main.py"),
    ("adapters/excel_adapter.py", BACKEND_DIR / "adapters" / "excel_adapter.py"),
    ("services/field_mapper.py", BACKEND_DIR / "services" / "field_mapper.py"),
    ("services/data_merger.py", BACKEND_DIR / "services" / "data_merger.py"),
    ("services/graph_builder.py", BACKEND_DIR / "services" / "graph_builder.py"),
    ("services/risk_engine.py", BACKEND_DIR / "services" / "risk_engine.py"),
    ("services/decision_engine.py", BACKEND_DIR / "services" / "decision_engine.py"),
    ("services/analysis_engine.py", BACKEND_DIR / "services" / "analysis_engine.py"),
    ("services/prompt_builder.py", BACKEND_DIR / "services" / "prompt_builder.py"),
    ("services/result_exporter.py", BACKEND_DIR / "services" / "result_exporter.py"),
    ("services/scenario_runner.py", BACKEND_DIR / "services" / "scenario_runner.py"),
    ("utils/bilingual.py", BACKEND_DIR / "utils" / "bilingual.py"),
    ("utils/path_utils.py", BACKEND_DIR / "utils" / "path_utils.py"),
    ("utils/error_utils.py", BACKEND_DIR / "utils" / "error_utils.py"),
    ("schemas/mapping.py", BACKEND_DIR / "schemas" / "mapping.py"),
]


def generate_source_pdf():
    """生成程序鉴别材料 PDF。

    顺序：
    1. 按数据流顺序读取所有源文件
    2. 逐行写入 PDF，确保每页 ≥ 50 行
    3. 前 30 页 + 后 30 页 = 60 页提交（中间切掉）

    实际上先生成完整 PDF，便于检查和存档；
    然后如果需要，再生成 30+30 的提交版本。
    """
    pdf = BasePDF()

    # 小号等宽风格代码排版
    CODE_FONT_SIZE = 7.5
    LINE_HEIGHT = 4.2  # mm

    # 收集所有源码行
    all_lines = []
    file_boundaries = []  # (start_line_idx, file_label)

    for label, path in SOURCE_FILES:
        if not path.exists():
            print(f"  ⚠ 文件不存在，跳过: {path}")
            continue

        start_idx = len(all_lines)
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        # 添加文件分隔标记
        all_lines.append(f"# {'=' * 60}\n")
        all_lines.append(f"# File: {label}\n")
        all_lines.append(f"# {'=' * 60}\n")
        all_lines.append("\n")

        for line in lines:
            # 移除行尾换行符，保留原样
            all_lines.append(line)

        all_lines.append("\n")
        file_boundaries.append((start_idx, label))

    # 计算每页能放多少行
    usable_h = A4_H - MARGIN_T - MARGIN_B  # ≈ 257mm
    lines_per_page = int(usable_h / LINE_HEIGHT)
    print(f"  代码排版: {CODE_FONT_SIZE}pt, 行高 {LINE_HEIGHT}mm, 每页约 {lines_per_page} 行")

    # 逐页生成
    total_lines = len(all_lines)
    page_start_line = 0
    pages_info = []  # [(page_num, start_line, end_line)]

    pdf.add_page()

    current_line_on_page = 0
    for i, line in enumerate(all_lines):
        if current_line_on_page == 0:
            # 在新页的第一行，设置位置
            pdf.set_xy(MARGIN_L, MARGIN_T)

        # 截断过长的行（避免超出右边距）
        # 估算：7.5pt 下 ~170mm 约可容纳 120 个 ASCII 字符
        max_chars = 130
        if len(line.rstrip('\n\r')) > max_chars:
            display_line = line[:max_chars - 3] + "...\n"
        else:
            display_line = line

        pdf.set_font(FONT_BODY_NAME, "", CODE_FONT_SIZE)
        pdf.cell(0, LINE_HEIGHT, display_line.rstrip('\n\r'), ln=1)

        current_line_on_page += 1

        if current_line_on_page >= lines_per_page:
            # 满一页，检查是否还有更多行
            if i + 1 < total_lines:
                pages_info.append((pdf.page_no(), page_start_line, i))
                pdf.add_page()
                page_start_line = i + 1
                current_line_on_page = 0

    # 最后一页
    if current_line_on_page > 0:
        pages_info.append((pdf.page_no(), page_start_line, total_lines - 1))

    total_pages = pdf.page_no()
    print(f"  源码总行数: {total_lines}")
    print(f"  生成总页数: {total_pages}")

    # 保存完整版（存档用）
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    full_path = OUTPUT_DIR / "程序鉴别材料_完整版.pdf"
    pdf.output(str(full_path))
    print(f"  完整版已保存: {full_path}")

    # 生成提交版：前 30 页 + 后 30 页
    _generate_source_submit_version(pdf, all_lines, lines_per_page, total_pages)

    return full_path


def _generate_source_submit_version(full_pdf, all_lines, lines_per_page, total_pages):
    """生成提交版 PDF：前30页 + 后30页 = 60页。"""
    submit_pdf = BasePDF()

    # 计算前30页的结束行和后30页的起始行
    front_end_line = min(30 * lines_per_page, len(all_lines))

    if total_pages <= 60:
        # 不足60页，全部提交
        print("  总页数 ≤ 60，全部提交")
        submit_path = OUTPUT_DIR / "程序鉴别材料.pdf"
        full_pdf.output(str(submit_path))
        print(f"✅ 程序鉴别材料已生成: {submit_path}")
        print(f"   总页数: {total_pages}")
        return

    # 前30页
    submit_pdf.add_page()
    line_count = 0
    for i in range(front_end_line):
        if line_count == 0:
            submit_pdf.set_xy(MARGIN_L, MARGIN_T)

        line = all_lines[i]
        max_chars = 130
        if len(line.rstrip('\n\r')) > max_chars:
            line = line[:max_chars - 3] + "...\n"

        submit_pdf.set_font(FONT_BODY_NAME, "", 7.5)
        submit_pdf.cell(0, 4.2, line.rstrip('\n\r'), ln=1)
        line_count += 1

        if line_count >= lines_per_page:
            if i + 1 < front_end_line:
                submit_pdf.add_page()
                line_count = 0

    # 后30页起始行
    back_start_line = max(0, len(all_lines) - 30 * lines_per_page)

    # 添加分隔页
    submit_pdf.add_page()
    line_count = 0

    for i in range(back_start_line, len(all_lines)):
        if line_count == 0:
            submit_pdf.set_xy(MARGIN_L, MARGIN_T)

        line = all_lines[i]
        max_chars = 130
        if len(line.rstrip('\n\r')) > max_chars:
            line = line[:max_chars - 3] + "...\n"

        submit_pdf.set_font(FONT_BODY_NAME, "", 7.5)
        submit_pdf.cell(0, 4.2, line.rstrip('\n\r'), ln=1)
        line_count += 1

        if line_count >= lines_per_page:
            if i + 1 < len(all_lines):
                submit_pdf.add_page()
                line_count = 0

    submit_path = OUTPUT_DIR / "程序鉴别材料.pdf"
    submit_pdf.output(str(submit_path))
    print(f"✅ 程序鉴别材料（提交版）已生成: {submit_path}")
    print(f"   前30页 + 后30页，共 {submit_pdf.page_no()} 页")


# ═══════════════════════════════════════════════════════════
# 文档生成辅助函数
# ═══════════════════════════════════════════════════════════

def _doc_cover(pdf):
    """生成封面页。"""
    pdf.set_font(FONT_HEADING_NAME, "", 26)
    pdf.ln(60)
    pdf.cell(0, 15, SOFTWARE_NAME, align="C", ln=True)
    pdf.set_font(FONT_BODY_NAME, "", 14)
    pdf.cell(0, 12, "（赛斯卡）", align="C", ln=True)
    pdf.ln(10)
    pdf.set_font(FONT_HEADING_NAME, "", 20)
    pdf.cell(0, 12, f"版本 {VERSION}", align="C", ln=True)
    pdf.ln(20)
    pdf.set_font(FONT_BODY_NAME, "", 14)
    pdf.cell(0, 10, "软件使用说明与设计开发文档", align="C", ln=True)
    pdf.ln(30)
    pdf.set_font(FONT_BODY_NAME, "", 12)
    pdf.cell(0, 10, f"申请人：{APPLICANT}", align="C", ln=True)
    pdf.cell(0, 10, "登记类型：计算机软件著作权登记", align="C", ln=True)
    pdf.cell(0, 10, "日期：2026年6月", align="C", ln=True)


def _doc_toc(pdf):
    """生成目录页。"""
    pdf.set_font(FONT_HEADING_NAME, "", FONT_HEADING1_SIZE)
    pdf.cell(0, 12, "目  录", align="C", ln=True)
    pdf.ln(10)
    pdf.set_font(FONT_BODY_NAME, "", 12)

    toc_items = [
        ("第一章  软件概述", ""),
        ("    1.1 产品简介 / 1.2 目标用户 / 1.3 核心能力", ""),
        ("    1.4 技术特性 / 1.5 运行环境", ""),
        ("第二章  安装与启动", ""),
        ("    2.1 环境要求 / 2.2 安装依赖 / 2.3 一键启动", ""),
        ("    2.4 桌面版安装 / 2.5 健康检查", ""),
        ("第三章  功能使用说明", ""),
        ("    3.1 数据导入页 / 3.2 文件理解确认页", ""),
        ("    3.3 字段映射确认页 / 3.4 分析结果页", ""),
        ("第四章  系统架构设计", ""),
        ("    4.1 总体架构 / 4.2 数据流架构", ""),
        ("    4.3 后端模块说明 / 4.4 前端架构", ""),
        ("    4.5 API 路由设计 / 4.6 数据持久化", ""),
        ("第五章  核心算法说明", ""),
        ("    5.1 风险计算模型 / 5.2 六步推理过程", ""),
        ("    5.3 语义标注 / 5.4 动作分类 / 5.5 领域模式", ""),
        ("    5.6 确定性指纹", ""),
        ("第六章  数据格式说明", ""),
        ("    6.1 输入格式 / 6.2 必填字段 / 6.3 建议字段", ""),
        ("    6.4 标准字段映射表 / 6.5 Demo数据 / 6.6 输出结构", ""),
        ("第七章  输出结果说明", ""),
        ("    7.1 六类结果详述 / 7.2 颜色编码 / 7.3 动作类型", ""),
        ("    7.4 结果导出 / 7.5 历史管理", ""),
        ("第八章  附录", ""),
        ("    8.1 常见问题 / 8.2 错误状态 / 8.3 场景对比", ""),
        ("    8.4 技术栈 / 8.5 许可证", ""),
    ]

    for item, _ in toc_items:
        if item.startswith("    "):
            pdf.set_font(FONT_BODY_NAME, "", 9)
            pdf.cell(0, 7, f"      {item.strip()}", ln=True)
        else:
            pdf.set_font(FONT_HEADING_NAME, "", FONT_HEADING2_SIZE)
            pdf.cell(0, 9, item, ln=True)


def _doc_chapter_title(pdf, title):
    """章标题。黑体四号(14pt)。"""
    pdf.set_font(FONT_HEADING_NAME, "", FONT_HEADING1_SIZE)
    pdf.cell(0, 12, title, align="C", ln=True)
    pdf.ln(6)


def _doc_section(pdf, title, *paragraphs):
    """节标题 + 多个段落。标题黑体小四(12pt)。"""
    pdf.set_font(FONT_HEADING_NAME, "", FONT_HEADING2_SIZE)
    pdf.cell(0, 9, title, ln=True)
    pdf.ln(2)
    _doc_text(pdf, *paragraphs)
    pdf.ln(2)


def _doc_subsection(pdf, title, *paragraphs):
    """小节标题。黑体小四(12pt)。"""
    pdf.set_font(FONT_HEADING_NAME, "", FONT_HEADING2_SIZE)
    pdf.cell(0, 8, title, ln=True)
    pdf.ln(1)
    _doc_text(pdf, *paragraphs)
    pdf.ln(2)


def _doc_text(pdf, *paragraphs):
    """正文段落。宋体五号(10pt)。"""
    pdf.set_font(FONT_BODY_NAME, "", FONT_SMALL_SIZE)
    for para in paragraphs:
        if para == "":
            pdf.ln(4)
            continue
        pdf.multi_cell(CONTENT_W, 5.5, para, align="L")
        pdf.ln(1)


def _doc_screenshot(pdf, caption, filename):
    """插入截图。如果文件存在则插入，否则跳过并注明。"""
    img_path = SCREENSHOTS_DIR / filename
    pdf.set_font(FONT_BODY_NAME, "", FONT_SMALL_SIZE)

    if img_path.exists():
        # 计算图片尺寸，适配页面宽度
        pdf.ln(3)
        pdf.cell(0, 6, f"图：{caption}", align="C", ln=True)
        pdf.ln(2)

        # 插入图片，宽度适配内容区域
        try:
            img_w = CONTENT_W - 10
            pdf.image(str(img_path), x=MARGIN_L + 5, w=img_w)
            pdf.ln(3)
        except Exception as e:
            pdf.cell(0, 6, f"（图片插入失败：{e}）", align="C", ln=True)
    else:
        pdf.ln(2)
        pdf.cell(0, 6, f"（{caption}：截图文件未找到 — {filename}）", align="C", ln=True)

    pdf.ln(3)


# ═══════════════════════════════════════════════════════════
# 主入口
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print(f"  软著鉴别材料 PDF 生成器")
    print(f"  软件: {SOFTWARE_NAME} {VERSION}")
    print(f"  字体: {FONT_BODY_NAME} ({FONT_BODY_PATH})")
    print("=" * 60)

    print("\n📄 正在生成 文档鉴别材料...")
    doc_path = generate_doc_pdf()

    print("\n📄 正在生成 程序鉴别材料...")
    src_path = generate_source_pdf()

    print("\n" + "=" * 60)
    print("  生成完成！")
    print(f"  文档鉴别材料: {doc_path}")
    print(f"  程序鉴别材料: {src_path}")
    print("=" * 60)
