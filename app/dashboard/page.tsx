import { auth } from "@/auth";

import {
  getLanguageDirection,
  getLanguageLocale,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n";

import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, BarChart3, ScanLine, Settings, UserCog } from "lucide-react";

import { logoutAction } from "./actions";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: string;
  accent?: string;
};

type DashboardStat = {
  label: string;
  value: number;
  description?: string;
  tone?:
    | "default"
    | "emerald"
    | "violet"
    | "amber"
    | "cyan";
};

const dashboardDictionary = {
  AR: {
    agencyDashboard:
      "لوحة إدارة المنصة",

    welcome:
      "مرحبًا",

    administrator:
      "مدير النظام",

    user:
      "المستخدم",

    businesses:
      "الأنشطة التجارية",

    activeBusinesses:
      "الأنشطة النشطة",

    customers:
      "إجمالي العملاء",

    newCustomersMonth:
      "عملاء جدد هذا الشهر",

    transactionsToday:
      "عمليات اليوم",

    rewardsMonth:
      "جوائز هذا الشهر",

    businessCustomers:
      "عملاء النشاط",

    activeCustomers:
      "العملاء النشطون",

    teamMembers:
      "أعضاء الفريق",

    totalTransactions:
      "إجمالي العمليات",

    rewardReady:
      "جاهزون للمكافأة",

    manageBusinesses:
      "إدارة الأنشطة",

    manageBusinessesDescription:
      "إضافة البراندات وإدارة برامج الولاء الحالية.",

    openBusiness:
      "فتح لوحة النشاط",

    openBusinessDescription:
      "عرض مؤشرات النشاط والتنبيهات وإعدادات برنامج الولاء.",

    manageCustomers:
      "إدارة العملاء",

    manageCustomersDescription:
      "إضافة العملاء وإدارة الرصيد والزيارات والمكافآت.",

    scanQr:
      "مسح كارت العميل",

    scanQrDescription:
      "فتح ملف العميل عن طريق مسح كود QR.",

    teamAccounts:
      "حسابات الفريق",

    teamAccountsDescription:
      "إنشاء وإدارة حسابات الموظفين وصلاحياتهم.",

    reports:
      "التقارير والتحليلات",

    reportsDescription:
      "متابعة أداء النشاط والموظفين وتصدير التقارير.",

    settings:
      "إعدادات النشاط",

    settingsDescription:
      "تعديل برنامج الولاء والكارت الرقمي ورسائل واتساب.",

    quickActions:
      "الوصول السريع",

    quickActionsDescription:
      "اختصارات لأهم أجزاء النظام حسب صلاحية حسابك.",

    role:
      "الدور",

    superAdmin:
      "مدير النظام",

    owner:
      "مالك النشاط",

    staff:
      "موظف",

    signOut:
      "تسجيل الخروج",

    accountUnavailable:
      "الحساب غير متاح",

    noBusinessAssigned:
      "لا يوجد نشاط تجاري مرتبط بهذا الحساب.",

    businessUnavailable:
      "النشاط التجاري المرتبط بالحساب غير متاح.",

    contactAdministrator:
      "تواصل مع مدير منصة LoyalFlow.",

    currentMonth:
      "خلال الشهر الحالي",

    today:
      "منذ بداية اليوم",

    active:
      "نشط حاليًا",

    acrossPlatform:
      "على مستوى المنصة",

    businessOverview:
      "ملخص النشاط",

    platformOverview:
      "ملخص المنصة",
  },

  EN: {
    agencyDashboard:
      "Platform Dashboard",

    welcome:
      "Welcome",

    administrator:
      "Administrator",

    user:
      "User",

    businesses:
      "Businesses",

    activeBusinesses:
      "Active businesses",

    customers:
      "Total customers",

    newCustomersMonth:
      "New customers this month",

    transactionsToday:
      "Transactions today",

    rewardsMonth:
      "Rewards this month",

    businessCustomers:
      "Business customers",

    activeCustomers:
      "Active customers",

    teamMembers:
      "Team members",

    totalTransactions:
      "Total transactions",

    rewardReady:
      "Reward ready",

    manageBusinesses:
      "Manage businesses",

    manageBusinessesDescription:
      "Add brands and manage existing loyalty programs.",

    openBusiness:
      "Open business dashboard",

    openBusinessDescription:
      "View business KPIs, notifications and loyalty settings.",

    manageCustomers:
      "Manage customers",

    manageCustomersDescription:
      "Add customers and manage balances, visits and rewards.",

    scanQr:
      "Scan customer card",

    scanQrDescription:
      "Open a customer profile by scanning their QR code.",

    teamAccounts:
      "Team accounts",

    teamAccountsDescription:
      "Create and manage staff accounts and permissions.",

    reports:
      "Reports and analytics",

    reportsDescription:
      "Review business and staff performance and export reports.",

    settings:
      "Business settings",

    settingsDescription:
      "Configure the loyalty program, digital card and WhatsApp messages.",

    quickActions:
      "Quick access",

    quickActionsDescription:
      "Shortcuts to the most important areas available to your account.",

    role:
      "Role",

    superAdmin:
      "Super administrator",

    owner:
      "Business owner",

    staff:
      "Staff",

    signOut:
      "Sign out",

    accountUnavailable:
      "Account unavailable",

    noBusinessAssigned:
      "No business is assigned to this account.",

    businessUnavailable:
      "The business assigned to this account is unavailable.",

    contactAdministrator:
      "Contact the LoyalFlow administrator.",

    currentMonth:
      "During the current month",

    today:
      "Since the start of today",

    active:
      "Currently active",

    acrossPlatform:
      "Across the platform",

    businessOverview:
      "Business overview",

    platformOverview:
      "Platform overview",
  },
} satisfies Record<
  AppLanguage,
  Record<string, string>
