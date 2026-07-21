import LanguageSwitcher from "@/components/language-switcher";

type Props = {
  language: "AR" | "EN";
};

export default function AppTopbar({
  language,
}: Props) {

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">

      <div>
        <h2 className="font-black text-slate-950">
          {language === "AR"
            ? "لوحة التحكم"
            : "Dashboard"}
        </h2>
      </div>


      <div className="flex items-center gap-4">

        <button className="rounded-xl border px-3 py-2">
          🔔
        </button>


        <LanguageSwitcher
          language={language}
        />


        <div className="rounded-xl bg-slate-100 px-4 py-2 font-bold">
          User
        </div>

      </div>

    </header>
  );
}
