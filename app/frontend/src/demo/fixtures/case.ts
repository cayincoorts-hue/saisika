import type { DemoFileSummary, FieldMapping } from '../../types/analysis';

export const demoFiles: DemoFileSummary[] = [
  { name: 'Nodes.csv', role: 'node', rows: 10, columns: ['Node ID', 'Node Name', 'Node Type'] },
  { name: 'Edges.csv', role: 'edge', rows: 12, columns: ['Source', 'Target', 'Weight'] },
  { name: 'Sales Order.csv', role: 'fact', rows: 480, columns: ['Date', 'Node ID', 'Product', 'Quantity', 'Amount'] },
  { name: 'Production.csv', role: 'fact', rows: 360, columns: ['Date', 'Node ID', 'Product', 'Quantity'] },
  { name: 'Inventory.csv', role: 'fact', rows: 300, columns: ['Date', 'Node ID', 'Product', 'Stock'] },
  { name: 'Factory Issue.csv', role: 'fact', rows: 420, columns: ['Date', 'Source', 'Target', 'Product', 'Quantity'] },
  { name: 'Delivery To Distributor.csv', role: 'fact', rows: 380, columns: ['Date', 'Source', 'Target', 'Product', 'Quantity'] },
];

export const demoMappings: FieldMapping[] = [
  { originalColumn: 'Date', mappedField: 'timestamp', status: 'identified', sampleValues: ['2026-04-01', '2026-04-02'], confidence: 0.98 },
  { originalColumn: 'Node ID', mappedField: 'node_id', status: 'identified', sampleValues: ['S001', 'S002', 'P001'], confidence: 0.95 },
  { originalColumn: 'Quantity', mappedField: 'quantity', status: 'identified', sampleValues: ['150', '320', '75'], confidence: 0.97 },
  { originalColumn: 'Source', mappedField: 'source_node', status: 'identified', sampleValues: ['F01', 'W01'], confidence: 0.92 },
  { originalColumn: 'Target', mappedField: 'target_node', status: 'identified', sampleValues: ['D01', 'W01'], confidence: 0.92 },
  { originalColumn: 'Product', mappedField: 'product', status: 'identified', sampleValues: ['SKU-A100', 'SKU-B200'], confidence: 0.88 },
  { originalColumn: 'Amount', mappedField: 'amount', status: 'uncertain', sampleValues: ['12500', '8300'], confidence: 0.65 },
];
