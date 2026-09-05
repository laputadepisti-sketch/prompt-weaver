export type SkillId = "optimizer";

export type Skill = {
  id: SkillId;
  name: string;
  description: string;
  placeholder: string;
  greetingTitle: string;
  greetingBody: string;
  examples: string[];
};

export const OPTIMIZER_SKILL: Skill = {
  id: "optimizer",
  name: "Prompt Optimizer",
  description: "Rövid, egyértelmű, modellfüggetlen promptok",
  placeholder: "Illeszd be a nyers promptodat…",
  greetingTitle: "Promptoptimalizálás",
  greetingBody:
    "Illeszd be a nyers promptodat, és visszakapod a rövid, egyértelmű, bármelyik AI modellhez illő változatát változásnaplóval. Utána tovább finomíthatod.",
  examples: [
    "Javítsd ki a kódom összes hibáját, és add vissza a teljes, rövidítetlen fájlt egyben.",
    "Write a Python script that scrapes a website and stores results in a database.",
    "Írd át ezt a technikai leírást egyetlen, teljes, lépésről lépésre építő prompttá.",
  ],
};

export const SKILLS: Skill[] = [OPTIMIZER_SKILL];

export const DEFAULT_SKILL_ID: SkillId = "optimizer";

export function getSkill(): Skill {
  return OPTIMIZER_SKILL;
}

export function isSkillId(value: unknown): value is SkillId {
  return value === "optimizer";
}
