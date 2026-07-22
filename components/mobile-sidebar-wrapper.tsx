"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import MobileSidebar from "@/components/mobile-sidebar";

type Props = {
  language: "AR" | "EN";
  businessSlug?: string;
  role?: string;
};

export default function MobileSidebarWrapper({
  language,
  businessSlug,
  role,
}: Props) {

  const [open, setOpen] = useState(false);


  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="
          rounded-xl
          border
          border-slate-200
          bg-white
          p-2.5
          text-slate-700
          shadow-sm
          transition
          hover:bg-slate-50
          lg:hidden
        "
      >
        <Menu size={22}/>
      </button>


      <MobileSidebar
        open={open}
        onClose={() => setOpen(false)}
        language={language}
        businessSlug={businessSlug}
        role={role}
      />
    </>
  );
}
