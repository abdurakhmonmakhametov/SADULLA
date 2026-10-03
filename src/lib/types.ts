export type InterviewType = "technical" | "hr" | "behavioral" | "ielts" | "custom";
export type ExperienceLevel = "intern" | "junior" | "mid" | "senior" | "lead";
export type Source = "ai" | "demo";
/** Language the interview is conducted in. The interface itself is always Uzbek. */
export type InterviewLanguage = "uz" | "en";
/** How demanding the interviewer is. */
export type Difficulty = "easy" | "normal" | "hard";

export interface InterviewConfig {
  role: string;
  description: string;
  level: ExperienceLevel;
  type: InterviewType;
  language: InterviewLanguage;
  questionCount: number;
  followUps: boolean;
  /** Interviewer strictness (default "normal"). */
  difficulty?: Difficulty;
  /** Optional company name the interview is for. */
  company?: string;
  /** Topics the candidate wants covered. */
  focus?: string[];
  /** Per-answer speaking limit in seconds; 0 / undefined = no limit. */
  timeLimitSec?: number;
}

export interface Question {
  id: string;
  text: string;
  /** Short note on what a good answer covers; shown on demand. */
  hint: string;
  kind: "main" | "follow-up";
  parentId?: string;
}

export interface Answer {
  transcript: string;
  durationSec: number;
}

export interface QuestionFeedback {
  questionId: string;
  score: number;
  feedback: string;
  betterAnswer: string;
}

export interface Report {
  overall: number;
  communication: number;
  technical: number;
  confidence: number;
  answerQuality: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  advice: string[];
  questions: QuestionFeedback[];
  source: Source;
  createdAt: number;
}

export type InterviewStatus = "ready" | "in-progress" | "completed";

export interface Interview {
  id: string;
  createdAt: number;
  updatedAt: number;
  config: InterviewConfig;
  questions: Question[];
  answers: Record<string, Answer>;
  currentIndex: number;
  status: InterviewStatus;
  questionSource: Source;
  report?: Report;
}

/** What the client sends to /api/feedback for each asked question. */
export interface AnsweredItem {
  questionId: string;
  question: string;
  kind: Question["kind"];
  answer: string;
}
