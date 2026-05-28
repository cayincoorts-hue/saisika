# Saisca — 供应链风险分析系统

可本地部署、支持 Excel/CSV 导入、面向供应链管理者的风险分析桌面工具。

## 核心功能

- **数据导入**：Excel/CSV 拖拽上传，自动识别文件角色
- **字段映射**：智能识别 + 手动确认，宽表自动熔为长表
- **风险分析**：六大维度量化供应链风险，完整推理链条可追溯
- **领域洞察**：自动检测牛鞭效应、VMI 模式、QR 补货特征
- **动作建议**：结构化处置建议 + 替代方案评估
- **可复现性**：确定性规则引擎，同份输入任意机器产出相同结果

## 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 启动
python run.py

# 浏览器访问
open http://localhost:8000
```

## 演示数据

`demo_data/` 目录包含一个 5 节点供应链示例：

| 文件 | 说明 |
|------|------|
| `nodes.csv` | 7 个节点（供应商→工厂→配送中心→分销商→零售商） |
| `edges.csv` | 供应链上下游关系 |
| `sales_order.csv` | 下游销售订单量时序数据 |
| `production.csv` | 工厂产量时序数据 |
| `delivery.csv` | 配送交付量时序数据 |
| `factory_issue.csv` | 工厂发货量时序数据 |

## 项目结构

```
app/backend/         Python 后端（FastAPI）
app/frontend/        React 前端（TypeScript + Vite）
demo_data/           演示数据
keygen.py            客户激活码生成工具
run.py               一键启动入口
```

## 技术栈

- 前端：React + TypeScript + Vite + ECharts + GSAP
- 后端：Python + FastAPI + pandas
- 打包：PyInstaller + Electron
- 理论框架：SCOR / 牛鞭效应 / VMI / QR / SC-BSC

## 许可证

待定
