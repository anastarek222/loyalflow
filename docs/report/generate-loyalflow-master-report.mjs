import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'artifacts', 'loyalflow-master-report');
const mockupDir = path.join(out, 'mockups');
fs.mkdirSync(mockupDir, { recursive: true });

const BRAND = {
  purple: '#5B3DF5',
  purple2: '#7B61FF',
  navy: '#0D1738',
  ink: '#15213E',
  muted: '#64708B',
  soft: '#F5F3FF',
  border: '#E3E7F0',
  green: '#0F9F6E',
  amber: '#E28A16',
  red: '#D94B5B',
  white: '#FFFFFF',
};

const phases = [
  {
    id: 'P0',
    title: 'تثبيت المرجع وإغلاق العمل الحالي بأمان',
    status: 'الآن',
    importance: 'منع ضياع القرارات السابقة، وتثبيت نقطة بداية قابلة للقياس قبل فتح أي مسار جديد.',
    result: 'Main نظيف، تقرير مرجعي معتمد، والـPR الحالي مغلق باختبارات واضحة.',
    tasks: [
      ['P0.1', 'إعادة تشغيل Full Suite بعد آخر تعديل في فرع القواعد الاقتصادية', 'يثبت أن التغيير لم يضف أعطالًا جديدة', 'تقرير Tests محدث'],
      ['P0.2', 'مراجعة Diff للفرع feat/loyalty-economic-rules-safety', 'منع Scope creep أو تغييرات غير مقصودة', 'Diff Approved'],
      ['P0.3', 'Commit + PR + Vercel Preview + Merge', 'إغلاق العمل الحالي قبل الانتقال', 'Merge Commit'],
      ['P0.4', 'اعتماد هذا الـMaster Plan كمرجع وحيد', 'منع تضارب الرسائل والملفات القديمة', 'Decision Baseline'],
      ['P0.5', 'إنشاء Tracker للمراحل والـPRs', 'معرفة أين وصلنا وما المتبقي', 'Live Tracker'],
    ],
  },
  {
    id: 'P1',
    title: 'قواعد الولاء والسياسات المالية',
    status: 'الآن',
    importance: 'أي تصميم أو Feature مبني على قواعد غير محسومة سيؤدي إلى إعادة عمل ومخاطر مالية.',
    result: 'قواعد ولاء مكتوبة، قابلة للاختبار، ومفهومة في Visits وPoints وSales Amount.',
    tasks: [
      ['P1.1', 'اعتماد LOYALTY_ENGINE_SPEC وRULES_MATRIX رسميًا', 'تحويل Draft إلى مصدر حقيقة', 'Approved Product Rules'],
      ['P1.2', 'تعريف سياسة Refund الكامل والجزئي', 'حماية SALES_AMOUNT وPOINTS من التناقض', 'Refund Matrix'],
      ['P1.3', 'تعريف Cancellation / Void / Reversal', 'الحفاظ على Ledger append-only', 'Reversal Policy'],
      ['P1.4', 'تعريف حالة استخدام المكافأة قبل الـRefund', 'منع رصيد أو مكافأة غير منطقية', 'Compensation Rules'],
      ['P1.5', 'تعريف Expiry وThreshold وEarn changes', 'تحديد أثر القواعد الجديدة على المستقبل والتاريخ', 'Change Safety Rules'],
      ['P1.6', 'Worked Examples لكل Mode وحالة Edge', 'منع اختلاف التنفيذ بين الواجهة والـBackend', 'Golden Examples'],
    ],
  },
  {
    id: 'P2',
    title: 'سلامة الـLedger والعمليات الحرجة',
    status: 'الآن',
    importance: 'Earn وRedeem وAdjustment هي أكثر نقاط النظام حساسية؛ أي تكرار قد يسبب فسادًا ماليًا.',
    result: 'عمليات Idempotent، آمنة في التزامن، وقابلة للمصالحة مع قاعدة البيانات.',
    tasks: [
      ['P2.1', 'Durable idempotency للـRedeem', 'منع استبدال المكافأة مرتين', 'Retry-safe Redeem'],
      ['P2.2', 'Durable idempotency للـAdjustment', 'منع تكرار الخصم أو الإضافة اليدوية', 'Retry-safe Adjustment'],
      ['P2.3', 'Operation identity ثابت للـEarn عبر refresh/timeout', 'منع تكرار الزيارة أو البيع بعد شك المستخدم في النتيجة', 'Durable Earn Intent'],
      ['P2.4', 'Atomic claim للـRewardUnlock', 'منع استهلاك نفس الـUnlock مرتين', 'Guarded Unlock'],
      ['P2.5', 'ربط Redemption بLedger Transaction واحدة', 'إثبات تاريخ الاستبدال ومراجعته', 'One-to-one Integrity'],
      ['P2.6', 'Real PostgreSQL concurrency tests', 'اختبار السلوك الحقيقي وليس Mock فقط', 'DB Concurrency Evidence'],
      ['P2.7', 'Ledger reconciliation tool', 'مقارنة الرصيد والـLifetime totals مع الـLedger', 'Reconciliation Report'],
    ],
  },
  {
    id: 'P3',
    title: 'دورة الحساب والمصادقة',
    status: 'الآن',
    importance: 'لا يمكن بيع SaaS بدون استرجاع آمن للحساب وإدارة جلسات واضحة.',
    result: 'Owner وStaff يستطيعان الدخول والاسترجاع وإلغاء الجلسات بدون تدخل يدوي خطر.',
    tasks: [
      ['P3.1', 'Forgot Password request flow', 'بدء الاسترجاع برسالة لا تكشف وجود الحساب', 'Recovery Request'],
      ['P3.2', 'Reset token آمن ومشفر ومؤقت وSingle-use', 'منع الاستيلاء على الحساب', 'Secure Reset Token'],
      ['P3.3', 'Change Password + authVersion increment', 'إبطال الجلسات القديمة بعد تغيير حساس', 'Password Lifecycle'],
      ['P3.4', 'Logout All / Revoke Sessions', 'حماية الحساب عند فقد جهاز', 'Session Revocation'],
      ['P3.5', 'Persistent rate limiting', 'الحماية عبر أكثر من Instance', 'Distributed Abuse Guard'],
      ['P3.6', 'Invite lifecycle للـOwner والـStaff', 'عدم تفعيل مستخدم قبل قبول الدعوة', 'Invite State Machine'],
      ['P3.7', 'Email verification وSecurity notifications', 'إثبات ملكية البريد وإبلاغ المستخدم', 'Verified Identity'],
      ['P3.8', 'MFA policy للـSuper Admin', 'خفض خطر اختراق المنصة كاملة', 'Privileged MFA'],
    ],
  },
  {
    id: 'P4',
    title: 'قاعدة البيانات والاستعداد التشغيلي',
    status: 'الآن',
    importance: 'وجود Database قوية لا يكفي؛ يجب إثبات القدرة على النسخ والاسترجاع والتعامل مع الفشل.',
    result: 'بيانات قابلة للاسترجاع، Migrations آمنة، وبيئات منفصلة وواضحة.',
    tasks: [
      ['P4.1', 'تأكيد فصل Local / Test / Preview / Staging / Production', 'منع استخدام Production بالخطأ', 'Environment Matrix'],
      ['P4.2', 'Backup procedure موثق', 'إنشاء نسخة قبل العمليات عالية المخاطر', 'Backup Runbook'],
      ['P4.3', 'Restore drill على Database معزولة', 'إثبات أن الـBackup قابل للاستخدام', 'Restore Evidence'],
      ['P4.4', 'تعريف RPO / RTO واقعي', 'معرفة أقصى فقد ووقت توقف مقبول', 'Recovery Targets'],
      ['P4.5', 'Expand/Contract migration templates', 'تغيير الأعمدة بدون قطع الخدمة', 'Migration Playbook'],
      ['P4.6', 'Database constraints بعد Data audit', 'حماية non-negative totals وtenant relations', 'Invariant Constraints'],
      ['P4.7', 'Indexing بعد قياس Queries', 'تحسين الأداء بدون تكلفة كتابة غير لازمة', 'Measured Index Plan'],
      ['P4.8', 'Monitoring + incident + rollback runbooks', 'اكتشاف المشكلة قبل العميل والتصرف بسرعة', 'Operational Readiness'],
    ],
  },
  {
    id: 'P5',
    title: 'الفصل المعماري التدريجي',
    status: 'قريبًا',
    importance: 'تنظيم الكود ضروري، لكن الفصل الفيزيائي المبكر يضيف تكلفة بدون فائدة مباشرة.',
    result: 'Modular Monolith منظم، جاهز لفصل Web/API لاحقًا عند الحاجة.',
    tasks: [
      ['P5.1', 'تثبيت Domain boundaries', 'منع تداخل Auth وLoyalty وBilling وCRM', 'Domain Map'],
      ['P5.2', 'استخراج Pure domain policies', 'اختبار المنطق بعيدًا عن Prisma والواجهة', 'Domain Package'],
      ['P5.3', 'Typed contracts وDTOs', 'اتفاق واضح بين الواجهة والـBackend', 'Contracts Package'],
      ['P5.4', 'Validation package مشترك', 'منع اختلاف قواعد Client وServer', 'Validation Source'],
      ['P5.5', 'Read APIs أولًا', 'نقل منخفض المخاطر مع Parity', 'Read Boundary'],
      ['P5.6', 'Safe writes بعد الـReads', 'نقل الإعدادات والعملاء قبل الـLedger', 'Write Boundary'],
      ['P5.7', 'Critical writes أخيرًا', 'عدم المخاطرة بـEarn/Redeem قبل الأدلة', 'Ledger Boundary'],
      ['P5.8', 'Physical apps/web وapps/api بعد الاستقرار', 'تجنب Microservices مبكرًا', 'Scale Topology'],
    ],
  },
  {
    id: 'P6',
    title: 'الـUX واللغات والـDesign System',
    status: 'قريبًا',
    importance: 'توحيد التجربة يقلل الأخطاء ويجعل المنتج يبدو كمنصة واحدة لا صفحات منفصلة.',
    result: 'واجهة احترافية متسقة على Desktop وMobile وAR/EN.',
    tasks: [
      ['P6.1', 'Information Architecture حسب الدور', 'فصل Platform عن Business عن Staff', 'IA Map'],
      ['P6.2', 'Simple Mode وAdvanced Mode', 'عرض ما يحتاجه المستخدم بدون ازدحام', 'Experience Modes'],
      ['P6.3', 'Design tokens وComponent standards', 'منع اختلاف الأزرار والحقول والحالات', 'Design System'],
      ['P6.4', 'i18n catalogs منفصلة للعربي والإنجليزي', 'إنهاء النصوص المزدوجة داخل المكونات', 'Translation Catalogs'],
      ['P6.5', 'RTL/LTR logical layout', 'عرض صحيح للهاتف والإيميل والعملة والروابط', 'Bidi Compliance'],
      ['P6.6', 'Loading / Empty / Error / Success states', 'جعل المستخدم يعرف ماذا يحدث', 'State Library'],
      ['P6.7', 'Accessibility + keyboard + focus', 'دعم الاستخدام المهني والوصول', 'A11y Gate'],
      ['P6.8', 'Mobile-first operational flows', 'تسريع Scan وEarn وRedeem', 'Mobile Operations'],
    ],
  },
  {
    id: 'P7',
    title: 'الموقع الخارجي وتجربة المبيعات',
    status: 'قريبًا',
    importance: 'المشروع يجب أن يشرح نفسه ويبيع الخدمة؛ Login وحدها ليست Website.',
    result: 'موقع تسويقي كامل يقود الزائر إلى Demo أو Trial أو Login.',
    tasks: [
      ['P7.1', 'Home page', 'تعريف القيمة والـCTA خلال ثوانٍ', 'Launch Homepage'],
      ['P7.2', 'Features + How it works', 'شرح الاستخدام الحقيقي', 'Feature Story'],
      ['P7.3', 'Industries', 'إظهار ملاءمة المنتج للمجالات', 'Industry Pages'],
      ['P7.4', 'Pricing', 'توضيح الخطط بدون ادعاءات غير معتمدة', 'Pricing Experience'],
      ['P7.5', 'Security + FAQ', 'بناء الثقة والإجابة عن الاعتراضات', 'Trust Pages'],
      ['P7.6', 'About + Contact + Demo', 'تسهيل التواصل والمبيعات', 'Lead Flows'],
      ['P7.7', 'Login + Forgot Password ضمن نفس الهوية', 'تجربة متصلة بالموقع', 'Auth Experience'],
      ['P7.8', 'SEO + Analytics + performance', 'قياس الزيارات والتحويل', 'Marketing Measurement'],
    ],
  },
  {
    id: 'P8',
    title: 'إنشاء النشاط والتوصيات',
    status: 'قريبًا ثم توسع',
    importance: 'الـOnboarding يجب أن يحول نشاطًا جديدًا إلى برنامج جاهز بدون إعداد معقد.',
    result: 'Setup guided، قابل للاستكمال لاحقًا، مع Recommendations مناسبة للمجال.',
    tasks: [
      ['P8.1', 'Short sales-assisted wizard للـBeta', 'إطلاق أسرع مع دعم مباشر', 'Beta Wizard'],
      ['P8.2', 'Business info + industry + currency + timezone', 'تأسيس بيانات صحيحة من البداية', 'Business Foundation'],
      ['P8.3', 'Fixed reviewed presets لأول 4–6 مجالات', 'تقديم قيمة بدون بناء Engine ضخم مبكرًا', 'Preset Catalog V1'],
      ['P8.4', 'Choose recommendation / customize / start from scratch', 'منح المرونة لصاحب النشاط', 'Choice Flow'],
      ['P8.5', 'Loyalty + reward + branding + public card preview', 'رؤية النتيجة قبل التفعيل', 'Setup Preview'],
      ['P8.6', 'Save draft + resume + validation per step', 'عدم فقد تقدم المستخدم', 'Draft State'],
      ['P8.7', 'Dynamic industries/presets/versioning للـScale', 'إدارة Super Admin لاحقًا بدون كسر القديم', 'Recommendation Engine'],
    ],
  },
  {
    id: 'P9',
    title: 'تجارب المستخدمين حسب الدور',
    status: 'قريبًا',
    importance: 'صاحب النشاط والكاشير والعميل لا يحتاجون نفس المعلومات أو نفس كثافة الواجهة.',
    result: 'كل دور يرى أدواته الأساسية بوضوح وعلى Desktop وMobile.',
    tasks: [
      ['P9.1', 'Super Admin platform shell', 'فصل إدارة المنصة عن Business workspace', 'Platform Administration'],
      ['P9.2', 'Owner overview وKPI semantics', 'عرض أداء مفهوم ومفيد', 'Owner Dashboard'],
      ['P9.3', 'Cashier scan-first experience', 'تقليل خطوات الخدمة اليومية', 'Staff Operations'],
      ['P9.4', 'Customer profile sections/tabs', 'منع الصفحة الطويلة المزدحمة', 'Customer Workspace'],
      ['P9.5', 'Program workspace', 'إدارة القواعد والمكافآت والتأثير', 'Programme UX'],
      ['P9.6', 'Public customer card', 'كارت سريع وآمن ومريح للموبايل', 'Customer Experience'],
      ['P9.7', 'Reports وExports', 'قرارات واضحة مع Unit وDate range', 'Reporting UX'],
      ['P9.8', 'Permissions وPlan entitlements في الواجهة والسيرفر', 'منع أزرار أو Actions غير مسموحة', 'Role Parity'],
    ],
  },
  {
    id: 'P10',
    title: 'الجودة والـStaging والـClosed Beta',
    status: 'قبل البيع العام',
    importance: 'الـBeta تكشف مشاكل التشغيل الحقيقي قبل فتح الخدمة للجميع.',
    result: '5–10 أنشطة تعمل على نسخة مستقرة بدعم مباشر ومخاطر محدودة.',
    tasks: [
      ['P10.1', 'Playwright journeys للأدوار الحرجة', 'اختبار End-to-end وليس وحدات فقط', 'E2E Matrix'],
      ['P10.2', 'Tenant/role security tests', 'منع تسريب البيانات بين الأنشطة', 'Security Evidence'],
      ['P10.3', 'Performance budgets', 'حماية Home/Login/Card/Scan من البطء', 'Performance Gate'],
      ['P10.4', 'Staging deployment rehearsal', 'اختبار الـRelease قبل Production', 'Staging Evidence'],
      ['P10.5', 'Backup/restore before beta', 'استرداد البيانات عند فشل', 'Recovery Evidence'],
      ['P10.6', 'Invite-only 5–10 businesses', 'تجربة واقعية تحت السيطرة', 'Closed Beta'],
      ['P10.7', 'Manual billing and direct support', 'اختبار المبيعات قبل Automation مكلفة', 'Commercial Proof'],
      ['P10.8', 'Beta exit criteria', 'عدم الانتقال مع P0/P1 مفتوحة', 'Go/No-Go Decision'],
    ],
  },
  {
    id: 'P11',
    title: 'التجهيز للإطلاق العام',
    status: 'قبل Public Launch',
    importance: 'الإطلاق العام يحتاج دورات حساب وبيانات ودفع وثقة لا تعتمد على التدخل اليدوي.',
    result: 'منصة قابلة للبيع العام مع دعم وتشغيل وقواعد قانونية واضحة.',
    tasks: [
      ['P11.1', 'Transactional email provider production-ready', 'Verification وInvites وRecovery موثوقة', 'Email Delivery'],
      ['P11.2', 'Self-signup + email verification', 'فتح التسجيل بدون دعم يدوي', 'Public Signup'],
      ['P11.3', 'Legal pages and data lifecycle', 'توضيح الملكية والحذف والاحتفاظ', 'Trust & Compliance'],
      ['P11.4', 'Automated backups and external alerts', 'تشغيل قابل للمراقبة', 'Operations Automation'],
      ['P11.5', 'Subscription lifecycle specification', 'تعريف Trial/Grace/Suspend/Cancel', 'Billing Domain'],
      ['P11.6', 'Payment gateway only after policy approval', 'منع Automation مبكرة أو خاطئة', 'Payment Integration'],
      ['P11.7', 'Final release gate and rollback rehearsal', 'قرار إطلاق مبني على دليل', 'Public Launch'],
    ],
  },
  {
    id: 'P12',
    title: 'التوسع بعد إثبات المنتج',
    status: 'لاحقًا',
    importance: 'هذه الميزات مفيدة عند وجود عملاء وحجم استخدام، لكنها لا يجب أن تؤخر الإطلاق الأساسي.',
    result: 'توسع محسوب حسب البيانات والطلب الحقيقي.',
    tasks: [
      ['P12.1', 'Dynamic Industry & Preset administration', 'توسيع المجالات من Super Admin', 'Preset Platform'],
      ['P12.2', 'Full multi-role 10-step wizard', 'Onboarding ذاتي أكثر تقدمًا', 'Unified Wizard'],
      ['P12.3', 'Background queue / workers / Redis', 'معالجة الحملات والتكاملات عند زيادة الحجم', 'Async Platform'],
      ['P12.4', 'API keys + Webhooks + POS', 'فتح التكاملات الخارجية', 'Integration Platform'],
      ['P12.5', 'Wallet / Tiers / Referral rewards / Hybrid loyalty', 'إضافة استراتيجيات متقدمة بعد ثبات V1', 'Advanced Loyalty'],
      ['P12.6', 'Physical apps/web + apps/api deployment split', 'توسيع مستقل عندما تبرره العمليات', 'Service Split'],
      ['P12.7', 'Paid infrastructure only when justified', 'ضبط التكلفة حسب الاستخدام', 'Sustainable Scale'],
    ],
  },
];

