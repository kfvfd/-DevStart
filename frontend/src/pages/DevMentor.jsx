import DevMentorChat from "../components/DevMentorChat";
import { useApp } from "../context/AppContext";

export default function DevMentor() {
  const { t } = useApp();
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-slide">
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-fuchsia-400 mb-2">AI Tutor</div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-6">{t("devmentor")}</h1>
      <DevMentorChat />
    </div>
  );
}
