/**
 * Backend-generated label translations.
 * The backend currently generates Chinese labels for risk causes, actions,
 * field names, etc. This utility translates them to English when the UI
 * language is set to English.
 */

export const LABEL_MAP: Record<string, string> = {
  // Risk causes
  '库存水位严重偏低': 'Inventory critically low',
  '存在历史延迟记录': 'Historical delay record exists',
  '存在较大交期偏差': 'Significant delivery deviation',
  '指标波动异常偏高': 'Abnormally high volatility',
  '多个指标存在轻度风险': 'Multiple indicators show mild risk',
  '当前风险主要来自供应链网络结构性因素': 'Risk primarily from structural network factors',

  // Action types
  '补货': 'Replenish',
  '转单': 'Reroute',
  '切换供应商': 'Switch Supplier',
  '调整运输路径': 'Adjust Logistics',
  '核查波动原因': 'Investigate Volatility',
  '加强监控': 'Enhance Monitoring',
  '维持现状': 'Maintain',

  // Data confidence fields
  '时间字段': 'Time Field',
  '节点标识': 'Node Identity',
  '节点关系': 'Node Relations',
  '风险指标': 'Risk Metrics',

  // Chart names
  '风险趋势图': 'Risk Trend',
  '风险分布图': 'Risk Distribution',
  '高风险节点表': 'High Risk Nodes',
  '传播时序图': 'Propagation Timeline',
  '数据可信度': 'Data Confidence',

  // Data overview
  '文件数': 'Files',
  '数据行': 'Rows',
  '节点': 'Nodes',

  // Risk levels (for backend data)
  '高': 'High',
  '中': 'Medium',
  '低': 'Low',

  // Scenario parameter enum values
  '安全库存': 'Safety Stock',
  '按订单补货': 'Order-Based',
  '高频小批(QR)': 'High-Freq (QR)',
  '标准': 'Standard',
  '低频大批': 'Low-Freq Batch',
  '直发': 'Direct Ship',
  '经中转仓': 'Via Warehouse',
};

/**
 * Translate a label if it exists in the map, otherwise return as-is.
 */
export function translateLabel(label: string): string {
  return LABEL_MAP[label] || label;
}

/**
 * Translate an array of labels.
 */
export function translateLabels(labels: string[]): string[] {
  return labels.map(translateLabel);
}