const evidence = [
  'Repository: anastarek222/loyalflow',
  'Stack: Next.js 16, React 19, TypeScript, Tailwind 4, NextAuth v5 beta, Zod, Prisma 7, PostgreSQL/Neon',
  'Merged checkpoint: PR #9 — programme rule audit metadata; merge commit 5239181',
  'Active local work: feat/loyalty-economic-rules-safety; focused tests 24/24; typecheck/lint green; no Prisma change',
  'Previous full-suite baseline: 561 total, 558 pass, 3 documented baseline failures',
  'Planning sources: A-to-Z Transformation Plan, Total Launch Plan, modernization reports, loyalty/database audits, latest user requirements',
];

const tracks = [
  {
    name: 'Frontend & UX',
    goal: 'واجهة احترافية، سريعة، واضحة لكل دور وعلى Desktop وMobile.',
    items: ['Public website كامل', 'Role-based navigation', 'Design System موحد', 'AR/EN + RTL/LTR', 'Mobile scan operations', 'Loading/Empty/Error/Success', 'Accessibility', 'Performance budgets'],
  },
  {
    name: 'Backend & Domain',
    goal: 'مصدر حقيقة واحد للمنطق والصلاحيات والعمليات الحرجة.',
    items: ['Auth lifecycle', 'Tenant isolation', 'Domain policies', 'Typed contracts', 'Earn/Redeem/Adjust/Reverse', 'Audit metadata', 'Plan entitlements', 'Integration state'],
  },
  {
    name: 'Database',
    goal: 'بيانات آمنة، Migrations قابلة للتطوير، واسترجاع مثبت.',
    items: ['PostgreSQL portability', 'Forward-only migrations', 'Expand/Contract', 'Ledger integrity', 'Composite tenant FKs', 'Measured indexes', 'Backup/Restore', 'Staging evidence'],
  },
  {
    name: 'Quality & Operations',
    goal: 'إطلاق يمكن مراقبته واختباره والتراجع عنه بأمان.',
    items: ['Unit/contract tests', 'Real DB tests', 'Playwright E2E', 'Security tests', 'Logs/alerts', 'Incident runbook', 'Release gates', 'Closed Beta evidence'],
  },
];

const toolRows = [
  ['ChatGPT', 'تحليل المنتج، دمج المتطلبات، Specs، UX، مراجعة', 'يستخدم للتخطيط والمراجعة؛ لا يعتبر دليل تنفيذ'],
  ['Codex CLI الرسمي', 'تعديلات الكود وقراءة الـRepo وتشغيل الاختبارات', 'Task صغير في Branch مستقل'],
  ['GitHub', 'Source of truth، PRs، CI، history', 'لا Runtime change بدون PR'],
  ['Figma Starter', 'Design source of truth للشاشات الأساسية', 'عدد ملفات قليل ومنظم'],
  ['Google Stitch / v0', 'Exploration وisolated UI prototypes', 'بعد اعتماد الـSpec؛ ليست Backend truth'],
  ['Base UI + shadcn', 'Component foundation', 'لا نضيف UI framework منافس'],
  ['Playwright + Lighthouse', 'E2E وPerformance/A11y', 'Critical journeys قبل الإطلاق'],
  ['Neon PostgreSQL', 'Database provider أولي', 'PostgreSQL portability + backup evidence'],
  ['Vercel Preview', 'Branch previews', 'الاستضافة التجارية النهائية تُراجع قبل البيع العام'],
  ['Free models / FreeLLMAPI', 'Brainstorming أو مراجعة ثانوية', 'ممنوعة كمنفذ نهائي لـAuth/DB/Ledger'],
];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function svgFrame(title, subtitle, desktop, phone, footerLabel) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FBFAFF"/><stop offset="1" stop-color="#F0F3FF"/></linearGradient>
    <linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6B48FF"/><stop offset="1" stop-color="#3E28D8"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#17224D" flood-opacity="0.14"/></filter>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <circle cx="1450" cy="80" r="260" fill="#EAE5FF" opacity="0.65"/>
  <circle cx="160" cy="820" r="260" fill="#EAF0FF" opacity="0.75"/>
  <g font-family="Arial, Noto Sans Arabic, sans-serif">
    <g transform="translate(60,46)">
      <path d="M0 34 L20 0 L39 12 L19 46 Z" fill="#6745F5"/><circle cx="47" cy="34" r="10" fill="#4C32D6"/>
      <text x="72" y="35" font-size="34" font-weight="700" fill="#0D1738">LoyalFlow</text>
    </g>
    <text x="800" y="72" text-anchor="middle" font-size="34" font-weight="800" fill="#0D1738">${esc(title)}</text>
    <text x="800" y="112" text-anchor="middle" font-size="18" fill="#66708A">${esc(subtitle)}</text>
    <g filter="url(#shadow)">${desktop}</g>
    <g filter="url(#shadow)">${phone}</g>
    <rect x="60" y="842" width="1480" height="1" fill="#DCE1ED"/>
    <text x="80" y="874" font-size="18" fill="#64708B">${esc(footerLabel)}</text>
    <text x="1520" y="874" text-anchor="end" font-size="18" fill="#5B3DF5">Desktop + Mobile Simulation</text>
  </g>
