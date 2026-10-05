# Agentic Data Migration Planner and Reconciliation Workbench

This is a full-stack solution for the Aggroso Expert Data Migration assignment.

## Overview
This application helps plan and validate the migration of a bounded legacy dataset from a source schema to a target schema using an AI Agent. The agent inspects schemas and data, and proposes declarative transformation rules. The user reviews, dry-runs, and executes the migration into a persistent Aiven MySQL target database.

## Setup & Running

1. **Prerequisites:** Node.js v22+
2. **Install dependencies:**
   \`\`\`bash
   cd server && npm install
   cd ../client && npm install
   cd ..
   \`\`\`
3. **Environment setup:**
   Copy `.env.example` to `.env` in the root (or `server/` dir). Add your `GROQ_API_KEY`. If you don't add one, the app safely defaults to a hardcoded heuristic fallback so reviewers can still test the UI flow deterministically.
4. **Run both frontend and backend:**
   \`\`\`bash
   npm run dev
   \`\`\`
   - Frontend runs on `http://localhost:5173`
   - Backend API runs on `http://localhost:3000`

## Architecture & Domain
Following clean code principles, the backend features a robust Domain layer independent of the Express transport:
- **Domain Layer (`rules.ts`, `transformEngine.ts`):** Pure deterministic rules (copy, map_values, split, trim, parse_date) and the engine that applies them.
- **Agent Service (`agentService.ts`):** Invokes the LLM (Llama 3 via Groq) with function calling.
- **Data Layer (`db.ts`):** `better-sqlite3`. Uses an `app.db` for storing plans/runs, and a `mock_target.db` with `accounts` and `migration_lineage` tables for target execution.

## Completed Scope
- **AI Agent Proposal:** LLM-driven field mapping and risk identification.
- **Deterministic Dry Run:** Validates mappings without touching the target. Quarantines invalid records with field-level errors.
- **Idempotency & Execution:** Generates an idempotency key (SHA-256) per source record. Executing a retry correctly uses `ON CONFLICT DO NOTHING` to prevent duplicates and logs skipped counts.
- **Rollback:** Fully reverses a migration using the `migration_lineage` table to trace `account_id` back to the run, deleting target rows and lineage cleanly.
- **Reconciliation/History:** Timelines of plan approvals, execution, and rollbacks.

## Excluded Scope & Limitations
- **No live cloud DB:** Uses local SQLite to mock the target store.
- **No arbitrary code:** The agent cannot write Python/JS scripts. It must compose rules from a strictly whitelisted `RuleRegistry`.
- **Bounded to 500 records:** By design, the source data is mocked to a small set (the assignment limit is up to 500 records).
- **Authentication:** Skipped for this assignment; an arbitrary approver name is logged.

## Tests
Focused tests use `vitest` in the `server` package. They test the core rules and the transform engine behavior on success and failure paths.
Run with:
\`\`\`bash
cd server && npm test
\`\`\`

## Deployment Details
**Vercel & Render Setup:**
- The `client` folder can be deployed to Vercel (root dir: `client`, build command: `npm run build`). Set `VITE_API_URL` to the Render backend URL.
- The `server` folder can be deployed as a Render Web Service (root dir: `server`, build command: `npm install`, start command: `npm start`). Add a Persistent Disk mounted to `data/` so `app.db` and `mock_target.db` persist across deploys. 
- A live deployment URL and sample login/auth (none required) will be supplied via the Aggroso submission form.
