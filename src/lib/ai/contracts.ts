// Provider-neutral contracts. Keep all AI credentials server-side.
export interface AnalysisRequest {
  fileId: string;
  userId: string;
  subjectId: string;
  autoClassify: boolean;
}
export interface AnalysisResult {
  summary: string;
  notes: {
    title: string;
    content: string;
    priority: "essential" | "understand" | "overview";
  }[];
  knowledgePoints: {
    name: string;
    parentName?: string;
    formulas: string[];
    pitfalls: string[];
  }[];
}
export interface QuestionGenerationRequest {
  userId: string;
  subjectId: string;
  source: "chapter" | "mistakes" | "weak" | "mixed";
  knowledgePointIds: string[];
  count: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
}
export interface AIProvider {
  analyze(input: AnalysisRequest): Promise<AnalysisResult>;
}