</svg>`;
}

function homeSvg() {
  const desktop = `
  <g transform="translate(70,145)">
    <rect width="1180" height="635" rx="24" fill="#FFFFFF"/>
    <rect width="1180" height="62" rx="24" fill="#FFFFFF"/><rect y="61" width="1180" height="1" fill="#E5E8F0"/>
    <text x="28" y="39" font-size="22" font-weight="700" fill="#0D1738">LoyalFlow</text>
    <text x="470" y="39" font-size="15" fill="#5B3DF5">Home</text><text x="535" y="39" font-size="15" fill="#28334F">Features</text><text x="620" y="39" font-size="15" fill="#28334F">Industries</text><text x="710" y="39" font-size="15" fill="#28334F">Pricing</text><text x="780" y="39" font-size="15" fill="#28334F">About</text>
    <rect x="938" y="17" width="82" height="30" rx="8" fill="#FFFFFF" stroke="#C9CFDF"/><text x="979" y="38" text-anchor="middle" font-size="14" fill="#17213B">Login</text>
    <rect x="1032" y="13" width="126" height="38" rx="10" fill="url(#p)"/><text x="1095" y="38" text-anchor="middle" font-size="14" font-weight="700" fill="#FFFFFF">Start Free Trial</text>
    <text x="60" y="165" font-size="49" font-weight="800" fill="#0D1738">Build loyalty that</text><text x="60" y="220" font-size="49" font-weight="800" fill="#0D1738">lasts. Digitally.</text>
    <text x="60" y="270" font-size="19" fill="#59647E">Launch, manage and grow digital loyalty programmes</text><text x="60" y="300" font-size="19" fill="#59647E">that keep customers coming back.</text>
    <rect x="60" y="335" width="160" height="48" rx="12" fill="url(#p)"/><text x="140" y="366" text-anchor="middle" font-size="16" font-weight="700" fill="#FFFFFF">Start Free Trial</text>
    <rect x="235" y="335" width="140" height="48" rx="12" fill="#FFFFFF" stroke="#C9CFDF"/><text x="305" y="366" text-anchor="middle" font-size="16" fill="#16203B">Book a Demo</text>
    <g transform="translate(480,105)"><rect width="630" height="340" rx="18" fill="#FAFBFF" stroke="#DCE1EC"/>
      <rect width="130" height="340" rx="18" fill="#101B46"/><text x="20" y="38" font-size="16" font-weight="700" fill="#FFFFFF">Dashboard</text>
      <rect x="14" y="60" width="102" height="34" rx="8" fill="#5B3DF5"/><text x="30" y="82" font-size="12" fill="#FFFFFF">Overview</text>
      <text x="28" y="123" font-size="12" fill="#CFD6F3">Customers</text><text x="28" y="158" font-size="12" fill="#CFD6F3">Programs</text><text x="28" y="193" font-size="12" fill="#CFD6F3">Rewards</text><text x="28" y="228" font-size="12" fill="#CFD6F3">Reports</text>
      <g transform="translate(154,28)"><text x="0" y="0" font-size="20" font-weight="700" fill="#15213E">Overview</text>
        <g transform="translate(0,24)"><rect width="108" height="68" rx="10" fill="#FFFFFF" stroke="#E0E4EE"/><text x="12" y="23" font-size="10" fill="#66708A">Members</text><text x="12" y="50" font-size="22" font-weight="700" fill="#101A38">12,845</text></g>
        <g transform="translate(120,24)"><rect width="108" height="68" rx="10" fill="#FFFFFF" stroke="#E0E4EE"/><text x="12" y="23" font-size="10" fill="#66708A">Active</text><text x="12" y="50" font-size="22" font-weight="700" fill="#101A38">7,842</text></g>
        <g transform="translate(240,24)"><rect width="108" height="68" rx="10" fill="#FFFFFF" stroke="#E0E4EE"/><text x="12" y="23" font-size="10" fill="#66708A">Transactions</text><text x="12" y="50" font-size="22" font-weight="700" fill="#101A38">24,560</text></g>
        <g transform="translate(360,24)"><rect width="108" height="68" rx="10" fill="#FFFFFF" stroke="#E0E4EE"/><text x="12" y="23" font-size="10" fill="#66708A">Points</text><text x="12" y="50" font-size="22" font-weight="700" fill="#101A38">98,765</text></g>
        <rect x="0" y="110" width="300" height="170" rx="12" fill="#FFFFFF" stroke="#E0E4EE"/><text x="18" y="138" font-size="13" font-weight="700" fill="#16213F">Member Growth</text><path d="M24 245 C70 220 85 230 125 198 S190 178 225 150 S258 138 280 126" fill="none" stroke="#5B3DF5" stroke-width="4"/><path d="M24 245 C70 220 85 230 125 198 S190 178 225 150 S258 138 280 126 L280 260 L24 260 Z" fill="#E7E1FF" opacity="0.7"/>
        <rect x="314" y="110" width="154" height="170" rx="12" fill="#FFFFFF" stroke="#E0E4EE"/><text x="330" y="138" font-size="13" font-weight="700" fill="#16213F">Top Rewards</text><text x="330" y="170" font-size="11" fill="#59647E">Free Coffee</text><text x="440" y="170" text-anchor="end" font-size="11" fill="#15213E">2,450</text><text x="330" y="198" font-size="11" fill="#59647E">20% Discount</text><text x="440" y="198" text-anchor="end" font-size="11" fill="#15213E">1,842</text><text x="330" y="226" font-size="11" fill="#59647E">Free Pastry</text><text x="440" y="226" text-anchor="end" font-size="11" fill="#15213E">650</text>
      </g>
    </g>
    <g transform="translate(60,470)"><text x="0" y="0" font-size="17" font-weight="700" fill="#15213E">How it works</text>
      <g transform="translate(0,24)"><rect width="240" height="92" rx="12" fill="#F8F7FF"/><text x="18" y="30" font-size="14" font-weight="700" fill="#5B3DF5">1. Create your programme</text><text x="18" y="58" font-size="12" fill="#66708A">Choose visits, points or spend.</text></g>
      <g transform="translate(255,24)"><rect width="240" height="92" rx="12" fill="#F8F7FF"/><text x="18" y="30" font-size="14" font-weight="700" fill="#5B3DF5">2. Engage customers</text><text x="18" y="58" font-size="12" fill="#66708A">Join, scan and earn.</text></g>
      <g transform="translate(510,24)"><rect width="240" height="92" rx="12" fill="#F8F7FF"/><text x="18" y="30" font-size="14" font-weight="700" fill="#5B3DF5">3. Reward & retain</text><text x="18" y="58" font-size="12" fill="#66708A">Make progress visible.</text></g>
      <g transform="translate(765,24)"><rect width="240" height="92" rx="12" fill="#F8F7FF"/><text x="18" y="30" font-size="14" font-weight="700" fill="#5B3DF5">4. Track & grow</text><text x="18" y="58" font-size="12" fill="#66708A">Understand repeat behaviour.</text></g>
    </g>
  </g>`;
  const phone = `<g transform="translate(1300,190)"><rect width="238" height="520" rx="42" fill="#111827"/><rect x="10" y="10" width="218" height="500" rx="34" fill="#FFFFFF"/><rect x="80" y="20" width="78" height="20" rx="10" fill="#111827"/><text x="28" y="75" font-size="18" font-weight="700" fill="#5B3DF5">LoyalFlow</text><text x="28" y="142" font-size="30" font-weight="800" fill="#0D1738">Build loyalty</text><text x="28" y="178" font-size="30" font-weight="800" fill="#0D1738">that lasts.</text><text x="28" y="214" font-size="30" font-weight="800" fill="#0D1738">Digitally.</text><text x="28" y="255" font-size="13" fill="#66708A">Digital loyalty programmes</text><text x="28" y="276" font-size="13" fill="#66708A">for modern businesses.</text><rect x="28" y="310" width="182" height="48" rx="12" fill="url(#p)"/><text x="119" y="340" text-anchor="middle" font-size="15" font-weight="700" fill="#FFFFFF">Start Free Trial</text><rect x="28" y="372" width="182" height="48" rx="12" fill="#FFFFFF" stroke="#BFC7DA"/><text x="119" y="402" text-anchor="middle" font-size="15" fill="#15213E">Book a Demo</text><circle cx="42" cy="455" r="8" fill="#E9E4FF"/><text x="58" y="460" font-size="11" fill="#66708A">Quick setup in minutes</text><circle cx="42" cy="482" r="8" fill="#E9E4FF"/><text x="58" y="487" font-size="11" fill="#66708A">No credit card required</text></g>`;
  return svgFrame('Public Marketing Website', 'موقع كامل للتسويق والبيع — وليس صفحة Login فقط', desktop, phone, 'Concept 01 — Home / Visitor Experience');
}

function loginSvg() {
  const desktop = `<g transform="translate(80,155)"><rect width="1160" height="610" rx="26" fill="#FFFFFF"/>
    <g transform="translate(55,55)"><text x="0" y="0" font-size="17" fill="#5B3DF5">The all-in-one loyalty platform</text><text x="0" y="75" font-size="50" font-weight="800" fill="#0D1738">Welcome to LoyalFlow</text><text x="0" y="118" font-size="19" fill="#66708A">Build loyalty that lasts. Digitally.</text>
      <g transform="translate(0,165)"><rect width="470" height="270" rx="18" fill="#F6F5FF" stroke="#E1DEFA"/><rect width="100" height="270" rx="18" fill="#101B46"/><rect x="12" y="48" width="76" height="34" rx="8" fill="#5B3DF5"/><text x="24" y="70" font-size="11" fill="#FFF">Overview</text><text x="20" y="115" font-size="11" fill="#CCD3EF">Customers</text><text x="20" y="148" font-size="11" fill="#CCD3EF">Programs</text><text x="20" y="181" font-size="11" fill="#CCD3EF">Reports</text><g transform="translate(122,35)"><rect width="90" height="58" rx="10" fill="#FFF"/><text x="12" y="20" font-size="9" fill="#66708A">Members</text><text x="12" y="43" font-size="19" font-weight="700" fill="#15213E">12,845</text><rect x="104" width="90" height="58" rx="10" fill="#FFF"/><text x="116" y="20" font-size="9" fill="#66708A">Active</text><text x="116" y="43" font-size="19" font-weight="700" fill="#15213E">7,842</text><rect x="0" y="78" width="298" height="125" rx="12" fill="#FFF"/><path d="M20 180 C65 150 85 166 120 132 S180 116 215 90 S260 82 282 65" fill="none" stroke="#5B3DF5" stroke-width="4"/></g></g>
    </g>
    <g transform="translate(635,55)"><rect width="460" height="500" rx="22" fill="#FFFFFF" stroke="#DDE2ED"/><text x="42" y="72" font-size="36" font-weight="800" fill="#0D1738">Welcome back 👋</text><text x="42" y="108" font-size="16" fill="#66708A">Sign in to your LoyalFlow account</text><text x="42" y="160" font-size="14" font-weight="700" fill="#15213E">Email address</text><rect x="42" y="178" width="376" height="54" rx="12" fill="#FBFCFF" stroke="#CCD3E0"/><text x="62" y="211" font-size="14" fill="#9099AD">you@business.com</text><text x="42" y="270" font-size="14" font-weight="700" fill="#15213E">Password</text><rect x="42" y="288" width="376" height="54" rx="12" fill="#FBFCFF" stroke="#CCD3E0"/><text x="62" y="321" font-size="14" fill="#9099AD">Enter your password</text><rect x="42" y="365" width="376" height="52" rx="12" fill="url(#p)"/><text x="230" y="397" text-anchor="middle" font-size="16" font-weight="700" fill="#FFF">Sign In</text><text x="42" y="447" font-size="13" fill="#66708A">Remember me</text><text x="418" y="447" text-anchor="end" font-size="13" fill="#5B3DF5">Forgot password?</text></g>
  </g>`;
  const phone = `<g transform="translate(1300,190)"><rect width="238" height="520" rx="42" fill="#111827"/><rect x="10" y="10" width="218" height="500" rx="34" fill="#FFFFFF"/><rect x="80" y="20" width="78" height="20" rx="10" fill="#111827"/><text x="26" y="72" font-size="18" font-weight="700" fill="#5B3DF5">LoyalFlow</text><text x="26" y="128" font-size="27" font-weight="800" fill="#0D1738">Welcome back 👋</text><text x="26" y="155" font-size="12" fill="#66708A">Sign in to your account</text><text x="26" y="205" font-size="12" font-weight="700" fill="#15213E">Email address</text><rect x="26" y="218" width="186" height="46" rx="10" fill="#FBFCFF" stroke="#CCD3E0"/><text x="40" y="247" font-size="11" fill="#9099AD">you@business.com</text><text x="26" y="300" font-size="12" font-weight="700" fill="#15213E">Password</text><rect x="26" y="313" width="186" height="46" rx="10" fill="#FBFCFF" stroke="#CCD3E0"/><text x="40" y="342" font-size="11" fill="#9099AD">••••••••</text><text x="212" y="390" text-anchor="end" font-size="11" fill="#5B3DF5">Forgot password?</text><rect x="26" y="412" width="186" height="48" rx="12" fill="url(#p)"/><text x="119" y="442" text-anchor="middle" font-size="15" font-weight="700" fill="#FFF">Sign In</text><text x="119" y="490" text-anchor="middle" font-size="11" fill="#66708A">Back to Website</text></g>`;
  return svgFrame('Login & Account Recovery', 'صفحة دخول احترافية ضمن نفس الموقع والهوية', desktop, phone, 'Concept 02 — Login / Forgot Password');
}

function superAdminSvg() {
  const desktop = `<g transform="translate(60,145)"><rect width="1210" height="650" rx="24" fill="#FFFFFF"/><rect width="200" height="650" rx="24" fill="#0E1944"/><text x="26" y="46" font-size="22" font-weight="700" fill="#FFF">LoyalFlow</text><rect x="18" y="82" width="164" height="42" rx="10" fill="#5B3DF5"/><text x="38" y="108" font-size="14" fill="#FFF">Platform Overview</text><text x="38" y="162" font-size="14" fill="#D5DAF3">Businesses</text><text x="38" y="204" font-size="14" fill="#D5DAF3">Owners</text><text x="38" y="246" font-size="14" fill="#D5DAF3">Plans & Billing</text><text x="38" y="288" font-size="14" fill="#D5DAF3">Operations</text><text x="38" y="330" font-size="14" fill="#D5DAF3">Industries & Presets</text><text x="38" y="372" font-size="14" fill="#D5DAF3">System Health</text><text x="38" y="414" font-size="14" fill="#D5DAF3">Settings</text>
    <g transform="translate(230,36)"><text x="0" y="0" font-size="16" fill="#5B3DF5">Super Admin</text><text x="0" y="40" font-size="32" font-weight="800" fill="#0D1738">Platform Administration</text><text x="0" y="66" font-size="14" fill="#66708A">Monitor, manage and grow the LoyalFlow platform.</text>
      <g transform="translate(0,95)"><rect width="150" height="95" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="18" y="28" font-size="11" fill="#66708A">Total Businesses</text><text x="18" y="63" font-size="27" font-weight="700" fill="#15213E">12,845</text><text x="18" y="84" font-size="10" fill="#0F9F6E">↑ 18.4%</text><rect x="165" width="150" height="95" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="183" y="28" font-size="11" fill="#66708A">Active Owners</text><text x="183" y="63" font-size="27" font-weight="700" fill="#15213E">7,842</text><text x="183" y="84" font-size="10" fill="#0F9F6E">↑ 16.2%</text><rect x="330" width="180" height="95" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="348" y="28" font-size="11" fill="#66708A">Monthly Active Customers</text><text x="348" y="63" font-size="27" font-weight="700" fill="#15213E">98,765</text><text x="348" y="84" font-size="10" fill="#0F9F6E">↑ 22.8%</text><rect x="525" width="160" height="95" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="543" y="28" font-size="11" fill="#66708A">Subscription Health</text><text x="543" y="63" font-size="27" font-weight="700" fill="#15213E">98.76%</text><text x="543" y="84" font-size="10" fill="#0F9F6E">Healthy</text><rect x="700" width="150" height="95" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="718" y="28" font-size="11" fill="#66708A">Open Issues</text><text x="718" y="63" font-size="27" font-weight="700" fill="#15213E">24</text><text x="718" y="84" font-size="10" fill="#D94B5B">Needs review</text></g>
      <g transform="translate(0,210)"><rect width="520" height="190" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="18" y="30" font-size="15" font-weight="700" fill="#15213E">Recent Businesses</text><text x="18" y="62" font-size="11" fill="#66708A">Business</text><text x="240" y="62" font-size="11" fill="#66708A">Owner</text><text x="365" y="62" font-size="11" fill="#66708A">Plan</text><text x="445" y="62" font-size="11" fill="#66708A">Status</text><line x1="18" y1="72" x2="500" y2="72" stroke="#E4E7EF"/><text x="18" y="100" font-size="12" fill="#15213E">Urban Grind Café</text><text x="240" y="100" font-size="12" fill="#59647E">Sarah Johnson</text><text x="365" y="100" font-size="12" fill="#59647E">Growth</text><text x="445" y="100" font-size="12" fill="#0F9F6E">Active</text><text x="18" y="132" font-size="12" fill="#15213E">FitLife Studio</text><text x="240" y="132" font-size="12" fill="#59647E">Ahmed Ali</text><text x="365" y="132" font-size="12" fill="#59647E">Pro</text><text x="445" y="132" font-size="12" fill="#0F9F6E">Active</text><text x="18" y="164" font-size="12" fill="#15213E">Bella Salon</text><text x="240" y="164" font-size="12" fill="#59647E">Maya Haddad</text><text x="365" y="164" font-size="12" fill="#59647E">Growth</text><text x="445" y="164" font-size="12" fill="#0F9F6E">Active</text>
        <rect x="535" width="315" height="190" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="553" y="30" font-size="15" font-weight="700" fill="#15213E">Platform Alerts</text><circle cx="558" cy="68" r="5" fill="#D94B5B"/><text x="574" y="72" font-size="12" fill="#15213E">High error rate detected</text><circle cx="558" cy="104" r="5" fill="#E28A16"/><text x="574" y="108" font-size="12" fill="#15213E">Payment gateway latency</text><circle cx="558" cy="140" r="5" fill="#5B3DF5"/><text x="574" y="144" font-size="12" fill="#15213E">Business approval pending</text></g>
      <g transform="translate(0,420)"><rect width="410" height="145" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="18" y="30" font-size="15" font-weight="700" fill="#15213E">Platform Usage</text><path d="M25 120 C70 110 90 118 130 90 S200 84 240 60 S320 56 380 35" fill="none" stroke="#5B3DF5" stroke-width="4"/><path d="M25 120 C70 110 90 118 130 90 S200 84 240 60 S320 56 380 35 L380 130 L25 130 Z" fill="#E8E3FF"/><rect x="425" width="425" height="145" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="443" y="30" font-size="15" font-weight="700" fill="#15213E">System Status</text><text x="443" y="65" font-size="12" fill="#59647E">Web Application</text><text x="820" y="65" text-anchor="end" font-size="12" fill="#0F9F6E">Operational</text><text x="443" y="92" font-size="12" fill="#59647E">Database</text><text x="820" y="92" text-anchor="end" font-size="12" fill="#0F9F6E">Operational</text><text x="443" y="119" font-size="12" fill="#59647E">Email Service</text><text x="820" y="119" text-anchor="end" font-size="12" fill="#E28A16">Setup pending</text></g>
    </g>
  </g>`;
  const phone = `<g transform="translate(1315,195)"><rect width="220" height="520" rx="42" fill="#111827"/><rect x="10" y="10" width="200" height="500" rx="34" fill="#FFFFFF"/><rect x="70" y="20" width="80" height="20" rx="10" fill="#111827"/><text x="24" y="72" font-size="18" font-weight="700" fill="#5B3DF5">LoyalFlow</text><text x="24" y="112" font-size="13" fill="#66708A">Platform Overview</text><text x="24" y="145" font-size="22" font-weight="800" fill="#0D1738">Good morning</text><g transform="translate(20,175)"><rect width="180" height="70" rx="12" fill="#F8F7FF"/><text x="16" y="24" font-size="11" fill="#66708A">Total Businesses</text><text x="16" y="52" font-size="24" font-weight="700" fill="#15213E">12,845</text><rect y="82" width="180" height="70" rx="12" fill="#F8F7FF"/><text x="16" y="106" font-size="11" fill="#66708A">Active Owners</text><text x="16" y="134" font-size="24" font-weight="700" fill="#15213E">7,842</text><rect y="164" width="180" height="70" rx="12" fill="#FFF4F2"/><text x="16" y="188" font-size="11" fill="#66708A">Open Issues</text><text x="16" y="216" font-size="24" font-weight="700" fill="#D94B5B">24</text><text x="0" y="276" font-size="14" font-weight="700" fill="#15213E">Recent Alerts</text><circle cx="8" cy="306" r="5" fill="#D94B5B"/><text x="22" y="310" font-size="11" fill="#59647E">High error rate</text><circle cx="8" cy="340" r="5" fill="#E28A16"/><text x="22" y="344" font-size="11" fill="#59647E">Payment latency</text></g></g>`;
  return svgFrame('Super Admin — Platform Administration', 'إدارة المنصة والمالكين والخطط والصحة التشغيلية', desktop, phone, 'Concept 03 — Super Admin Dashboard');
}

function ownerSvg() {
  const desktop = `<g transform="translate(60,145)"><rect width="1210" height="650" rx="24" fill="#FFFFFF"/><rect width="200" height="650" rx="24" fill="#0E1944"/><text x="26" y="42" font-size="21" font-weight="700" fill="#FFF">LoyalFlow</text><rect x="18" y="75" width="164" height="60" rx="12" fill="#1A2857"/><text x="34" y="101" font-size="14" fill="#FFF">Brewed Awakenings</text><text x="34" y="122" font-size="11" fill="#C7CDE7">Coffee & Bakery</text><rect x="18" y="155" width="164" height="42" rx="10" fill="#5B3DF5"/><text x="40" y="182" font-size="14" fill="#FFF">Overview</text><text x="40" y="235" font-size="14" fill="#D5DAF3">Customers</text><text x="40" y="277" font-size="14" fill="#D5DAF3">Scan</text><text x="40" y="319" font-size="14" fill="#D5DAF3">Loyalty Program</text><text x="40" y="361" font-size="14" fill="#D5DAF3">Growth</text><text x="40" y="403" font-size="14" fill="#D5DAF3">Reports</text><text x="40" y="445" font-size="14" fill="#D5DAF3">Team</text><text x="40" y="487" font-size="14" fill="#D5DAF3">Branches</text><text x="40" y="529" font-size="14" fill="#D5DAF3">Settings</text>
    <g transform="translate(230,40)"><text x="0" y="0" font-size="29" font-weight="800" fill="#0D1738">Welcome back, Sarah 👋</text><text x="0" y="30" font-size="14" fill="#66708A">Here’s what’s happening at Brewed Awakenings today.</text>
      <g transform="translate(0,65)"><rect width="132" height="88" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="16" y="25" font-size="10" fill="#66708A">Active Members</text><text x="16" y="58" font-size="26" font-weight="700" fill="#15213E">12,845</text><text x="16" y="78" font-size="9" fill="#0F9F6E">↑ 18.6%</text><rect x="145" width="132" height="88" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="161" y="25" font-size="10" fill="#66708A">Repeat Visits</text><text x="161" y="58" font-size="26" font-weight="700" fill="#15213E">7,642</text><text x="161" y="78" font-size="9" fill="#0F9F6E">↑ 21.3%</text><rect x="290" width="132" height="88" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="306" y="25" font-size="10" fill="#66708A">Issued Rewards</text><text x="306" y="58" font-size="26" font-weight="700" fill="#15213E">2,480</text><rect x="435" width="132" height="88" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="451" y="25" font-size="10" fill="#66708A">Redeem Rate</text><text x="451" y="58" font-size="26" font-weight="700" fill="#15213E">28.4%</text><rect x="580" width="132" height="88" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="596" y="25" font-size="10" fill="#66708A">Loyalty Revenue</text><text x="596" y="58" font-size="26" font-weight="700" fill="#15213E">$48,765</text><rect x="725" width="132" height="88" rx="14" fill="#FAFBFF" stroke="#DFE3EC"/><text x="741" y="25" font-size="10" fill="#66708A">Customer Growth</text><text x="741" y="58" font-size="26" font-weight="700" fill="#15213E">+1,243</text></g>
      <g transform="translate(0,175)"><rect width="510" height="230" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="18" y="32" font-size="15" font-weight="700" fill="#15213E">Member Growth</text><path d="M24 190 C75 160 92 170 135 135 S205 122 250 96 S330 82 390 55 S450 50 485 36" fill="none" stroke="#5B3DF5" stroke-width="4"/><path d="M24 190 C75 160 92 170 135 135 S205 122 250 96 S330 82 390 55 S450 50 485 36 L485 205 L24 205 Z" fill="#E7E2FF"/>
        <rect x="525" width="332" height="230" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="543" y="32" font-size="15" font-weight="700" fill="#15213E">Recent Customer Activity</text><text x="543" y="72" font-size="12" fill="#15213E">Emily Carter</text><text x="740" y="72" font-size="11" fill="#0F9F6E">+50 pts</text><text x="543" y="105" font-size="12" fill="#15213E">Daniel Kim</text><text x="740" y="105" font-size="11" fill="#5B3DF5">-100 pts</text><text x="543" y="138" font-size="12" fill="#15213E">Olivia Thompson</text><text x="740" y="138" font-size="11" fill="#0F9F6E">Joined</text><text x="543" y="171" font-size="12" fill="#15213E">Liam Patel</text><text x="740" y="171" font-size="11" fill="#0F9F6E">+30 pts</text></g>
      <g transform="translate(0,425)"><rect width="410" height="145" rx="14" fill="#F0ECFF"/><text x="24" y="38" font-size="14" fill="#5B3DF5">Drive more visits</text><text x="24" y="76" font-size="24" font-weight="800" fill="#15213E">Launch a campaign</text><rect x="24" y="98" width="150" height="36" rx="10" fill="#5B3DF5"/><text x="99" y="122" text-anchor="middle" font-size="12" font-weight="700" fill="#FFF">Launch Campaign</text><rect x="425" width="432" height="145" rx="14" fill="#EFF7FF"/><text x="449" y="38" font-size="14" fill="#3B70D9">Optimize your programme</text><text x="449" y="76" font-size="24" font-weight="800" fill="#15213E">Review programme setup</text><rect x="449" y="98" width="150" height="36" rx="10" fill="#5B3DF5"/><text x="524" y="122" text-anchor="middle" font-size="12" font-weight="700" fill="#FFF">Review Program</text></g>
    </g>
  </g>`;
  const phone = `<g transform="translate(1315,195)"><rect width="220" height="520" rx="42" fill="#111827"/><rect x="10" y="10" width="200" height="500" rx="34" fill="#FFFFFF"/><rect x="70" y="20" width="80" height="20" rx="10" fill="#111827"/><text x="24" y="72" font-size="18" font-weight="700" fill="#5B3DF5">LoyalFlow</text><rect x="20" y="95" width="180" height="90" rx="14" fill="#101B46"/><text x="34" y="123" font-size="12" fill="#FFCE55">Brewed Awakenings</text><text x="34" y="147" font-size="11" fill="#D4DAF2">Loyalty Balance</text><text x="34" y="174" font-size="24" font-weight="700" fill="#FFF">2,480 pts</text><g transform="translate(20,205)"><rect width="84" height="62" rx="12" fill="#F8F7FF"/><text x="12" y="24" font-size="9" fill="#66708A">Members</text><text x="12" y="47" font-size="17" font-weight="700" fill="#15213E">12,845</text><rect x="96" width="84" height="62" rx="12" fill="#F8F7FF"/><text x="108" y="24" font-size="9" fill="#66708A">Redeem Rate</text><text x="108" y="47" font-size="17" font-weight="700" fill="#15213E">28.4%</text><text x="0" y="98" font-size="14" font-weight="700" fill="#15213E">Quick Actions</text><rect y="114" width="180" height="48" rx="10" fill="#F8F7FF"/><text x="16" y="144" font-size="12" fill="#15213E">Scan / Search Customer</text><rect y="172" width="180" height="48" rx="10" fill="#F8F7FF"/><text x="16" y="202" font-size="12" fill="#15213E">Rewards & Offers</text><rect y="230" width="180" height="48" rx="10" fill="#F8F7FF"/><text x="16" y="260" font-size="12" fill="#15213E">Reports</text></g></g>`;
  return svgFrame('Business Owner Dashboard', 'إدارة العملاء والبرنامج والنمو والتقارير', desktop, phone, 'Concept 04 — Owner / Business Workspace');
}

function cashierSvg() {
  const desktop = `<g transform="translate(70,155)"><rect width="1170" height="620" rx="24" fill="#FFFFFF"/><rect width="185" height="620" rx="24" fill="#FAFBFF"/><text x="26" y="45" font-size="21" font-weight="700" fill="#5B3DF5">LoyalFlow</text><rect x="16" y="76" width="153" height="66" rx="12" fill="#F0ECFF"/><text x="32" y="103" font-size="14" font-weight="700" fill="#5B3DF5">Scan / Search</text><text x="32" y="126" font-size="10" fill="#66708A">Find or scan customer</text><text x="32" y="190" font-size="14" fill="#15213E">Quick Actions</text><text x="32" y="232" font-size="14" fill="#15213E">Transactions</text><text x="32" y="274" font-size="14" fill="#15213E">Customers</text>
    <g transform="translate(215,38)"><text x="0" y="0" font-size="18" fill="#5B3DF5">Cashier / Staff Daily Operations</text><text x="0" y="42" font-size="31" font-weight="800" fill="#0D1738">Scan, serve, confirm.</text><text x="760" y="12" font-size="13" fill="#66708A">Al Wahda Mall Branch · Ahmed S.</text>
      <g transform="translate(0,82)"><rect width="690" height="230" rx="16" fill="#FFFFFF" stroke="#DDE2ED"/><text x="20" y="34" font-size="15" font-weight="700" fill="#5B3DF5">Scan QR Code</text><rect x="20" y="56" width="650" height="145" rx="14" fill="#FBFAFF" stroke="#7B61FF" stroke-width="2" stroke-dasharray="8 8"/><rect x="296" y="78" width="78" height="65" rx="14" fill="#F0ECFF"/><path d="M316 98 h18 v18 h-18 z M346 98 h18 v18 h-18 z M316 128 h18 v18 h-18 z" fill="none" stroke="#5B3DF5" stroke-width="4"/><text x="345" y="170" text-anchor="middle" font-size="18" font-weight="700" fill="#15213E">Scan Customer QR Code</text><text x="345" y="192" text-anchor="middle" font-size="12" fill="#66708A">or enter Phone / ID manually</text>
        <rect x="710" width="220" height="230" rx="16" fill="#FFFFFF" stroke="#DDE2ED"/><text x="730" y="34" font-size="15" font-weight="700" fill="#15213E">Last Transaction</text><rect x="730" y="58" width="180" height="95" rx="12" fill="#F4FFF9"/><text x="748" y="86" font-size="13" fill="#0F9F6E">Earned</text><text x="892" y="86" text-anchor="end" font-size="13" font-weight="700" fill="#0F9F6E">+120 Points</text><text x="748" y="116" font-size="11" fill="#66708A">May 18, 2025 · 3:21 PM</text><text x="748" y="142" font-size="11" fill="#66708A">Receipt #INV-78452</text></g>
      <g transform="translate(0,332)"><rect width="690" height="155" rx="16" fill="#FFFFFF" stroke="#DDE2ED"/><circle cx="55" cy="56" r="32" fill="#E8E3FF"/><text x="55" y="64" text-anchor="middle" font-size="22" font-weight="700" fill="#5B3DF5">SA</text><text x="105" y="42" font-size="18" font-weight="700" fill="#15213E">Sarah Al Mansoori</text><text x="105" y="70" font-size="12" fill="#66708A">+971 50 123 4567 · VIP</text><text x="105" y="95" font-size="12" fill="#66708A">Member since Jan 12, 2023</text><text x="485" y="42" font-size="12" fill="#66708A">Loyalty Balance</text><text x="485" y="78" font-size="31" font-weight="800" fill="#15213E">2,480 Points</text><text x="485" y="105" font-size="12" fill="#66708A">Next reward at 3,000</text><rect x="485" y="119" width="170" height="9" rx="5" fill="#E1E5EE"/><rect x="485" y="119" width="132" height="9" rx="5" fill="#5B3DF5"/>
        <rect x="710" width="220" height="155" rx="16" fill="#FFFFFF" stroke="#DDE2ED"/><text x="730" y="34" font-size="15" font-weight="700" fill="#15213E">Today’s Summary</text><text x="730" y="68" font-size="12" fill="#66708A">Points Earned</text><text x="895" y="68" text-anchor="end" font-size="13" font-weight="700" fill="#15213E">1,240</text><text x="730" y="98" font-size="12" fill="#66708A">Points Redeemed</text><text x="895" y="98" text-anchor="end" font-size="13" font-weight="700" fill="#15213E">600</text><text x="730" y="128" font-size="12" fill="#66708A">Transactions</text><text x="895" y="128" text-anchor="end" font-size="13" font-weight="700" fill="#15213E">18</text></g>
      <g transform="translate(0,510)"><text x="0" y="0" font-size="14" font-weight="700" fill="#15213E">Quick Actions</text><rect y="18" width="210" height="55" rx="12" fill="#F4FFF9"/><text x="20" y="51" font-size="13" font-weight="700" fill="#0F9F6E">Earn Points</text><rect x="224" y="18" width="210" height="55" rx="12" fill="#F4F0FF"/><text x="244" y="51" font-size="13" font-weight="700" fill="#5B3DF5">Redeem Points</text><rect x="448" y="18" width="210" height="55" rx="12" fill="#F3F7FF"/><text x="468" y="51" font-size="13" font-weight="700" fill="#3B70D9">View History</text><rect x="672" y="18" width="210" height="55" rx="12" fill="#FFF8EE"/><text x="692" y="51" font-size="13" font-weight="700" fill="#E28A16">Customer Profile</text></g>
    </g>
  </g>`;
  const phone = `<g transform="translate(1300,190)"><rect width="238" height="520" rx="42" fill="#111827"/><rect x="10" y="10" width="218" height="500" rx="34" fill="#FFFFFF"/><rect x="80" y="20" width="78" height="20" rx="10" fill="#111827"/><text x="26" y="72" font-size="18" font-weight="700" fill="#5B3DF5">Quick Actions</text><text x="26" y="102" font-size="12" fill="#66708A">Al Wahda Mall Branch</text><rect x="24" y="130" width="190" height="66" rx="12" fill="#F4FFF9"/><text x="42" y="158" font-size="14" font-weight="700" fill="#0F9F6E">Earn Points</text><text x="42" y="179" font-size="10" fill="#66708A">Add points for purchase</text><rect x="24" y="208" width="190" height="66" rx="12" fill="#F4F0FF"/><text x="42" y="236" font-size="14" font-weight="700" fill="#5B3DF5">Redeem Points</text><text x="42" y="257" font-size="10" fill="#66708A">Redeem customer points</text><text x="24" y="312" font-size="11" fill="#66708A">Loyalty Balance</text><text x="24" y="346" font-size="30" font-weight="800" fill="#15213E">2,480 pts</text><text x="24" y="375" font-size="11" fill="#66708A">Next Reward · 520 pts to go</text><rect x="24" y="390" width="190" height="9" rx="5" fill="#E0E5EE"/><rect x="24" y="390" width="140" height="9" rx="5" fill="#5B3DF5"/><rect x="24" y="426" width="190" height="48" rx="12" fill="url(#p)"/><text x="119" y="456" text-anchor="middle" font-size="14" font-weight="700" fill="#FFF">Scan Customer QR</text></g>`;
  return svgFrame('Cashier / Staff Operations', 'واجهة Scan-first سريعة للاستخدام اليومي', desktop, phone, 'Concept 05 — Cashier / Staff Operations');
}

function customerSvg() {
  const desktop = `<g transform="translate(70,155)"><rect width="1170" height="620" rx="24" fill="#FFFFFF"/><rect y="0" width="1170" height="64" rx="24" fill="#FFFFFF"/><text x="34" y="41" font-size="22" font-weight="700" fill="#15213E">Coffee House</text><text x="580" y="41" font-size="14" fill="#15213E">Home</text><text x="650" y="41" font-size="14" fill="#15213E">Rewards</text><text x="730" y="41" font-size="14" fill="#15213E">About</text><text x="800" y="41" font-size="14" fill="#15213E">Contact</text><rect x="1040" y="15" width="95" height="34" rx="9" fill="#5B3DF5"/><text x="1088" y="38" text-anchor="middle" font-size="13" fill="#FFF">Join Now</text>
    <g transform="translate(40,95)"><rect width="740" height="300" rx="20" fill="#F7F5FF"/><text x="42" y="72" font-size="43" font-weight="800" fill="#0D1738">Earn points.</text><text x="42" y="125" font-size="43" font-weight="800" fill="#0D1738">Get rewarded.</text><text x="42" y="175" font-size="18" fill="#66708A">Every visit brings you closer to something special.</text><rect x="42" y="215" width="130" height="46" rx="12" fill="#5B3DF5"/><text x="107" y="244" text-anchor="middle" font-size="15" font-weight="700" fill="#FFF">Join Now</text><rect x="186" y="215" width="120" height="46" rx="12" fill="#FFF" stroke="#C7CEDD"/><text x="246" y="244" text-anchor="middle" font-size="15" fill="#15213E">Learn More</text><circle cx="600" cy="150" r="105" fill="#E5DCF8"/><ellipse cx="600" cy="177" rx="90" ry="38" fill="#C79364"/><ellipse cx="600" cy="168" rx="72" ry="25" fill="#F7E3CB"/><path d="M575 170 C590 155 610 155 625 170 C610 188 590 188 575 170" fill="#FFFFFF" opacity="0.9"/><rect x="470" y="210" width="70" height="62" rx="8" fill="#6B432A"/><path d="M470 228 L540 228 M470 246 L540 246" stroke="#F2D6B2" stroke-width="5"/>
      <g transform="translate(0,330)"><rect width="170" height="115" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="24" y="42" font-size="30" fill="#5B3DF5">★</text><text x="24" y="75" font-size="14" font-weight="700" fill="#15213E">Earn on every visit</text><text x="24" y="98" font-size="11" fill="#66708A">Progress is always visible.</text><rect x="185" width="170" height="115" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="209" y="42" font-size="28" fill="#5B3DF5">%</text><text x="209" y="75" font-size="14" font-weight="700" fill="#15213E">Exclusive offers</text><text x="209" y="98" font-size="11" fill="#66708A">Rewards made for members.</text><rect x="370" width="170" height="115" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="394" y="42" font-size="28" fill="#5B3DF5">♕</text><text x="394" y="75" font-size="14" font-weight="700" fill="#15213E">Digital card</text><text x="394" y="98" font-size="11" fill="#66708A">Always on your phone.</text><rect x="555" width="170" height="115" rx="14" fill="#FFF" stroke="#DFE3EC"/><text x="579" y="42" font-size="28" fill="#5B3DF5">↗</text><text x="579" y="75" font-size="14" font-weight="700" fill="#15213E">Share & invite</text><text x="579" y="98" font-size="11" fill="#66708A">Bring friends to the brand.</text></g>
    </g>
    <g transform="translate(825,95)"><rect width="305" height="470" rx="22" fill="#101B46"/><text x="26" y="42" font-size="20" font-weight="700" fill="#FFF">Coffee House</text><text x="26" y="70" font-size="13" fill="#FFCE55">Gold Member</text><rect x="68" y="105" width="170" height="155" rx="16" fill="#FFF"/><g fill="#101B46"><rect x="88" y="125" width="32" height="32"/><rect x="186" y="125" width="32" height="32"/><rect x="88" y="207" width="32" height="32"/><rect x="135" y="168" width="18" height="18"/><rect x="165" y="185" width="20" height="20"/><rect x="135" y="218" width="16" height="16"/></g><text x="152" y="300" text-anchor="middle" font-size="11" fill="#C8D0EC">POINTS BALANCE</text><text x="152" y="345" text-anchor="middle" font-size="36" font-weight="800" fill="#FFF">2,480 pts</text><text x="152" y="375" text-anchor="middle" font-size="12" fill="#C8D0EC">Next reward at 3,000 pts</text><rect x="40" y="405" width="225" height="12" rx="6" fill="#2D396A"/><rect x="40" y="405" width="178" height="12" rx="6" fill="#7B61FF"/><text x="152" y="448" text-anchor="middle" font-size="11" fill="#D5DBF0">Home · Rewards · Scan · Activity · Profile</text></g>
  </g>`;
  const phone = `<g transform="translate(1320,195)"><rect width="210" height="520" rx="42" fill="#111827"/><rect x="10" y="10" width="190" height="500" rx="34" fill="#FFFFFF"/><rect x="65" y="20" width="80" height="20" rx="10" fill="#111827"/><text x="24" y="70" font-size="18" font-weight="700" fill="#5B3DF5">LoyalFlow</text><rect x="20" y="95" width="170" height="170" rx="18" fill="#101B46"/><text x="34" y="125" font-size="15" font-weight="700" fill="#FFF">Coffee House</text><text x="34" y="149" font-size="11" fill="#FFCE55">Gold Member</text><rect x="62" y="166" width="86" height="75" rx="10" fill="#FFF"/><g fill="#101B46"><rect x="72" y="176" width="18" height="18"/><rect x="120" y="176" width="18" height="18"/><rect x="72" y="212" width="18" height="18"/><rect x="98" y="195" width="12" height="12"/></g><text x="105" y="300" text-anchor="middle" font-size="11" fill="#66708A">POINTS BALANCE</text><text x="105" y="338" text-anchor="middle" font-size="31" font-weight="800" fill="#15213E">2,480 pts</text><text x="105" y="365" text-anchor="middle" font-size="11" fill="#66708A">Next reward at 3,000 pts</text><rect x="26" y="388" width="158" height="10" rx="5" fill="#E1E5EE"/><rect x="26" y="388" width="122" height="10" rx="5" fill="#5B3DF5"/><g transform="translate(20,430)"><text x="0" y="0" font-size="11" fill="#5B3DF5">Home</text><text x="45" y="0" font-size="11" fill="#66708A">Rewards</text><text x="100" y="0" font-size="11" fill="#66708A">Scan</text><text x="140" y="0" font-size="11" fill="#66708A">Profile</text></g></g>`;
  return svgFrame('Customer Public Experience', 'كارت رقمي، تقدم، مكافآت، عروض وبيانات النشاط', desktop, phone, 'Concept 06 — Customer / Public Card');
}

const mockups = {
  home: homeSvg(),
  login: loginSvg(),
  superadmin: superAdminSvg(),
  owner: ownerSvg(),
  cashier: cashierSvg(),
  customer: customerSvg(),
};
for (const [name, svg] of Object.entries(mockups)) fs.writeFileSync(path.join(mockupDir, `${name}.svg`), svg);

const phaseCards = phases.map((p, index) => `
<section class="page phase-page">
  <div class="page-head"><span>${esc(p.id)}</span><small>${esc(p.status)}</small></div>
  <h1>${esc(p.title)}</h1>
  <div class="importance"><b>الأهمية:</b> ${esc(p.importance)}</div>
  <table class="task-table">
    <thead><tr><th>Task</th><th>المهمة</th><th>لماذا؟</th><th>المخرج</th></tr></thead>
    <tbody>${p.tasks.map(t => `<tr><td class="code">${esc(t[0])}</td><td>${esc(t[1])}</td><td>${esc(t[2])}</td><td>${esc(t[3])}</td></tr>`).join('')}</tbody>
  </table>
  <div class="result"><b>Exit Result:</b> ${esc(p.result)}</div>
  <div class="page-number">${index + 8}</div>
