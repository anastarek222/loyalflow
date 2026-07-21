import LanguageSwitcher from "@/components/language-switcher";

type Props = {
  language: "AR" | "EN";

  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
};

export default function AppTopbar({
  language,
  user,
}: Props) {

  const fullName =
    `${user.firstName} ${user.lastName}`.trim();

  const role =
    user.role === "OWNER"
      ? language === "AR"
        ? "مالك"
        : "Owner"
      : user.role === "MANAGER"
        ? language === "AR"
          ? "مدير"
          : "Manager"
        : language === "AR"
          ? "موظف"
          : "Staff";


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

        <button className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
          🔔
        </button>


        <LanguageSwitcher
          language={language}
        />


        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 font-black text-white">
            {user.firstName.charAt(0).toUpperCase()}
          </div>


          <div className="text-right">

            <p className="text-sm font-black text-slate-950">
              {fullName}
            </p>

            <p className="text-xs font-bold text-slate-500">
              {role}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}
