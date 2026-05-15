export type JobApplicationStatus =
  | 'draft'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'archived';

export interface ExportHistoryItem {
  id: string;
  exportedAt: string;
  filename: string;
  format: 'pdf';
}

export interface JobApplication {
  id: string;
  baseResumeId: string;
  versionResumeId: string;
  role: string;
  company: string;
  jobUrl?: string;
  jobDescription?: string;
  status: JobApplicationStatus;
  exportHistory: ExportHistoryItem[];
  createdAt: string;
  updatedAt: string;
}
