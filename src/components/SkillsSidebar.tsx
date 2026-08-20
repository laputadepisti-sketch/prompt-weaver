import { MessageSquare, Sparkles, Wand2, X } from "lucide-react";
import { SKILLS, type SkillId } from "@/lib/skills";

const ICONS: Record<SkillId, typeof MessageSquare> = {
  chat: MessageSquare,
  optimizer: Wand2,
};

export function SkillsSidebar({
  open,
  activeSkill,
  onSelect,
  onClose,
}: {
  open: boolean;
  activeSkill: SkillId;
  onSelect: (skill: SkillId) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Bezárás"
        onClick={onClose}
        className="fade-in absolute inset-0 bg-black/55 backdrop-blur-[2px]"
      />
      <aside className="sheet-in glass-panel safe-top safe-bottom absolute inset-y-0 left-0 flex w-[84%] max-w-[330px] flex-col border-r border-glass-border">
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="glow-ring flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles size={17} />
            </div>
            <div className="leading-tight">
              <p className="text-[16px] font-semibold tracking-tight">Skillek</p>
              <p className="text-[12px] text-muted-foreground">Válassz működési módot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Panel bezárása"
            className="tap-shrink flex h-9 w-9 items-center justify-center rounded-full glass text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        <div className="ios-scroll flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-2">
            {SKILLS.map((skill) => {
              const Icon = ICONS[skill.id];
              const active = skill.id === activeSkill;
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => onSelect(skill.id)}
                  className={
                    active
                      ? "tap-shrink flex w-full items-start gap-3 rounded-2xl border border-primary/60 bg-primary/15 px-3.5 py-3 text-left"
                      : "tap-shrink glass flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left"
                  }
                >
                  <span
                    className={
                      active
                        ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                        : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ios-blue"
                    }
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-snug text-foreground">
                      {skill.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                      {skill.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 px-1 text-[12px] leading-relaxed text-muted-foreground">
            A skill váltása új beszélgetést indít, hogy a mód rendszerutasítása tisztán érvényesüljön.
          </p>
        </div>
      </aside>
    </div>
  );
}
