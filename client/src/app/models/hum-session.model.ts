export interface HumSessionRequest {
  audioBase64: string;
  durationSeconds: number;
  userId?: string;
}

export interface ShowSummary {
  id: number;
  title: string;
  date: string;
  imgUrl: string;
  categoryName: string;
}

export interface HumSessionResponse {
  id: string;
  detectedGenre: string;
  confidenceScore: number;
  recommendedShows: ShowSummary[];
}

export interface GenreAnalysis {
  genre: string;
  confidence: number;
  subGenres: string[];
  mood: string;
}

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done';
