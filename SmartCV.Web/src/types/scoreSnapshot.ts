export interface ScoreSnapshot {
  id: string;
  resumeId: string;
  score: number;
  verdict: 'Strong' | 'Good' | 'Needs work' | 'At risk';
  wordCount: number;
  bulletCount: number;
  quantifiedBulletCount: number;
  sectionCount: number;
  createdAt: string;
}
