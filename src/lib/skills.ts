export type SkillId = "chat" | "optimizer";

export type Skill = {
  id: SkillId;
  name: string;
  description: string;
  placeholder: string;
  greetingTitle: string;
  greetingBody: string;
  examples: string[];
};

export const SKILLS: Skill[] = [
  {
    id: "chat",
    name: "Asszisztens",
    description: "Általános AI chat bármilyen kérdéshez",
    placeholder: "Írj egy üzenetet…",
    greetingTitle: "Miben segíthetek?",
    greetingBody:
      "Általános asszisztens mód. Kérdezz bármit, vagy nyisd meg a Skillek panelt egy speciális módhoz.",
    examples: [
      "Magyarázd el a vektor adatbázisok működését röviden.",
      "Írj egy Python scriptet, ami CSV-ből SQLite táblát tölt fel.",
      "Hasonlítsd össze a Zig és a Rust memóriakezelését.",
    ],
  },
  {
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
  },
];

export const DEFAULT_SKILL_ID: SkillId = "chat";

export function getSkill(id: SkillId): Skill {
  return SKILLS.find((skill) => skill.id === id) ?? SKILLS[0];
}

export function isSkillId(value: unknown): value is SkillId {
  return value === "chat" || value === "optimizer";
}
