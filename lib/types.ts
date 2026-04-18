export type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH'
export type FindingStatus = 'PASS' | 'WARN' | 'FAIL'

export interface CategoryFinding {
  name: string
  status: FindingStatus
  findings: string[]
}

export interface AnalysisResult {
  risk_score: RiskScore
  overall_score: number
  categories: CategoryFinding[]
  summary: string
  // Case analysis extras (present when is_case=true)
  documents_identified?: string[]
  cross_document_issues?: string[]
}

export interface AnalysisStreamEvent {
  type: 'session' | 'token' | 'done' | 'error'
  session_id?: string
  document_name?: string
  token?: string
  raw?: string
  message?: string
}

export interface ChatMessage {
  role: 'user' | 'amberlyn'
  content: string
  streaming?: boolean
}

export interface ChatStreamEvent {
  type: 'token' | 'done' | 'error'
  token?: string
  message?: string
}
