import type { VoiceGender } from "@/hooks/useVoice";
import type { Difficulty, InterviewLanguage } from "./types";

const VOICE_PREF = "suhbatdosh.voice";
const DEFAULTS_PREF = "suhbatdosh.defaults";

/** Per-browser interviewer voice preference. */
export function readGender(): VoiceGender {
  try {
    return localStorage.getItem(VOICE_PREF) === "male" ? "male" : "female";
  } catch {
    return "female";
  }
}

export function saveGender(g: VoiceGender) {
  try {
    localStorage.setItem(VOICE_PREF, g);
  } catch {
    /* ignore */
  }
}

/** Starting values for the new-interview wizard. */
export interface WizardDefaults {
  language: InterviewLanguage;
  difficulty: Difficulty;
  questionCount: number;
  followUps: boolean;
  timeLimitSec: number;
}

export const FACTORY_DEFAULTS: WizardDefaults = { language: "uz", difficulty: "normal", questionCount: 6, followUps: true, timeLimitSec: 0 };

export function readDefaults(): WizardDefaults {
  try {
    const raw = JSON.parse(localStorage.getItem(DEFAULTS_PREF) ?? "{}") as Partial<WizardDefaults>;
    return { ...FACTORY_DEFAULTS, ...raw };
  } catch {
    return FACTORY_DEFAULTS;
  }
}

export function saveDefaults(d: WizardDefaults) {
  try {
    localStorage.setItem(DEFAULTS_PREF, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}
