export interface DemoFileSummary {
  name: string;
  role: 'node' | 'fact' | 'edge';
  rows: number;
  columns: string[];
}

export interface FieldMapping {
  originalColumn: string;
  mappedField: string;
  status: 'identified' | 'uncertain' | 'unmapped';
  sampleValues: string[];
  confidence: number;
}

export interface AnalysisProgress {
  stage: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  name?: string;
  risk_level?: string;
  in_degree?: number;
  out_degree?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface AnalysisResult {
  meta: Record<string, unknown>;
  input_summary: Record<string, number>;
  text_summary: Record<string, string>;
  visuals: Record<string, unknown>;
}

export interface AnalysisSource {
  readonly kind: 'app' | 'demo';
  analyze(
    batchId: string,
    onProgress: (p: AnalysisProgress) => void,
    lang?: string,
  ): Promise<void>;
  getResult(batchId: string): Promise<AnalysisResult>;
}

export interface DemoJourneySource extends AnalysisSource {
  getFiles(): Promise<DemoFileSummary[]>;
  getMappings(): Promise<FieldMapping[]>;
}
