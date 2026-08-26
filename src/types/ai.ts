/**
 * Independent AI Service Interfaces & Types
 * Độc lập với Supabase và giao diện người dùng, sẵn sàng tích hợp các mô hình AI (như Gemini) 
 * phục vụ tự động hóa quản lý công việc, phân tích KPI và tạo báo cáo học đường.
 */

export interface AIAnalysisRequest {
  type: 'kpi_summary' | 'task_breakdown' | 'report_generation' | 'performance_insight';
  context: {
    unitName?: string;
    unitCode?: string;
    timeframe?: string;
    rawMetrics?: Record<string, unknown>;
    tasks?: Record<string, unknown>[];
    notes?: string;
  };
  options?: {
    language?: 'vi' | 'en';
    tone?: 'formal' | 'concise' | 'detailed';
    maxOutputTokens?: number;
  };
}

export interface AIAnalysisResponse {
  success: boolean;
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  suggestedActionItems?: {
    title: string;
    priority: 'low' | 'medium' | 'high';
    assigneeRole?: string;
  }[];
  generatedAt: string;
  modelUsed?: string;
  error?: string;
}

export interface AIService {
  analyzeKPI(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  generateReportDraft(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  suggestTaskBreakdown(goalTitle: string, unitContext?: string): Promise<AIAnalysisResponse>;
}