>;

function getStartOfToday() {
  const now =
    new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
}

function getStartOfMonth() {
  const now =
    new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );
}

function getRoleLabel(
  role: string,
  language: AppLanguage
) {
  const dictionary =
    dashboardDictionary[language];

  switch (role) {
    case "SUPER_ADMIN":
      return dictionary.superAdmin;

    case "OWNER":
      return dictionary.owner;

    case "MANAGER":
      return language === "AR" ? "مدير" : "Manager";

    case "STAFF":
      return dictionary.staff;

    case "VIEWER":
      return language === "AR" ? "مشاهد" : "Viewer";

    default:
      return role;
  }
}

export default async function DashboardPage() {
  const session =
    await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser =
    await prisma.user.findUnique({
      where: {
        id:
          session.user.id,
      },

      select: {
        language:
          true,
        firstName:
          true,
        lastName:
          true,
        email:
          true,
        role:
          true,
        businessId:
          true,
      },
    });

  if (!currentUser) {
    redirect("/login");
  }

  const language =
    normalizeLanguage(
      currentUser.language
    );

  const dictionary =
    dashboardDictionary[language];

  const name =
    [
      currentUser.firstName,
      currentUser.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    (
      currentUser.role ===
      "SUPER_ADMIN"
        ? dictionary.administrator
        : dictionary.user
    );

  const startOfToday =
    getStartOfToday();

  const startOfMonth =
    getStartOfMonth();

  if (
    currentUser.role ===
    "SUPER_ADMIN"
  ) {
    const [
      businesses,
      activeBusinesses,
      customers,
      newCustomersMonth,
      transactionsToday,
      rewardsMonth,
    ] =
      await Promise.all([
        prisma.business.count(),

        prisma.business.count({
          where: {
            isActive:
              true,
          },
        }),

        prisma.customer.count(),

        prisma.customer.count({
          where: {
            createdAt: {
              gte:
                startOfMonth,
            },
          },
        }),

        prisma
          .loyaltyTransaction
          .count({
            where: {
              createdAt: {
                gte:
                  startOfToday,
              },
            },
          }),

        prisma
          .rewardRedemption
          .count({
            where: {
              createdAt: {
                gte:
                  startOfMonth,
              },
            },
          }),
      ]);

    const stats: DashboardStat[] = [
      {
        label:
          dictionary.businesses,
        value:
          businesses,
        description:
          dictionary.acrossPlatform,
        tone:
          "violet",
      },
      {
        label:
          dictionary.activeBusinesses,
        value:
          activeBusinesses,
        description:
          dictionary.active,
        tone:
          "emerald",
      },
      {
        label:
          dictionary.customers,
        value:
          customers,
        description:
          dictionary.acrossPlatform,
        tone:
          "cyan",
      },
      {
        label:
          dictionary.newCustomersMonth,
        value:
          newCustomersMonth,
        description:
          dictionary.currentMonth,
        tone:
          "emerald",
      },
      {
        label:
          dictionary.transactionsToday,
        value:
          transactionsToday,
        description:
          dictionary.today,
        tone:
          "amber",
      },
      {
        label:
          dictionary.rewardsMonth,
        value:
          rewardsMonth,
        description:
          dictionary.currentMonth,
        tone:
          "violet",
      },
    ];

    const actions: QuickAction[] = [
      {
        title:
          dictionary.manageBusinesses,
        description:
          dictionary.manageBusinessesDescription,
        href:
          "/businesses",
        icon:
          "🏢",
        accent:
          "bg-violet-600",
      },
    ];

    return (
      <DashboardLayout
        language={language}
        name={name}
        email={
          currentUser.email
        }
        role={
          currentUser.role
        }
        title={
          dictionary.agencyDashboard
        }
        eyebrow={
          dictionary.platformOverview
        }
        stats={stats}
        actions={actions}
      />
    );
  }

  if (
    !currentUser.businessId
  ) {
    return (
      <UnavailableAccount
        language={language}
        message={
          dictionary.noBusinessAssigned
        }
      />
    );
  }

  const business =
    await prisma.business.findUnique({
      where: {
        id:
          currentUser.businessId,
      },

      include: {
        _count: {
          select: {
            customers:
              true,
            users:
              true,
            transactions:
              true,
            redemptions:
              true,
          },
        },
      },
    });

  if (
    !business ||
    !business.isActive
  ) {
    return (
      <UnavailableAccount
        language={language}
        message={
          dictionary.businessUnavailable
        }
      />
    );
  }

  const [
    activeCustomers,
    newCustomersMonth,
    transactionsToday,
    rewardsMonth,
    rewardReady,
  ] =
    await Promise.all([
      prisma.customer.count({
        where: {
          businessId:
            business.id,
          isActive:
            true,
        },
      }),

      prisma.customer.count({
        where: {
          businessId:
            business.id,

          createdAt: {
            gte:
              startOfMonth,
          },
        },
      }),

      prisma
        .loyaltyTransaction
        .count({
          where: {
            businessId:
              business.id,

            createdAt: {
              gte:
                startOfToday,
            },
          },
        }),

      prisma
        .rewardRedemption
        .count({
          where: {
            businessId:
              business.id,

            createdAt: {
              gte:
                startOfMonth,
            },
          },
        }),

      prisma.customer.count({
        where: {
          businessId:
            business.id,

          isActive:
            true,

          balance: {
            gte:
              business.rewardThreshold,
          },
        },
      }),
    ]);

  const stats: DashboardStat[] = [
    {
      label:
        dictionary.businessCustomers,
      value:
        business._count.customers,
      description:
        dictionary.acrossPlatform,
      tone:
        "violet",
    },
    {
      label:
        dictionary.activeCustomers,
      value:
        activeCustomers,
      description:
        dictionary.active,
      tone:
        "emerald",
    },
    {
      label:
        dictionary.newCustomersMonth,
      value:
        newCustomersMonth,
      description:
        dictionary.currentMonth,
      tone:
        "cyan",
    },
    {
      label:
        dictionary.transactionsToday,
      value:
        transactionsToday,
      description:
        dictionary.today,
      tone:
        "amber",
    },
    {
      label:
        dictionary.rewardReady,
      value:
        rewardReady,
      description:
        business.rewardName,
      tone:
        "emerald",
    },
    {
      label:
        dictionary.teamMembers,
      value:
        business._count.users,
      description:
        getRoleLabel(
          currentUser.role,
          language
        ),
      tone:
        "violet",
    },
    {
      label:
        dictionary.totalTransactions,
      value:
        business._count.transactions,
      description:
        dictionary.acrossPlatform,
      tone:
        "cyan",
    },
    {
      label:
        dictionary.rewardsMonth,
      value:
        rewardsMonth,
      description:
        dictionary.currentMonth,
      tone:
        "amber",
    },
  ];

  const actions: QuickAction[] = [
    {
      title:
        dictionary.openBusiness,
      description:
        dictionary.openBusinessDescription,
      href:
        `/businesses/${business.slug}`,
      icon:
        "📊",
      accent:
        "bg-violet-600",
    },
    {
      title:
        dictionary.manageCustomers,
      description:
        dictionary.manageCustomersDescription,
      href:
        `/businesses/${business.slug}/customers`,
      icon:
        "👥",
      accent:
        "bg-emerald-600",
    },
    {
      title:
        dictionary.scanQr,
      description:
        dictionary.scanQrDescription,
      href:
        `/businesses/${business.slug}/scan`,
      icon:
        "📷",
      accent:
        "bg-cyan-600",
    },
  ];

  if (
    currentUser.role ===
    "OWNER"
  ) {
    actions.push(
      {
        title:
          dictionary.teamAccounts,
        description:
          dictionary.teamAccountsDescription,
        href:
          `/businesses/${business.slug}/users`,
        icon:
          "🔐",
        accent:
          "bg-slate-900",
      },
      {
        title:
          dictionary.reports,
        description:
          dictionary.reportsDescription,
        href:
          `/businesses/${business.slug}/reports`,
        icon:
          "📈",
        accent:
          "bg-amber-600",
      },
      {
        title:
          dictionary.settings,
        description:
          dictionary.settingsDescription,
        href:
          `/businesses/${business.slug}/settings`,
        icon:
          "⚙️",
        accent:
          "bg-violet-700",
      }
    );
  }

  return (
    <DashboardLayout
      language={language}
      name={name}
      email={
        currentUser.email
      }
      role={
        currentUser.role
      }
      title={
        business.name
      }
      eyebrow={
        dictionary.businessOverview
      }
      stats={stats}
      actions={actions}
    />
  );
}

type DashboardLayoutProps = {
  language: AppLanguage;
  name: string;
  email: string;
  role: string;
  title: string;
  eyebrow: string;
  stats: DashboardStat[];
  actions: QuickAction[];
};


function DashboardLayout({
  language,
  name,
  email,
  role,
  title,
  eyebrow,
  stats,
  actions,
}: DashboardLayoutProps) {

  const dictionary =
    dashboardDictionary[language];

  const direction =
    getLanguageDirection(language);

  const locale =
    getLanguageLocale(language);

  const numberFormatter =
    new Intl.NumberFormat(locale);


  const actionIcons = [
    BarChart3,
    Users,
    ScanLine,
    UserCog,
    BarChart3,
    Settings,
  ];


  return (
    <main
      dir={direction}
      className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8"
    >

      <div className="mx-auto max-w-7xl">


        <section className="overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-xl">

          <p className="text-sm font-black text-cyan-300">
            {eyebrow}
          </p>


          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            {dictionary.welcome},{" "}
            <span>
              {name}
            </span>
          </h1>


          <p className="mt-3 text-slate-400">
            {title}
          </p>


          <div className="mt-5 flex flex-wrap gap-3">

            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
              {getRoleLabel(role, language)}
            </span>


            <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
              {email}
            </span>

          </div>

        </section>



        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

          {stats.map((stat, index)=>(
            <StatCard
              key={stat.label}
              stat={stat}
              formatter={numberFormatter}
              icon={actionIcons[index % actionIcons.length]}
            />
          ))}

        </section>



        <section className="mt-10">

          <div className="mb-5">

            <h2 className="text-2xl font-black text-slate-950">
              {dictionary.quickActions}
            </h2>


            <p className="mt-2 text-slate-500">
              {dictionary.quickActionsDescription}
            </p>

          </div>



          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {actions.map((action, index)=>{

              const Icon =
                actionIcons[index % actionIcons.length];


              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">

                      <Icon size={26}/>

                    </div>


                    <div>

                      <h3 className="text-lg font-black text-slate-950">
                        {action.title}
                      </h3>


                      <p className="mt-1 text-sm text-slate-500">
                        {action.description}
                      </p>

                    </div>

                  </div>

                </Link>
              );

            })}

          </div>

        </section>


      </div>

    </main>
  );
}





