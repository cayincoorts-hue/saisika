#!/usr/bin/env python3
"""生成 saisika 功能演示数据集。

设计目标：用模拟数据覆盖所有分析功能 —
  风险趋势、风险分布、传播时序、高风险节点表、
  领域洞察（牛鞭效应/VMI/QR）、推理链条、动作建议。

供应链结构（10 节点 4 层）：
  Tier 0 供应商：S001 华南原材料 / S002 华东零部件（★风险节点）
  Tier 1 工厂　：P001 深圳制造（★牛鞭效应） / P002 苏州组装
  Tier 2 配送中心：D001 华南DC（★VMI模式） / D002 华东DC / D003 华北DC
  Tier 3 零售商　：R001 广州零售 / R002 上海零售（★QR补货） / R003 北京零售

时间范围：2026-01-05 ~ 2026-06-29（26周，周数据）
"""

import csv
import os
import random
import math

random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "demo_data", "demo_scenario")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── 周日期生成 ──────────────────────────────────────────────────

def week_dates(n=26):
    """生成周一日期列表。"""
    return [f"2026-{(i//4)+1:02d}-{(i%4)*7+5:02d}" for i in range(n)]

DATES = week_dates(26)

# ── 节点定义 ────────────────────────────────────────────────────

NODES = [
    # node_id, node_name, node_type, level, region, risk_profile
    ("S001", "华南原材料供应商", "Supplier", 0, "广东", "stable"),
    ("S002", "华东零部件供应商", "Supplier", 0, "江苏", "high_risk"),  # ★
    ("P001", "深圳制造工厂", "Plant", 1, "广东", "bullwhip"),         # ★
    ("P002", "苏州组装工厂", "Plant", 1, "江苏", "normal"),
    ("D001", "华南区域配送中心", "DC", 2, "广东", "vmi"),              # ★
    ("D002", "华东区域配送中心", "DC", 2, "上海", "normal"),
    ("D003", "华北区域配送中心", "DC", 2, "北京", "moderate"),
    ("R001", "广州零售商A", "Retailer", 3, "广东", "normal"),
    ("R002", "上海零售商B", "Retailer", 3, "上海", "qr"),              # ★
    ("R003", "北京零售商C", "Retailer", 3, "北京", "low_demand"),
]

# ── 边定义 ──────────────────────────────────────────────────────

EDGES = [
    ("S001", "P001", "原材料供应"),
    ("S001", "P002", "原材料供应"),
    ("S002", "P001", "零部件供应"),   # S002→P001 是关键风险链路
    ("S002", "P002", "零部件供应"),
    ("P001", "D001", "成品运输"),
    ("P001", "D003", "成品运输"),
    ("P002", "D001", "成品运输"),
    ("P002", "D002", "成品运输"),
    ("D001", "R001", "区域配送"),
    ("D001", "R002", "区域配送"),
    ("D002", "R002", "区域配送"),
    ("D003", "R003", "区域配送"),
]

# ── 时序数据生成 ────────────────────────────────────────────────

def base_signal(node, week_idx):
    """为每个节点生成基础需求信号。

    设计意图：
    - S002 在后期出现缺货（供给中断），触发 inventory_risk 和 delay_flag
    - P001 的波动上游大于下游（牛鞭效应）
    - D001 的 CV 显著低于同层 D002/D003（VMI 模式）
    - R002 数据点多但波动小（QR 特征）
    """
    nid = node[0]
    profile = node[5]
    t = week_idx

    # 基础趋势：轻微上升
    trend = 100 + t * 1.5

    # 季节性：年中有一个小高峰
    seasonal = 15 * math.sin(2 * math.pi * t / 26)

    # 按节点画像叠加
    if profile == "stable":
        noise = random.gauss(0, 5)
        return trend + seasonal + noise

    elif profile == "high_risk":
        # 前 16 周正常，后 10 周出货量骤降（模拟缺货）
        noise = random.gauss(0, 8)
        if t >= 16:
            return (trend + seasonal) * (0.4 + 0.02 * (t - 16)) + noise  # 出货量 40% → 60%
        return trend + seasonal + noise

    elif profile == "bullwhip":
        # 高波动：上游端的典型牛鞭效应
        noise = random.gauss(0, 25)  # 高方差
        spike = 40 * math.sin(1.5 * math.pi * t / 26)  # 额外的周期波动
        return trend + seasonal + spike + noise

    elif profile == "normal":
        noise = random.gauss(0, 8)
        return trend + seasonal + noise

    elif profile == "vmi":
        # VMI 模式：波动显著低于同层
        noise = random.gauss(0, 3)  # 极低噪声
        return trend + seasonal + noise

    elif profile == "moderate":
        noise = random.gauss(0, 12)
        return trend + seasonal + noise

    elif profile == "qr":
        # 高频小幅：低CV，数据点多
        noise = random.gauss(0, 4)
        return trend * 0.3 + seasonal * 0.3 + noise + 80  # 稳定的中等需求

    elif profile == "low_demand":
        noise = random.gauss(0, 6)
        return trend * 0.6 + seasonal * 0.5 + noise

    return trend + random.gauss(0, 10)


def generate_fact_table(metric_name, node_filter=None, transform=None):
    """生成一个事实表 CSV。"""
    rows = []
    target_nodes = node_filter if node_filter else NODES
    for node in target_nodes:
        for wi, date in enumerate(DATES):
            val = base_signal(node, wi)
            if transform:
                val = transform(val, node, wi)
            rows.append({
                "date": date,
                "node_id": node[0],
                "value": round(max(val, 0), 1),
            })
    return rows


