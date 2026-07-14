# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start the development server on http://localhost:3000
- `npm run build` - Build the application for production (runs `prisma generate` then `next build`)
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for linting
- `npm run create-admin` - Create a super admin user (runs `tsx scripts/create-super-admin.ts`)
- `npm run sync-sheets` - Synchronize data with Google Sheets (runs `tsx scripts/sync-google-sheets.ts`)

## Code Structure

This is a Next.js 13+ application using the App Router. Key directories:

- `app/` - Contains all application routes, layouts, and components using the App Router structure
  - `app/api/` - API route handlers (Next.js API routes)
  - `app/businesses/` - Business-related routes (dashboard, settings, customers, etc.)
  - `app/dashboard/` - Main dashboard after login
  - `app/login/` - Authentication pages
  - `app/card/[token]/` - Public loyalty card pages
  - `app/apple-icon.tsx`, `app/icon.tsx` - Icon components
  - `app/layout.tsx` - Root layout
  - `app/page.tsx` - Home page
- `components/` - Reusable UI components used across the application
- `lib/` - Utility functions, utilities for external services (Google Sheets, WhatsApp, etc.), Prisma client, i18n configuration
- `prisma/` - Prisma ORM schema and migrations
  - `prisma/schema.prisma` - Database models and relationships
  - `prisma/migrations/` - Migration history
- `scripts/` - Utility scripts (admin creation, Google Sheets sync)
- `public/` - Static assets
- `components/` - Shared React components

## Key Conventions and Gotchas

> ⚠️ **Important**: This Next.js version has breaking changes from older versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing code.

- **TypeScript**: The project uses TypeScript with strict mode enabled via `tsconfig.json` (inherited from Next.js).
- **Internationalization (i18n)**: Uses `next-intl` pattern via `lib/i18n.ts`. Languages: English (en) and Arabic (ar). Language preference stored in user's language field and business's cardDefaultLanguage.
- **Styling**: Tailwind CSS v4 configured via `tailwind.config.ts` and `globals.css`. Uses CSS variables for theme colors.
- **Authentication**: Uses `next-auth` (version 5 beta) with custom implementation. Session handling via JWT. See `auth.ts` for configuration.
- **Database**: PostgreSQL with Prisma ORM. Run `npx prisma generate` after schema changes. Migrations are managed via Prisma Migrate.
- **API Routes**: Located in `app/api/` using Next.js route handlers. Follow REST-ish patterns with token-based authentication for public endpoints (e.g., card-icon, card-manifest).
- **Business Context**: Most entities (Business, User, Customer, etc.) are scoped to a business via `businessId`. Multi-tenancy is enforced at the Prisma query level.
- **Loyalty System**: Supports three loyalty modes (VISITS, POINTS, SALES_AMOUNT) and multiple reward types (GIFT, PROMO_CODE, DISCOUNT, CUSTOM).
- **Components**: Reusable UI components are in `components/` directory. Business-specific components often live under `app/businesses/[slug]/components/` or similar.
- **Scripts**: 
  - `create-super-admin.ts`: Creates an initial admin user
  - `sync-google-sheets.ts`: Syncs business data to Google Sheets

## Important Files

- `prisma/schema.prisma` - Defines all database models and relationships
- `app/auth.ts` - NextAuth configuration
- `lib/i18n.ts` - Internationalization configuration
- `lib/prisma.ts` - Prisma client singleton
- `app/layout.tsx` - Root layout with providers and global styles
- `app/page.tsx` - Home page (landing page)
- `scripts/create-super-admin.ts` - Admin user creation script
- `scripts/sync-google-sheets.ts` - Google Sheets synchronization utility

## Database Modeling Notes

- All tenant-scoped models (User, Customer, etc.) belong to a Business via `businessId`
- Prisma enforces cascade deletes where appropriate (e.g., deleting a business deletes its users and customers)
- Frequently queried fields are indexed (see `@@index` directives in schema.prisma)
- Enums are used for fixed sets of values (UserRole, LoyaltyMode, RewardType, etc.)

## API Patterns

- Public endpoints (like card endpoints) use token-based authentication in the URL (`/app/api/card-icon/[token]/route.tsx`)
- Protected API routes (under `app/businesses/[slug]/...`) typically verify session and business ownership
- Error handling follows Next.js API route conventions with proper status codes and JSON responses

## Styling Guidelines

- Tailwind CSS is used for all styling
- Custom CSS variables are defined in `app/globals.css` for theme colors (primary, secondary, etc.)
- Component styles should use utility classes; avoid custom CSS when possible
- Dark mode is not currently implemented; colors are designed for light background

## Internationalization

- Text is translated using the `useTranslations` hook from `next-intl` (via `lib/i18n.ts`)
- Language files are not explicitly shown; translations appear to be handled via a custom solution in `lib/i18n.ts`
- Language preference is stored in the User model (`language` field) and Business model (`cardDefaultLanguage`)

## Testing

- No test scripts are defined in package.json; testing approach is not established in this codebase
- Consider adding unit and integration tests as the project grows

## Common Tasks

### Adding a new API endpoint
1. Create a route under `app/api/` or under a business-scoped path like `app/businesses/[slug]/api/`
2. Use Next.js Route Handler syntax (GET, POST, etc. functions)
3. Protect business-scoped routes with session and business ownership checks
4. Return JSON responses with appropriate status codes

### Adding a new database model
1. Edit `prisma/schema.prisma`
2. Run `npx prisma generate` to update types
3. Create a migration with `npx prisma migrate dev --name <migration-name>`
4. Update Prisma client usage throughout the codebase

### Adding a new UI page
1. For business-scoped pages: create under `app/businesses/[slug]/` 
2. For public pages: create under `app/` (like login, card pages)
3. For dashboard: create under `app/dashboard/`
4. Use TypeScript and React Server Components by default; add `'use client'` for interactive components
5. Fetch data using async Server Components or API routes as appropriate

### Adding a new reusable component
1. Place in `components/` directory
2. Use TypeScript interfaces for props
3. Follow existing component patterns (props destructuring, tailwind classes)
4. Consider making it a Server Component unless client interactivity is needed