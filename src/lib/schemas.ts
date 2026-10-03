import { z } from "zod";

const config = z.object({
  role: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000),
  level: z.enum(["intern", "junior", "mid", "senior", "lead"]),
  type: z.enum(["technical", "hr", "behavioral", "ielts", "custom"]),
  language: z.enum(["uz", "en"]).default("uz"),
  questionCount: z.number().int().min(3).max(12),
  followUps: z.boolean(),
  difficulty: z.enum(["easy", "normal", "hard"]).optional(),
  company: z.string().trim().max(120).optional(),
  focus: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  timeLimitSec: z.number().int().min(0).max(600).optional(),
});

export const configSchema = config;
export const questionsRequest = z.object({ config });

/* ---- Auth ---- */

export const registerRequest = z.object({
  name: z.string().trim().min(2, "Ism kamida 2 ta harfdan iborat bo‘lsin.").max(60),
  email: z.string().trim().toLowerCase().email("Email manzil noto‘g‘ri."),
  password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo‘lsin.").max(200),
});

export const loginRequest = z.object({
  email: z.string().trim().toLowerCase().email("Email manzil noto‘g‘ri."),
  password: z.string().min(1, "Parolni kiriting.").max(200),
});

/* ---- Stored interviews (client → server) ---- */

const score100 = z.number().min(0).max(100);

export const interviewSchema = z.object({
  id: z.string().min(1).max(64),
  createdAt: z.number(),
  updatedAt: z.number(),
  config,
  questions: z
    .array(
      z.object({
        id: z.string().max(64),
        text: z.string().max(2000),
        hint: z.string().max(1000),
        kind: z.enum(["main", "follow-up"]),
        parentId: z.string().max(64).optional(),
      }),
    )
    .max(25),
  answers: z.record(z.string().max(64), z.object({ transcript: z.string().max(10000), durationSec: z.number().min(0) })),
  currentIndex: z.number().int().min(0),
  status: z.enum(["ready", "in-progress", "completed"]),
  questionSource: z.enum(["ai", "demo"]),
  report: z
    .object({
      overall: score100,
      communication: score100,
      technical: score100,
      confidence: score100,
      answerQuality: score100,
      summary: z.string().max(4000),
      strengths: z.array(z.string().max(1000)).max(10),
      weaknesses: z.array(z.string().max(1000)).max(10),
      advice: z.array(z.string().max(1000)).max(10),
      questions: z
        .array(z.object({ questionId: z.string(), score: score100, feedback: z.string().max(4000), betterAnswer: z.string().max(4000) }))
        .max(25),
      source: z.enum(["ai", "demo"]),
      createdAt: z.number(),
    })
    .optional(),
});

export const followUpRequest = z.object({
  config,
  question: z.string().min(1).max(2000),
  answer: z.string().max(8000),
  /** Main questions still to come, so the follow-up doesn't duplicate them. */
  upcoming: z.array(z.string()).max(12),
});

export const feedbackRequest = z.object({
  config,
  items: z
    .array(
      z.object({
        questionId: z.string(),
        question: z.string(),
        kind: z.enum(["main", "follow-up"]),
        answer: z.string().max(8000),
      }),
    )
    .min(1)
    .max(25),
});

/* ---- AI settings ---- */

const providerId = z.enum(["anthropic", "openai", "gemini", "groq", "openrouter", "deepseek", "mistral", "custom"]);

export const aiSettingsRequest = z.object({
  provider: providerId,
  model: z.string().trim().min(1, "Model nomini kiriting.").max(120),
  /** Omit to keep the saved key; empty string clears it. */
  apiKey: z.string().trim().max(500).optional(),
  baseUrl: z
    .string()
    .trim()
    .max(300)
    .refine((u) => !u || /^https?:\/\/[^\s]+$/i.test(u), "Manzil http:// yoki https:// bilan boshlansin.")
    .optional(),
});

/* ---- Preparation tools ---- */

export const coachRequest = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(6000) }))
    .min(1)
    .max(30),
  /** Optional context, e.g. a summary of the user's last interview report. */
  context: z.string().max(8000).optional(),
});

export const workshopRequest = z.object({
  question: z.string().trim().min(3, "Savolni kiriting.").max(1000),
  answer: z.string().trim().min(3, "Javobingizni yozing yoki ayting.").max(8000),
  language: z.enum(["uz", "en"]).default("uz"),
  role: z.string().trim().max(120).optional(),
});

export const workshopResult = z.object({
  score: z.number().describe("0–100 quality of the answer"),
  verdict: z.string().describe("One-sentence overall verdict in Uzbek."),
  strengths: z.array(z.string()).describe("1–3 concrete strengths, in Uzbek."),
  improvements: z.array(z.string()).describe("2–4 concrete, actionable improvements, in Uzbek."),
  structure: z.string().describe("A short suggested answer outline (e.g. STAR steps) in Uzbek, 2–4 lines."),
  improvedAnswer: z.string().describe("A stronger version of the candidate's own answer, first person, in the interview language, 80–160 words. Keep their facts; do not invent achievements — use [placeholders] where specifics are missing."),
});
export type WorkshopResult = z.infer<typeof workshopResult>;

/* ---- Model output shapes ---- */

export const generatedQuestions = z.object({
  questions: z.array(
    z.object({
      text: z.string().describe("The question exactly as the interviewer would say it aloud."),
      hint: z.string().describe("One sentence in Uzbek: what a strong answer should cover."),
    }),
  ),
});

export const followUpDecision = z.object({
  ask: z.boolean().describe("True only if a follow-up would genuinely deepen the interview."),
  question: z.string().describe("The follow-up question, or an empty string when ask is false."),
});

const score = z.number().describe("0–100");

export const generatedReport = z.object({
  overall: score,
  communication: score,
  technical: score.describe("0–100. Technical / subject knowledge; for IELTS use lexical & grammatical range."),
  confidence: score,
  answerQuality: score,
  summary: z.string().describe("2–3 sentence verdict in Uzbek, addressed to the candidate as 'siz'."),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  advice: z.array(z.string()).describe("Concrete, actionable next steps."),
  questions: z.array(
    z.object({
      questionId: z.string(),
      score,
      feedback: z.string().describe("2–4 sentences on this specific answer."),
      betterAnswer: z.string().describe("A strong model answer in first person, 60–140 words."),
    }),
  ),
});

export type GeneratedQuestions = z.infer<typeof generatedQuestions>;
export type GeneratedReport = z.infer<typeof generatedReport>;