def write_csv(filename, fieldnames, rows):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  ✓ {filename} ({len(rows)} 行)")


# ── 生成各事实表 ────────────────────────────────────────────────

print("生成演示数据...")

# 1. Sales Order（下游零售商需求 → 所有节点都参与）
print("\n[需求与订单]")
write_csv("Sales Order.csv", ["date", "node_id", "value"],
          generate_fact_table("Sales Order"))

# 2. Production（工厂生产量 → 仅 Plant 和 Supplier 节点）
write_csv("Production.csv", ["date", "node_id", "value"],
          generate_fact_table("Production",
              node_filter=[n for n in NODES if n[2] in ("Supplier", "Plant")],
              transform=lambda v, n, wi: v * (0.85 + 0.15 * random.random())))

# 3. Delivery To Distributor（DC 配送量）
write_csv("Delivery To Distributor.csv", ["date", "node_id", "value"],
          generate_fact_table("Delivery To Distributor",
              node_filter=[n for n in NODES if n[2] in ("DC",)],
              transform=lambda v, n, wi: v * (0.9 + 0.2 * random.random())))

# 4. Factory Issue（供应商出货 → 仅 Supplier）
write_csv("Factory Issue.csv", ["date", "node_id", "value"],
          generate_fact_table("Factory Issue",
              node_filter=[n for n in NODES if n[2] in ("Supplier",)],
              transform=lambda v, n, wi: v * (0.8 + 0.3 * random.random())))

# 5. Inventory（库存水平 → 体现库存风险）
print("\n[库存数据]")
def inv_transform(v, node, wi):
    """S002 后 10 周库存大幅下降（触发库存风险）。"""
    base = v * random.uniform(0.6, 1.0)
    if node[0] == "S002" and wi >= 16:
        return base * 0.25  # 库存骤降至正常的 25%
    return base
write_csv("Inventory.csv", ["date", "node_id", "value"],
          generate_fact_table("Inventory", transform=inv_transform))

# ── 节点与关系 ──────────────────────────────────────────────────

print("\n[网络结构]")
write_csv("Nodes.csv", ["node_id", "node_name", "node_type", "level", "region"],
          [{"node_id": n[0], "node_name": n[1], "node_type": n[2],
            "level": str(n[3]), "region": n[4]} for n in NODES])

write_csv("Edges.csv", ["source", "target", "context", "risk_link"],
          [{"source": e[0], "target": e[1], "context": e[2],
            "risk_link": "yes" if e[0] == "S002" else ""} for e in EDGES])

# ── 节点类型定义 ────────────────────────────────────────────────

write_csv("Node Types.csv", ["node_type", "description", "typical_metrics"],
          [
              {"node_type": "Supplier", "description": "原材料/零部件供应商",
               "typical_metrics": "供应可靠性、交期偏差、库存周转"},
              {"node_type": "Plant", "description": "制造/组装工厂",
               "typical_metrics": "产能利用率、产出波动、在制品库存"},
              {"node_type": "DC", "description": "区域配送中心",
               "typical_metrics": "配送时效、库存健康度、吞吐量"},
              {"node_type": "Retailer", "description": "终端零售商",
               "typical_metrics": "销售量、缺货率、补货频率"},
          ])

# ── 标注说明 ────────────────────────────────────────────────────

annotation = """# 演示场景说明

## 供应链结构
- 10 个节点，4 层级（供应商 → 工厂 → 配送中心 → 零售商）
- 12 条边，含供应链上下游关系和风险链路
- 26 周时间序列（2026-01-05 ~ 2026-06-29）

## 风险特征设计

| 节点 | 特征 | 预期效果 |
|------|------|---------|
| S002 华东零部件供应商 | 后10周出货量和库存骤降 | 高风险节点、库存风险、历史延迟标记 |
| P001 深圳制造工厂 | 高波动性（上游牛鞭放大） | 牛鞭效应检测、波动异常 |
| D001 华南配送中心 | 极低波动（VMI信息共享） | VMI 模式检测 |
| R002 上海零售商 | 高频小幅稳定需求 | QR 补货特征检测 |

## 预期分析结果

1. **风险趋势图** - 显示 26 周全网平均+最高风险走势，后段因 S002 恶化而上升
2. **风险分布图** - 1-2 个高风险节点（S002），其余中低风险
3. **传播时序图** - S002→P001→D001/D003 链路风险传播
4. **高风险节点表** - S002 排第一（库存+延迟），P001 排第二（波动）
5. **数据可信度** - 所有图表正常生成，可信度 high
6. **领域洞察** - 检测到牛鞭效应(P001)、VMI(D001)、QR(R002)

## 数据文件

| 文件 | 类型 | 说明 |
|------|------|------|
| Sales Order.csv | 事实表（宽表） | 下游订单需求 |
| Production.csv | 事实表 | 工厂生产量 |
| Delivery To Distributor.csv | 事实表 | DC 配送量 |
| Factory Issue.csv | 事实表 | 供应商出货量 |
| Inventory.csv | 事实表 | 库存水平 |
| Nodes.csv | 节点表 | 节点属性 |
| Edges.csv | 边表 | 供应链关系 |
| Node Types.csv | 元数据表 | 节点类型说明 |

⚠️ 本数据为模拟生成，仅用于系统功能演示，不反映真实业务场景。
"""

with open(os.path.join(OUTPUT_DIR, "README.md"), "w") as f:
    f.write(annotation)

print(f"\n✅ 演示数据已生成: {OUTPUT_DIR}")
print("   共 10 节点 × 26 周 × 5 指标 = 1,300 条时序记录")
