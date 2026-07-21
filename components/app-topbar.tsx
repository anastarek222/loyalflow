"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";

import LanguageSwitcher from "@/components/language-switcher";
import { useState } from "react";

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

  const [open, setOpen] = useState(false);

  const fullName =
    `${user.firstName} ${user.lastName}`.trim();


  const role =
    user.role === "OWNER"
      ? language === "AR"
        ? "مالك النشاط"
        : "Owner"
      : user.role === "MANAGER"
        ? language === "AR"
          ? "مدير"
          : "Manager"
        : language === "AR"
          ? "موظف"
          : "Staff";


  const initial =
    user.firstName
      .charAt(0)
      .toUpperCase();


  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">

      <div>
        <h2 className="text-lg font-black text-slate-950">
          {language === "AR"
            ? "لوحة التحكم"
            : "Dashboard"}
        </h2>
      </div>


      <div className="flex items-center gap-3">


        <button
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
        >
          <Bell size={20}/>
        </button>


        <LanguageSwitcher
          language={language}
        />


        <div className="relative">

          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 transition hover:bg-slate-50"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 font-black text-white">
              {initial}
            </div>


            <div className="hidden text-right sm:block">

              <p className="text-sm font-black text-slate-950">
                {fullName}
              </p>

              <p className="text-xs font-bold text-slate-500">
                {role}
              </p>

            </div>


            <ChevronDown size={16}/>

          </button>


          {open && (
            <div className="absolute right-0 top-14 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">

              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">

                <User size={17}/>

                {language === "AR"
                  ? "الملف الشخصي"
                  : "Profile"}

              </button>


              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">

                <LogOut size={17}/>

                {language === "AR"
                  ? "تسجيل الخروج"
                  : "Logout"}

              </button>

            </div>
          )}

        </div>


      </div>

    </header>
  );
}
