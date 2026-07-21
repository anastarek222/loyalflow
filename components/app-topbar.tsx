"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Menu,
} from "lucide-react";

import { useState } from "react";

import LanguageSwitcher from "@/components/language-switcher";
import MobileSidebarWrapper from "@/components/mobile-sidebar-wrapper";


type Props = {
  language: "AR" | "EN";

  businessSlug?: string;

  role?: string;

  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
};


export default function AppTopbar({
  language,
  user,
  businessSlug,
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

    <header
      className="
        flex
        h-20
        items-center
        justify-between
        border-b
        border-slate-200
        bg-white
        px-4
        sm:px-6
      "
    >


      <div className="flex items-center gap-3">

        <MobileSidebarWrapper
          language={language}
          businessSlug={businessSlug}
          role={user.role}
        />


        <div>

          <p className="text-xs font-bold text-slate-400">
            {language === "AR"
              ? "لوحة التحكم"
              : "Dashboard"}
          </p>


          <h2 className="text-lg font-black text-slate-950">
            LoyalFlow
          </h2>

        </div>

      </div>



      <div className="flex items-center gap-3">


        <button
          className="
            relative
            rounded-xl
            border
            border-slate-200
            p-2.5
            text-slate-600
            transition
            hover:bg-slate-50
          "
        >

          <Bell size={19}/>

          <span
            className="
              absolute
              right-2
              top-2
              h-2
              w-2
              rounded-full
              bg-violet-600
            "
          />

        </button>



        <LanguageSwitcher
          language={language}
        />



        <div className="relative">


          <button
            onClick={() => setOpen(!open)}
            className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-2
              py-1.5
              transition
              hover:bg-slate-50
            "
          >


            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-slate-950
                font-black
                text-white
              "
            >
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

            <div
              className="
                absolute
                right-0
                top-14
                z-50
                w-56
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-2
                shadow-xl
              "
            >

              <button
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-3
                  text-sm
                  font-bold
                  text-slate-700
                  hover:bg-slate-100
                "
              >

                <User size={17}/>

                {language === "AR"
                  ? "الملف الشخصي"
                  : "Profile"}

              </button>



              <button
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-3
                  text-sm
                  font-bold
                  text-red-600
                  hover:bg-red-50
                "
              >

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