</section>`).join('');

const mockupPages = [
  ['home', 'الواجهة الخارجية — Visitor / Home', 'الموقع يشرح المنتج ويقود إلى Demo أو Trial أو Login. نسخة الموبايل تحافظ على نفس الرسالة والـCTA بدون ازدحام.', ['Navbar واضح', 'Hero + Product preview', 'Features / Industries / Pricing / Trust', 'CTA للتجربة أو Demo', 'Login جزء من الموقع وليس الموقع كله']],
  ['login', 'صفحة الدخول والاسترجاع', 'واجهة Auth متصلة بالموقع العام، تدعم Forgot Password، وتستخدم رسالة وأخطاء وحالات تحميل متسقة بالعربي والإنجليزي.', ['Email + Password', 'Show/Hide password', 'Forgot Password', 'Generic recovery response', 'Back to Website']],
  ['superadmin', 'واجهة Super Admin', 'لوحة Platform Administration منفصلة بصريًا ووظيفيًا عن أي Business Workspace.', ['Businesses & Owners', 'Plans & Billing', 'Operations & Health', 'Industries & Presets لاحقًا', 'Audit & approvals']],
  ['owner', 'واجهة Owner / Business Owner', 'صاحب النشاط يرى العملاء، النمو، المكافآت، التقارير وإعداد البرنامج مع Business وBranch context واضح.', ['KPIs بوحدات وتاريخ', 'Customers & Scan', 'Loyalty Program', 'Growth & Reports', 'Team / Branches / Settings']],
  ['cashier', 'واجهة Cashier / Staff', 'واجهة تشغيل يومي Scan-first، تقلل الخطوات وتظهر فقط Earn / Redeem / History والبيانات المطلوبة.', ['QR Scan', 'Customer search fallback', 'Earn / Redeem', 'Branch & staff attribution', 'Immediate success/error feedback']],
  ['customer', 'تجربة العميل والكارت العام', 'صفحة Mobile-first تحمل هوية النشاط، وتعرض الرصيد والتقدم والمكافآت والعروض ووسائل التواصل بأمان.', ['Digital card + QR', 'Balance & progress', 'Available rewards', 'Offers & business info', 'Share / contact actions']],
].map((m, i) => `
<section class="page visual-page">
  <div class="page-head"><span>Visual Simulation ${i + 1}</span><small>Concept — not current screenshot</small></div>
  <h1>${esc(m[1])}</h1>
  <p class="lead">${esc(m[2])}</p>
  <img class="mockup" src="mockups/${m[0]}.svg" alt="${esc(m[1])}" />
  <div class="visual-notes">${m[3].map(x => `<div>✓ ${esc(x)}</div>`).join('')}</div>
  <div class="page-number">${phases.length + 8 + i}</div>
