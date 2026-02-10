# 30-Day LinkedIn Campaign Builder

Production-quality MVP for building, locking, and generating a 30-day LinkedIn campaign in a structured workflow.

## Stack

- Next.js (App Router) + TypeScript
- TailwindCSS + shadcn/ui-style component primitives
- Prisma + SQLite (structured for Postgres migration later)
- Server Actions for mutations
- Zod-based AI output parsing + validation

## Core Workflow

1. Create a campaign from a template arc and campaign bible guardrails.
2. Generate a 30-day outline (`3 acts x 10 days`).
3. Approve/regenerate/edit day outlines.
4. Lock outline to prevent drift.
5. Generate all posts or regenerate per-day posts.
6. Approve/edit posts and export the full campaign.

## Routes

- `/` dashboard
- `/brand` brand profile
- `/campaigns/new` campaign wizard
- `/campaigns/[id]` campaign workspace (grid + detail editor)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Initialize DB and seed templates:

```bash
npm run db:generate
npx prisma db push
npm run db:seed
```

4. Run app:

```bash
npm run dev
```

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:seed`

## Environment Variables

```env
DATABASE_URL="file:./dev.db"

AI_PROVIDER="openai" # openai | anthropic | google

OPENAI_API_KEY=""
OPENAI_SMALL_MODEL="gpt-4.1-mini"
OPENAI_LARGE_MODEL="gpt-4.1"

ANTHROPIC_API_KEY=""
ANTHROPIC_SMALL_MODEL="claude-3-5-haiku-latest"
ANTHROPIC_LARGE_MODEL="claude-3-7-sonnet-latest"

GOOGLE_API_KEY=""
GOOGLE_SMALL_MODEL="gemini-2.0-flash"
GOOGLE_LARGE_MODEL="gemini-1.5-pro"

ROUTER_MAX_RETRIES="2"
```

## Model Router Behavior

Location: `lib/ai/router.ts`

- Routes by `taskType`:
  - `OUTLINE_ALL`, `POST_ALL`: prefer large model
  - `OUTLINE_ACT`, `OUTLINE_DAY`, `POST_DAY`: start with small model
- Validation-first generation:
  - Parse strict JSON with Zod
  - Apply task-specific business rules (30 days, 10-day acts, key fields, post constraints)
- Retry/escalation strategy:
  - Small-model tasks: small -> small fix retry -> large fallback
  - Large-model tasks: large -> large fix retries

## AI Provider Architecture

- Provider interface: `lib/ai/types.ts` (`AIProvider`)
- Router + validation: `lib/ai/router.ts`, `lib/ai/validation.ts`
- Prompt templates: `lib/ai/prompts.ts`
- Providers:
  - `lib/ai/providers/openai.ts` (working)
  - `lib/ai/providers/anthropic.ts` (stub)
  - `lib/ai/providers/google.ts` (stub)

### How to Add a New Provider

1. Implement `AIProvider` in `lib/ai/providers/<provider>.ts`.
2. Add env vars for small/large model names + API key.
3. Register provider selection in `lib/ai/providers/index.ts`.
4. Keep output contract unchanged (JSON only), so existing router validation continues to work.

## Notes

- No auth in MVP (single-user local flow).
- Locking is enforced before post generation.
- Unlocking with existing posts prompts drift confirmation.
- Version history is tracked for outline and post edits/regenerations/restores.