function StatCard({
  stat,
  formatter,
  icon: Icon,
}: {
  stat: DashboardStat;
  formatter: Intl.NumberFormat;
  icon: React.ElementType;
}) {

  const tones = {
    default: "bg-slate-950 text-white",
    emerald: "bg-emerald-50 text-emerald-950",
    violet: "bg-violet-50 text-violet-950",
    amber: "bg-amber-50 text-amber-950",
    cyan: "bg-cyan-50 text-cyan-950",
  };


  return (
    <article
      className={`rounded-3xl p-6 shadow-sm ring-1 ring-slate-200 ${
        tones[stat.tone ?? "default"]
      }`}
    >

      <div className="flex items-center justify-between">

        <p className="text-sm font-black opacity-70">
          {stat.label}
        </p>


        <Icon size={22}/>

      </div>


      <p className="mt-5 text-4xl font-black">
        {formatter.format(stat.value)}
      </p>


      {stat.description ? (
        <p className="mt-2 text-xs font-bold opacity-60">
          {stat.description}
        </p>
      ) : null}

    </article>
  );
}

function UnavailableAccount({
  language,
  message,
}: {
  language: AppLanguage;
  message: string;
}) {
  const dictionary =
    dashboardDictionary[language];

  return (
    <main
      dir={getLanguageDirection(
        language
      )}
      className="flex min-h-screen items-center justify-center bg-slate-100 p-6"
    >
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
          ⚠️
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          {
            dictionary.accountUnavailable
          }
        </h1>

        <p className="mt-3 leading-7 text-slate-500">
          {message}{" "}
          {
            dictionary.contactAdministrator
          }
        </p>

        <form
          action={
            logoutAction
          }
          className="mt-7"
        >
          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-7 py-3 font-black text-white"
          >
            {dictionary.signOut}
          </button>
        </form>
      </section>
    </main>
  );
}