</section>`).join('');

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>LoyalFlow Master Plan</title><style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin:0; font-family:"Noto Sans Arabic","Noto Kufi Arabic",Arial,sans-serif; color:${BRAND.ink}; background:#e9edf5; }
.page { width:210mm; min-height:297mm; margin:0 auto 12px; padding:17mm 16mm 15mm; background:#fff; position:relative; page-break-after:always; overflow:hidden; }
.page::before { content:""; position:absolute; top:0; left:0; right:0; height:7px; background:linear-gradient(90deg,${BRAND.navy},${BRAND.purple},${BRAND.purple2}); }
.page-number { position:absolute; bottom:8mm; left:16mm; font-size:10px; color:${BRAND.muted}; direction:ltr; }
h1 { margin:8px 0 12px; font-size:27px; line-height:1.35; color:${BRAND.navy}; }
h2 { font-size:20px; color:${BRAND.purple}; margin:16px 0 10px; }
h3 { font-size:15px; color:${BRAND.navy}; margin:12px 0 7px; }
p, li, td { font-size:11.5px; line-height:1.8; }
.lead { color:${BRAND.muted}; font-size:13px; margin:0 0 13px; }
.cover { background:radial-gradient(circle at 10% 0%,#efeaff 0,transparent 32%),linear-gradient(180deg,#fff,#f7f8ff); }
.brand { direction:ltr; display:flex; align-items:center; gap:12px; font-size:29px; font-weight:800; color:${BRAND.navy}; }
.brand-mark { width:38px; height:38px; background:linear-gradient(135deg,${BRAND.purple2},${BRAND.purple}); border-radius:11px 17px 11px 17px; transform:rotate(18deg); }
.cover h1 { font-size:42px; max-width:155mm; margin-top:25mm; }
.cover .sub { font-size:18px; color:${BRAND.muted}; max-width:160mm; }
.cover-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:18mm; }
.cover-grid img { width:100%; border-radius:13px; border:1px solid ${BRAND.border}; background:#fff; }
.cover-note { margin-top:13mm; padding:14px 18px; border:1px solid #dcd6ff; background:${BRAND.soft}; border-radius:14px; font-size:13px; }
.badge { display:inline-block; padding:7px 12px; border-radius:999px; background:${BRAND.soft}; color:${BRAND.purple}; font-weight:700; font-size:11px; }
.page-head { direction:ltr; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid ${BRAND.border}; padding-bottom:9px; color:${BRAND.purple}; font-weight:800; }
.page-head small { font-weight:600; color:${BRAND.muted}; }
.summary-grid, .track-grid, .tool-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.card { border:1px solid ${BRAND.border}; border-radius:14px; padding:13px; background:#fff; box-shadow:0 6px 18px rgba(25,36,72,.05); }
.card strong { color:${BRAND.purple}; }
.card ul { margin:7px 0 0; padding-right:18px; }
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:13px 0; }
.kpi { padding:12px; border-radius:12px; background:${BRAND.soft}; border:1px solid #e3ddff; }
.kpi b { display:block; font-size:18px; direction:ltr; color:${BRAND.navy}; }
.evidence { margin:8px 0; padding:0; list-style:none; }
.evidence li { padding:7px 12px; margin:5px 0; border-right:4px solid ${BRAND.purple}; background:#fafaff; }
.roadmap { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
.roadmap .card { min-height:112px; }
.roadmap .id { direction:ltr; font-size:18px; font-weight:900; color:${BRAND.purple}; }
.track-grid .card { min-height:210px; }
.track-grid h3 { direction:ltr; text-align:right; color:${BRAND.purple}; font-size:17px; }
.tool-table, .task-table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid ${BRAND.border}; border-radius:12px; overflow:hidden; }
th { background:${BRAND.navy}; color:#fff; font-size:10.5px; padding:9px; }
td { padding:8px; vertical-align:top; border-top:1px solid ${BRAND.border}; background:#fff; }
tr:nth-child(even) td { background:#fafbff; }
.code { direction:ltr; font-weight:800; color:${BRAND.purple}; white-space:nowrap; }
.importance { padding:11px 14px; background:#fff8e9; border:1px solid #f1d89d; border-radius:12px; margin:10px 0 13px; font-size:12px; }
.result { margin-top:12px; padding:12px 14px; background:#effbf6; border:1px solid #bfe8d5; color:#0e7252; border-radius:12px; font-size:12px; }
.mockup { display:block; width:100%; max-height:190mm; object-fit:contain; border:1px solid ${BRAND.border}; border-radius:14px; background:#fafbff; box-shadow:0 9px 30px rgba(18,30,66,.09); }
.visual-notes { display:grid; grid-template-columns:repeat(5,1fr); gap:7px; margin-top:10px; direction:rtl; }
.visual-notes div { padding:8px; border:1px solid #ddd8ff; background:${BRAND.soft}; border-radius:10px; font-size:10px; text-align:center; color:${BRAND.navy}; }
.pr-rule { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.flow { direction:ltr; display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; margin:16px 0; }
.flow span { padding:9px 13px; border-radius:10px; background:${BRAND.soft}; border:1px solid #ddd7ff; color:${BRAND.purple}; font-weight:700; }
.flow i { color:${BRAND.muted}; font-style:normal; }
.small { font-size:10px; color:${BRAND.muted}; }
</style></head><body>
<section class="page cover">
  <div class="brand"><span class="brand-mark"></span>LoyalFlow</div>
  <span class="badge">Product, Architecture, UX & Launch Master Plan — v1.0</span>
  <h1>خطة LoyalFlow الشاملة: من الوضع الحالي إلى منصة SaaS احترافية جاهزة للإطلاق والتوسع</h1>
  <p class="sub">كل Phase، Task، أهميتها، اعتمادياتها، مخرجها، وبوابات الجودة — مع محاكاة مرئية للـWebsite والـLogin والـSuper Admin والـOwner والـCashier وتجربة العميل على Desktop وMobile.</p>
  <div class="cover-grid"><img src="mockups/home.svg"/><img src="mockups/owner.svg"/><img src="mockups/superadmin.svg"/><img src="mockups/customer.svg"/></div>
  <div class="cover-note"><b>القرار التنفيذي:</b> Free-first، Modular Monolith الآن، Closed Beta أولًا، لا Microservices مبكرًا، ولا إعادة تصميم لجزء لم تُحسم قواعده.</div>
  <div class="page-number">1</div>
</section>

<section class="page">
  <div class="page-head"><span>Executive Summary</span><small>2026-08-06</small></div>
  <h1>الملخص التنفيذي</h1>
  <p class="lead">LoyalFlow مشروع غني بالوظائف وقابل للبناء عليه. المطلوب ليس Rewrite، بل إكمال دورات الحياة الأساسية، تثبيت قواعد الولاء، حماية الـLedger، وتنظيم تجربة المستخدم والإطلاق.</p>
  <div class="kpi-row"><div class="kpi">آخر Merge<b>PR #9</b><span>Programme audit</span></div><div class="kpi">Focused tests<b>24/24</b><span>Current branch</span></div><div class="kpi">Full baseline<b>558/561</b><span>3 known failures</span></div><div class="kpi">Database change<b>0</b><span>Current branch</span></div></div>
  <h2>الأهداف النهائية</h2>
  <div class="summary-grid"><div class="card"><strong>منتج قابل للبيع</strong><p>Website كامل، Demo/Signup/Login، Account recovery، Plans واضحة، دعم وتشغيل.</p></div><div class="card"><strong>نظام ولاء آمن</strong><p>Append-only ledger، Idempotency، Refund/Reversal، Concurrency tests.</p></div><div class="card"><strong>تجارب حسب الدور</strong><p>Super Admin، Owner، Staff/Cashier، Customer public card.</p></div><div class="card"><strong>قابلية توسع محسوبة</strong><p>Modular Monolith أولًا، فصل Web/API لاحقًا عندما تبرره البيانات.</p></div></div>
  <h2>أدلة الوضع الحالي</h2><ul class="evidence">${evidence.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <div class="page-number">2</div>
</section>

<section class="page">
  <div class="page-head"><span>Current Stack</span><small>Confirmed from repository</small></div>
  <h1>الوضع الحالي والأدوات</h1>
  <div class="summary-grid"><div class="card"><strong>Frontend</strong><p>Next.js 16 · React 19 · TypeScript · Tailwind 4 · Base UI / shadcn · Recharts · Framer Motion · QR scanner.</p></div><div class="card"><strong>Backend</strong><p>Next.js Server Actions / Route Handlers · NextAuth v5 beta · Zod · bcrypt · Google APIs.</p></div><div class="card"><strong>Database</strong><p>PostgreSQL · Neon direction · Prisma 7 · raw SQL protections · migration integrity CI.</p></div><div class="card"><strong>Quality</strong><p>Node tests · Typecheck · ESLint · Playwright · Vercel Preview · release scripts.</p></div></div>
  <h2>ما الموجود بالفعل</h2><div class="summary-grid"><div class="card"><ul><li>Businesses, Users, Customers, Branches</li><li>Visits / Points / Sales Amount</li><li>Rewards, unlocks, redemptions</li><li>Offers, referrals, reports</li></ul></div><div class="card"><ul><li>Activity/Audit model</li><li>Public customer card</li><li>Plan and billing fields</li><li>Google Sheets sync state</li></ul></div></div>
  <h2>النواقص التي تمنع اعتبار المشروع SaaS مكتملًا</h2><div class="summary-grid"><div class="card"><strong>Launch blockers</strong><ul><li>Account recovery</li><li>Ledger retry/concurrency evidence</li><li>Refund/Reversal lifecycle</li><li>Backup/Restore proof</li></ul></div><div class="card"><strong>Commercial lifecycle</strong><ul><li>Public website</li><li>Self signup/verification</li><li>Billing lifecycle</li><li>Legal/data lifecycle</li></ul></div></div>
  <div class="page-number">3</div>
</section>

<section class="page">
  <div class="page-head"><span>Architecture Decision</span><small>No overengineering</small></div>
  <h1>القرار المعماري: Modular Monolith الآن</h1>
  <p class="lead">الفصل المنطقي يبدأ فورًا، لكن فصل الاستضافة إلى Web وAPI مستقلين لا يصبح شرطًا للـBeta أو أول Launch.</p>
  <div class="flow"><span>Current Next.js App</span><i>→</i><span>Domain boundaries</span><i>→</i><span>Contracts & Validation</span><i>→</i><span>Read APIs</span><i>→</i><span>Safe Writes</span><i>→</i><span>Ledger Writes</span><i>→</i><span>Physical Split Later</span></div>
  <div class="summary-grid"><div class="card"><strong>الآن</strong><ul><li>Keep one deployable application</li><li>Extract pure domain rules</li><li>Forbid Prisma from UI/domain packages</li><li>Thin Server Action adapters</li></ul></div><div class="card"><strong>لاحقًا</strong><ul><li>apps/web</li><li>apps/api</li><li>Independent deployment ownership</li><li>Redis/Queue only after real demand</li></ul></div></div>
  <h2>الممنوعات</h2><div class="summary-grid"><div class="card"><ul><li>Rewrite كامل</li><li>Microservices لمجرد الشكل</li><li>Dual-write للـLedger</li><li>تعديل Migrations مطبقة</li></ul></div><div class="card"><ul><li>Paid infrastructure بدون مبرر</li><li>AI يوافق على تغييره بنفسه</li><li>UI redesign قبل حسم المنطق</li><li>Production DB في الاختبارات</li></ul></div></div>
  <div class="page-number">4</div>
</section>

<section class="page">
  <div class="page-head"><span>Four Workstreams</span><small>Separate but coordinated</small></div>
  <h1>مسارات المشروع المنفصلة</h1>
  <div class="track-grid">${tracks.map(t => `<div class="card"><h3>${esc(t.name)}</h3><p>${esc(t.goal)}</p><ul>${t.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
  <div class="result"><b>قاعدة التنفيذ:</b> كل PR يحدد بوضوح أثره على Frontend وBackend وDatabase وQuality، ولا يخلط Schema/Auth/UI في تغيير واحد بدون ضرورة معتمدة.</div>
  <div class="page-number">5</div>
</section>

<section class="page">
  <div class="page-head"><span>Roadmap</span><small>Now → Beta → Public → Scale</small></div>
  <h1>خارطة المراحل</h1>
  <div class="roadmap">${phases.map(p => `<div class="card"><div class="id">${esc(p.id)} · ${esc(p.status)}</div><h3>${esc(p.title)}</h3><p>${esc(p.result)}</p></div>`).join('')}</div>
  <div class="page-number">6</div>
</section>

<section class="page">
  <div class="page-head"><span>Free-first Tooling</span><small>Professional, not cheap-at-any-cost</small></div>
  <h1>الأدوات والسياسة التنفيذية</h1>
  <table class="tool-table"><thead><tr><th>الأداة</th><th>الاستخدام</th><th>القاعدة</th></tr></thead><tbody>${toolRows.map(r => `<tr><td class="code">${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table>
  <div class="importance"><b>Free-first:</b> نستخدم المجاني أو الـFree tier عندما يكون مسموحًا وآمنًا وكافيًا. لا نؤجل Backup أو Security لأن الأداة المدفوعة غير متاحة؛ نستخدم إجراءات يدوية موثقة مؤقتًا ثم نؤتمتها عند الحاجة.</div>
  <div class="page-number">7</div>
</section>

${phaseCards}

<section class="page">
  <div class="page-head"><span>Frontend Blueprint</span><small>Desktop + Mobile + RTL/LTR</small></div>
  <h1>خطة الـFrontend والـUX</h1>
  <div class="summary-grid"><div class="card"><strong>Public</strong><ul><li>/</li><li>/features</li><li>/industries</li><li>/pricing</li><li>/security</li><li>/faq</li><li>/contact</li><li>/demo</li><li>/login</li><li>/signup لاحقًا</li></ul></div><div class="card"><strong>Business Workspace</strong><ul><li>Overview</li><li>Customers</li><li>Scan</li><li>Loyalty Program</li><li>Growth</li><li>Reports</li><li>Team & Branches</li><li>Settings</li></ul></div><div class="card"><strong>Platform Administration</strong><ul><li>Businesses</li><li>Owners</li><li>Plans & Billing</li><li>Operations</li><li>Industries & Presets</li><li>System Health</li></ul></div><div class="card"><strong>Public Customer</strong><ul><li>Join</li><li>Digital Card</li><li>Balance & Progress</li><li>Rewards & Offers</li><li>Business Info</li><li>Share/Contact</li></ul></div></div>
  <h2>قواعد الأزرار</h2><div class="pr-rule"><div class="card"><strong>Desktop</strong><p>Primary action في logical end، row actions داخل menu، Save قرب نهاية الـForm، وDanger Zone منفصلة.</p></div><div class="card"><strong>Mobile</strong><p>Action أساسي واحد واضح أو sticky، touch targets كبيرة، tables تتحول إلى cards، Scan دائم الوصول.</p></div></div>
  <div class="page-number">${phases.length + 8}</div>
</section>

<section class="page">
  <div class="page-head"><span>Backend Blueprint</span><small>Source of truth</small></div>
  <h1>خطة الـBackend والـDomain</h1>
  <div class="summary-grid"><div class="card"><strong>Domains</strong><p>Identity · Tenancy · Businesses · Customers · Loyalty · Rewards · Growth · Reports · Team · Branches · Billing · Integrations · Audit.</p></div><div class="card"><strong>Command requirements</strong><p>Actor + tenant + permission + branch + idempotency + immutable intent + validation + audit context.</p></div><div class="card"><strong>Account lifecycle</strong><p>Invite/Signup → Verify → Password → Login → Recover → Reset → Revoke → Disable/Transfer.</p></div><div class="card"><strong>Integration policy</strong><p>Provider-neutral contracts، retryable state، manual retry أولًا، queue بعد ثبوت الحجم.</p></div></div>
  <h2>العمليات الأعلى خطورة</h2><table class="task-table"><thead><tr><th>Command</th><th>الضمانات</th></tr></thead><tbody><tr><td class="code">Earn</td><td>Positive whole amount، source mode، durable key، atomic totals/ledger/reward effects.</td></tr><tr><td class="code">Redeem</td><td>Eligibility، no negative balance، atomic unlock claim، one redemption ↔ one ledger row.</td></tr><tr><td class="code">Adjust</td><td>High-risk permission، reason، idempotency، audit old/new.</td></tr><tr><td class="code">Refund/Reversal</td><td>New linked entries، no history edit/delete، full/partial policy، compensation path.</td></tr></tbody></table>
  <div class="page-number">${phases.length + 9}</div>
</section>

<section class="page">
  <div class="page-head"><span>Database Blueprint</span><small>PostgreSQL first</small></div>
  <h1>خطة قاعدة البيانات والـMigrations</h1>
  <div class="summary-grid"><div class="card"><strong>Migration Policy</strong><ul><li>Forward-only</li><li>Never edit applied history</li><li>Review generated SQL</li><li>Separate schema/data/backup approvals</li></ul></div><div class="card"><strong>Expand/Contract</strong><ul><li>Add compatible field</li><li>Dual-compatible app</li><li>Backfill</li><li>Switch readers</li><li>Observe</li><li>Remove later</li></ul></div><div class="card"><strong>Ledger Integrity</strong><ul><li>Append-only</li><li>Tenant FKs</li><li>Non-negative invariants</li><li>Redemption linkage</li><li>Reconciliation</li></ul></div><div class="card"><strong>Recovery</strong><ul><li>Backup format/version</li><li>Encrypted retention</li><li>Restore drill</li><li>RPO/RTO</li><li>Provider cutover plan</li></ul></div></div>
  <div class="flow"><span>Design</span><i>→</i><span>Additive Migration</span><i>→</i><span>Test DB</span><i>→</i><span>Staging</span><i>→</i><span>Backup</span><i>→</i><span>Production</span><i>→</i><span>Verify</span></div>
  <div class="page-number">${phases.length + 10}</div>
</section>

<section class="page">
  <div class="page-head"><span>Validation & Quality</span><small>Release evidence</small></div>
  <h1>خطة Validation والأمان والاختبارات</h1>
  <div class="summary-grid"><div class="card"><strong>4 Validation Levels</strong><ol><li>Client feedback</li><li>Server contract</li><li>Domain policy</li><li>Database invariant</li></ol></div><div class="card"><strong>Security</strong><ul><li>Tenant/role tests</li><li>Recovery enumeration protection</li><li>Rate limits</li><li>Secret-safe logs</li><li>MFA privileged roles</li></ul></div><div class="card"><strong>Test Pyramid</strong><ul><li>Pure unit</li><li>Contract/source</li><li>Real PostgreSQL</li><li>Concurrency/rollback</li><li>Playwright E2E</li></ul></div><div class="card"><strong>Release Gate</strong><ul><li>Typecheck</li><li>Lint</li><li>Tests</li><li>Build</li><li>Preview</li><li>Staging/backup/smoke</li></ul></div></div>
  <h2>Definition of Done</h2><ul class="evidence"><li>لا P0/P1 مفتوحة في نطاق الـRelease.</li><li>لا تغيير Database غير مجرب على Test/Staging.</li><li>Critical journeys تمر Desktop/Mobile وAR/EN حسب النطاق.</li><li>Rollback/forward-fix معروف قبل Production.</li><li>Tracker وPR description وevidence محدثة.</li></ul>
  <div class="page-number">${phases.length + 11}</div>
</section>

${mockupPages}

<section class="page">
  <div class="page-head"><span>Execution Protocol</span><small>One PR at a time</small></div>
  <h1>طريقة التنفيذ بعد اعتماد التقرير</h1>
  <div class="flow"><span>Inspect</span><i>→</i><span>Scope / Non-goals</span><i>→</i><span>Branch</span><i>→</i><span>Tests</span><i>→</i><span>Implementation</span><i>→</i><span>Preview</span><i>→</i><span>PR</span><i>→</i><span>Merge</span><i>→</i><span>Tracker</span></div>
  <h2>قالب كل PR</h2><div class="summary-grid"><div class="card"><ul><li>A-to-Z Phase</li><li>Architecture Phase</li><li>Problems covered</li><li>Exit gate</li></ul></div><div class="card"><ul><li>Forbidden changes</li><li>Tests/evidence</li><li>Database impact</li><li>Deferred work</li></ul></div></div>
  <h2>الخطوة التالية مباشرة</h2><div class="result"><b>1.</b> الرجوع إلى الفرع <span dir="ltr">feat/loyalty-economic-rules-safety</span>، تشغيل Full Suite، مراجعة النتائج، ثم Commit/PR/Merge قبل بدء P1.</div>
  <h2>ما سيصبح معنا بعد إكمال الخطة</h2><div class="summary-grid"><div class="card"><strong>Website كامل</strong><p>Home + Features + Industries + Pricing + Trust + Demo + Login/Signup.</p></div><div class="card"><strong>Experiences كاملة</strong><p>Super Admin + Owner + Cashier + Customer على Desktop/Mobile.</p></div><div class="card"><strong>Backend موثوق</strong><p>Auth lifecycle، tenant safety، ledger integrity، audit، operations.</p></div><div class="card"><strong>Database قابلة للنمو</strong><p>Migrations آمنة، backup/restore، portability، measured performance.</p></div></div>
  <div class="page-number">${phases.length + 15}</div>
</section>

<section class="page">
  <div class="page-head"><span>Source & Decision Notes</span><small>Traceability</small></div>
  <h1>المصادر وحدود المحاكاة</h1>
  <ul class="evidence">${evidence.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <div class="importance"><b>مهم:</b> صور الواجهات داخل هذا التقرير هي Concept Simulations لتوضيح الاتجاه النهائي، وليست Screenshots من النسخة الحالية، ولا تعتبر اعتمادًا نهائيًا للنصوص أو الأرقام أو التسعير. الاعتماد النهائي يتم في Figma ثم يُطبق داخل الـDesign System.</div>
  <div class="result"><b>الحكم النهائي:</b> LoyalFlow لا يحتاج Overengineering. يحتاج ترتيبًا صارمًا: قواعد وحماية أولًا، تجربة وتشغيل ثانيًا، إطلاق محدود ثالثًا، ثم Automation وتوسع حسب البيانات.</div>
  <div class="page-number">${phases.length + 16}</div>
</section>
</body></html>`;

const htmlPath = path.join(out, 'LoyalFlow_Master_Plan_AR.html');
fs.writeFileSync(htmlPath, html);

const md = `---\ntitle: "LoyalFlow — الخطة الشاملة للتنفيذ والإطلاق"\nlang: ar\ndir: rtl\n---\n\n<div dir="rtl">\n\n# LoyalFlow — الخطة الشاملة للتنفيذ والإطلاق\n\n**نسخة تنفيذية — 2026-08-06**\n\nهذا التقرير يجمع الوضع الحالي، الأدوات، المراحل، المهام، الأهمية، المخرجات، بوابات الجودة، والتصور النهائي للواجهات.\n\n![واجهة الموقع](mockups/home.png)\n\n## الملخص التنفيذي\n\nLoyalFlow مشروع غني بالوظائف وقابل للبناء عليه. المطلوب ليس Rewrite، بل إكمال دورات الحساب والبيانات والولاء والإطلاق.\n\n${evidence.map(x => `- ${x}`).join('\n')}\n\n## المسارات المنفصلة\n\n${tracks.map(t => `### ${t.name}\n\n${t.goal}\n\n${t.items.map(x => `- ${x}`).join('\n')}`).join('\n\n')}\n\n## الأدوات\n\n| الأداة | الاستخدام | القاعدة |\n|---|---|---|\n${toolRows.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} |`).join('\n')}\n\n# المراحل والمهام\n\n${phases.map(p => `## ${p.id} — ${p.title}\n\n**الحالة:** ${p.status}\n\n**الأهمية:** ${p.importance}\n\n| Task | المهمة | لماذا؟ | المخرج |\n|---|---|---|---|\n${p.tasks.map(t => `| ${t[0]} | ${t[1]} | ${t[2]} | ${t[3]} |`).join('\n')}\n\n**النتيجة:** ${p.result}`).join('\n\n')}\n\n# التصور النهائي للواجهات\n\n## الموقع الخارجي\n\n![Home](mockups/home.png)\n\nموقع تسويقي كامل يقود إلى Demo أو Trial أو Login.\n\n## تسجيل الدخول\n\n![Login](mockups/login.png)\n\nصفحة Auth متصلة بالموقع وتدعم الاسترجاع الآمن.\n\n## Super Admin\n\n![Super Admin](mockups/superadmin.png)\n\nإدارة المنصة والمالكين والخطط والحالة التشغيلية.\n\n## Owner\n\n![Owner](mockups/owner.png)\n\nإدارة النشاط والعملاء والبرنامج والنمو.\n\n## Cashier\n\n![Cashier](mockups/cashier.png)\n\nواجهة تشغيل يومي Scan-first.\n\n## Customer\n\n![Customer](mockups/customer.png)\n\nكارت رقمي وتقدم ومكافآت وعروض وبيانات النشاط.\n\n# الخطوة التالية\n\nتشغيل Full Suite على الفرع الحالي، ثم Review وPR وMerge، وبعدها بدء اعتماد قواعد Refund/Reversal.\n\n</div>\n`;
fs.writeFileSync(path.join(out, 'LoyalFlow_Master_Plan_AR.md'), md);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.pdf({ path: path.join(out, 'LoyalFlow_Master_Plan_AR.pdf'), format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
await browser.close();
console.log(`Generated report source and PDF at ${out}`);
