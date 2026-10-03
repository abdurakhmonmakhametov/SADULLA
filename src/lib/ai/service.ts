import "server-only";
import type { AnsweredItem, InterviewConfig, InterviewLanguage, Source } from "../types";
import { followUpDecision, generatedQuestions, generatedReport, workshopResult, type GeneratedReport, type WorkshopResult } from "../schemas";
import { chat, describeAiError, generateStructured, type AiConfig } from "./client";
import {
  coachSystem,
  evaluatorSystem,
  interviewerSystem,
  feedbackPrompt,
  followUpPrompt,
  questionsPrompt,
  workshopPrompt,
  workshopSystem,
} from "./prompts";
import { demoQuestions } from "../demo/questions";
import { demoFollowUp, demoReport } from "../demo/evaluate";
import { offlineCoach } from "../demo/coach";

type WithSource<T> = T & { source: Source; notice?: string };

/** Runs the AI path when a provider is configured, otherwise (or on failure) the offline engine. */
async function withFallback<T>(ai: AiConfig | null, run: (ai: AiConfig) => Promise<T>, demo: () => T): Promise<WithSource<{ data: T }>> {
  if (!ai) return { data: demo(), source: "demo" };
  try {
    return { data: await run(ai), source: "ai" };
  } catch (err) {
    console.error(`[ai:${ai.provider}] falling back to offline engine:`, err);
    return {
      data: demo(),
      source: "demo",
      notice: `AI xizmati ishlamadi (${describeAiError(err)}), shuning uchun oflayn rejim ishlatildi.`,
    };
  }
}

export async function createQuestions(ai: AiConfig | null, config: InterviewConfig) {
  return withFallback(
    ai,
    async (ai) => {
      const out = await generateStructured(ai, {
        schema: generatedQuestions,
        system: interviewerSystem(config),
        prompt: questionsPrompt(config),
        effort: "medium",
      });
      const qs = out.questions.filter((q) => q.text.trim()).slice(0, config.questionCount);
      if (qs.length < Math.min(3, config.questionCount)) throw new Error("Too few questions generated");
      return qs;
    },
    () => demoQuestions(config),
  );
}

export async function createFollowUp(ai: AiConfig | null, config: InterviewConfig, question: string, answer: string, upcoming: string[]) {
  return withFallback<string | null>(
    ai,
    async (ai) => {
      const out = await generateStructured(ai, {
        schema: followUpDecision,
        system: interviewerSystem(config),
        prompt: followUpPrompt(config, question, answer, upcoming),
        effort: "low",
        maxTokens: 4000,
      });
      return out.ask && out.question.trim() ? out.question.trim() : null;
    },
    () => demoFollowUp(config, question, answer),
  );
}

export async function createReport(ai: AiConfig | null, config: InterviewConfig, items: AnsweredItem[]) {
  return withFallback<GeneratedReport>(
    ai,
    async (ai) => {
      const out = await generateStructured(ai, {
        schema: generatedReport,
        system: evaluatorSystem(config),
        prompt: feedbackPrompt(config, items),
        effort: "high",
        maxTokens: 32000,
      });
      // Keep per-question rows aligned with what was actually asked.
      const byId = new Map(out.questions.map((q) => [q.questionId, q]));
      const fallback = demoReport(config, items);
      out.questions = items
        .map((it, i) => byId.get(it.questionId) ?? out.questions[i] ?? fallback.questions[i])
        .map((q, i) => ({ ...q, questionId: items[i].questionId }));
      return out;
    },
    () => demoReport(config, items),
  );
}

/** Single-answer review for the Answer Workshop. */
export async function reviewAnswer(ai: AiConfig | null, input: { question: string; answer: string; language: InterviewLanguage; role?: string }) {
  return withFallback<WorkshopResult>(
    ai,
    (ai) =>
      generateStructured(ai, {
        schema: workshopResult,
        system: workshopSystem(input.language),
        prompt: workshopPrompt(input),
        effort: "medium",
        maxTokens: 6000,
      }),
    () => {
      const config: InterviewConfig = {
        role: input.role || "Nomzod",
        description: "",
        level: "junior",
        type: "behavioral",
        language: input.language,
        questionCount: 5,
        followUps: false,
      };
      const r = demoReport(config, [{ questionId: "q", question: input.question, kind: "main", answer: input.answer }]);
      const q = r.questions[0];
      return {
        score: q.score,
        verdict: q.feedback,
        strengths: r.strengths.slice(0, 3),
        improvements: [...r.weaknesses, ...r.advice].slice(0, 4),
        structure: "Vaziyat → Vazifa → Harakat → Natija (STAR). Har qismga 1–2 gap, oxirida raqam bilan natija.",
        improvedAnswer: q.betterAnswer,
      };
    },
  );
}

/** AI coach chat turn. Offline it answers common topics from a built-in playbook. */
export async function coachReply(ai: AiConfig | null, messages: { role: "user" | "assistant"; content: string }[], context?: string) {
  const last = messages[messages.length - 1]?.content ?? "";
  if (!ai) return { data: offlineCoach(last), source: "demo" as Source };
  try {
    return { data: await chat(ai, coachSystem(context), messages), source: "ai" as Source };
  } catch (err) {
    console.error(`[ai:${ai.provider}] coach failed:`, err);
    return { data: offlineCoach(last), source: "demo" as Source, notice: `AI javob bermadi: ${describeAiError(err)}` };
  }
}
