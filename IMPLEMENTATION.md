# WebMCP Calorie Tracker — implementation specification

This document is the build contract for the first production-quality version of the app. Implement it in the order given. The product is a mobile-first calorie, nutrition, hydration, and body-progress tracker. It does not contain or call an AI model. Instead, it exposes the app's deterministic data and UI operations as WebMCP tools so the user can use a browser agent of their choice for image interpretation, meal estimation, coaching, and analysis.

The current repository is a fresh Vite 8 + React 19 JavaScript project. Convert it to TypeScript before building features. Do not preserve the Vite demo UI.

## Product boundary

The app owns:

- User profile, preferences, goals, and calculated targets.
- Food diary and manually entered nutrition.
- A staging area where a user can select or photograph a meal.
- Structured drafts produced by an external agent.
- Review and correction before a meal is committed.
- Weight, hydration, history, streaks, summaries, and charts.
- Local persistence and export/import.
- WebMCP tool registration, validation, execution, and agent-friendly results.

The app does not own:

- A vision model, language model, inference API, API key, or chatbot.
- Automatic food recognition when no external agent is present.
- Medical diagnosis or prescriptive health advice.
- A universal food database in the first version.
- Cloud synchronization or user accounts in the first version.

The architecture must leave clean seams for a food database, authentication, and cloud sync later. Do not introduce a backend merely to imitate an AI feature.

## Important WebMCP limitation and the correct photo workflow

As of the August 2026 WebMCP draft and Chrome implementation, imperative tool arguments are JSON. Raw `File`, `Blob`, image, or binary arguments are not standardized. Image input/output is still under discussion in the WebMCP repository. Do not invent an `imageFile`, local file path, blob URL, or base64 tool parameter and assume arbitrary browser agents can use it.

The supported workflow is:

1. The user takes/selects a photo in the app, or attaches the photo directly in their external AI agent.
2. The app stores the selected image locally in IndexedDB and renders it visibly on `/add/photo`.
3. The external agent analyzes the visible page image if it has visual page access, or analyzes the image attached to the agent conversation.
4. The agent calls `create_meal_draft` with structured JSON containing identified foods, servings, calories, macros, and confidence.
5. The app displays a review screen. Low-confidence and estimated values are visibly marked.
6. The user edits or confirms the draft.
7. `commit_meal_draft` persists it only after confirmation policy is satisfied.

The app must also support text-only logging. A user can tell an agent “I ate two eggs and toast”; the agent estimates nutrition and calls `create_meal_draft` without a photo.

`get_pending_photo_context` returns only safe metadata such as capture ID, capture time, MIME type, dimensions, and whether the preview is visible. It must clearly state that it cannot return pixels. A capture ID is a correlation key, not a way for an agent to retrieve a local file.

## Product principles

1. Mobile first is non-negotiable. Design at 360–430 CSS pixels first, then enhance for tablet and desktop.
2. Every AI-supplied nutrition value is an estimate until a human confirms it.
3. The normal UI and WebMCP tools call the same domain services. Never duplicate business logic inside tool callbacks.
4. Read operations are easy and side-effect free. Write, delete, replace, and bulk-edit operations are explicit.
5. The app remains fully usable when `document.modelContext` is unavailable.
6. Every tool response is concise, structured, and actionable. Avoid dumping full histories into an agent context.
7. Store canonical units internally; convert only at the UI and tool boundaries.
8. Dates are local calendar dates; timestamps are UTC ISO strings.
9. Never silently “fix” nutritional totals supplied by an agent. Validate, flag inconsistencies, and let the user or agent correct them.

## Recommended stack

Install current stable releases through npm; do not hardcode versions from this document:

- Runtime: React, TypeScript, Vite.
- Routing: `react-router-dom`.
- Local database: `dexie` over IndexedDB.
- Runtime validation and inferred types: `zod`.
- Forms: `react-hook-form` with the Zod resolver.
- Dates: `date-fns`.
- Charts: `recharts`.
- Icons: `lucide-react`; do not use emoji as interface icons.
- Small UI state: React context or Zustand. Prefer context for app-wide settings and local component state elsewhere. Do not mirror IndexedDB records in a second global store.
- WebMCP: use the native `document.modelContext` API behind a small adapter. `usewebmcp` is allowed, but the adapter must remain the only package-facing integration point because WebMCP is experimental.
- Unit/integration tests: Vitest, React Testing Library, `fake-indexeddb`.
- End-to-end: Playwright with one normal-browser suite and one WebMCP-adapter suite using a fake model context.

Use CSS custom properties and ordinary CSS or CSS Modules. A utility framework is optional, not required. If Tailwind is chosen, still define design tokens centrally rather than scattering arbitrary values.

## Folder structure

Create this structure. Names are intentional so a low-context implementation agent can locate responsibilities.

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  components/
    layout/AppShell.tsx
    layout/BottomNav.tsx
    layout/DesktopRail.tsx
    common/Button.tsx
    common/Card.tsx
    common/EmptyState.tsx
    common/ErrorBoundary.tsx
    common/Modal.tsx
    common/NumberField.tsx
    common/ProgressRing.tsx
    common/SegmentedControl.tsx
    common/Skeleton.tsx
    charts/CalorieTrendChart.tsx
    charts/MacroChart.tsx
    charts/WeightTrendChart.tsx
    meal/FoodItemEditor.tsx
    meal/MealCard.tsx
    meal/MealDraftReview.tsx
  db/
    database.ts
    migrations.ts
    seed.ts
  domain/
    profile/
      profile.schema.ts
      profile.service.ts
      targets.ts
    meals/
      meal.schema.ts
      meal.service.ts
      meal.math.ts
    hydration/
      hydration.schema.ts
      hydration.service.ts
    weight/
      weight.schema.ts
      weight.service.ts
    reports/
      report.schema.ts
      report.service.ts
      insights.ts
    shared/
      dates.ts
      errors.ts
      units.ts
  pages/
    TodayPage.tsx
    AddMealPage.tsx
    PhotoCapturePage.tsx
    MealReviewPage.tsx
    DiaryPage.tsx
    ProgressPage.tsx
    WeightPage.tsx
    HydrationPage.tsx
    GoalsPage.tsx
    SettingsPage.tsx
    AgentToolsPage.tsx
  webmcp/
    model-context.types.ts
    model-context.adapter.ts
    tool-result.ts
    tool-schemas.ts
    register-tools.ts
    workflow-guide.ts
    tools/
      guide.tools.ts
      context.tools.ts
      meal.tools.ts
      report.tools.ts
      body.tools.ts
      hydration.tools.ts
      settings.tools.ts
  styles/
    tokens.css
    global.css
    utilities.css
  test/
    factories.ts
    fake-model-context.ts
```

Rename `main.jsx` to `main.tsx`, remove the demo assets, and replace `App.jsx`, `App.css`, and `index.css`.

## Persistence strategy

Use IndexedDB because meal photos and a growing history do not belong in `localStorage`. Dexie should be the only module that touches IndexedDB directly.

Database name: `webmcp-calorie-tracker`.

Start with schema version 1:

```ts
db.version(1).stores({
  profiles: "id, updatedAt",
  goals: "id, profileId, updatedAt",
  meals: "id, localDate, eatenAt, mealType, status, source, updatedAt",
  mealItems: "id, mealId, normalizedName",
  mealDrafts: "id, captureId, status, createdAt, expiresAt",
  captures: "id, createdAt",
  weightEntries: "id, localDate, recordedAt",
  waterEntries: "id, localDate, recordedAt",
  settings: "key",
  auditEvents: "id, occurredAt, action, entityType, entityId"
});
```

There is one local profile in v1 with the stable ID `local-user`. Keep IDs on records anyway so cloud sync can be added later.

All mutations run in transactions. A tool should never save a meal and fail halfway through its items.

Keep an append-only lightweight audit record for agent-triggered mutations. Store `source: "webmcp"`, tool name, entity ID, timestamp, and a sanitized summary. Do not store the agent’s entire conversation or hidden chain of thought.

Photos are stored as `Blob` values in `captures`. When displaying one, create an object URL and revoke it on unmount. Provide “remove photo” and “delete photos after meal is saved” settings. Default to retaining a photo with its meal locally; clearly disclose that behavior.

## Canonical data model

Use Zod schemas as the source of runtime validation. Export inferred TypeScript types. Tool input schemas may be authored separately as JSON Schema, but they must test against the same fixtures and constraints.

### Profile

```ts
type Profile = {
  id: "local-user";
  displayName?: string;
  birthDate?: string;              // YYYY-MM-DD
  sexForCalculation?: "female" | "male" | "unspecified";
  heightCm?: number;
  currentWeightKg?: number;
  preferredWeightUnit: "kg" | "lb";
  preferredEnergyUnit: "kcal";
  locale: string;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
};
```

`sexForCalculation` is used only because standard BMR formulae require a coefficient. Explain this in UI. If unspecified, do not manufacture a personalized calorie target; allow a manual target.

### Goals and targets

```ts
type Goal = {
  id: string;
  profileId: "local-user";
  type: "lose_weight" | "build_muscle" | "eat_healthier" | "maintain_weight";
  targetWeightKg?: number;
  targetDate?: string;
  activityLevel?: "sedentary" | "light" | "moderate" | "very_active";
  weeklyWeightChangeKg?: number;
  calorieTargetKcal: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  fiberTargetG?: number;
  waterTargetMl: number;
  targetSource: "calculated" | "manual";
  calculation?: {
    formula: "mifflin_st_jeor";
    bmrKcal: number;
    tdeeKcal: number;
    adjustmentKcal: number;
  };
  createdAt: string;
  updatedAt: string;
};
```

Never label a target as medically precise. The calculator is an estimate. Use Mifflin–St Jeor:

- Male coefficient: `10w + 6.25h - 5a + 5`
- Female coefficient: `10w + 6.25h - 5a - 161`
- Activity multipliers: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725.
- Suggested weight-loss adjustment: daily TDEE minus approximately `weeklyWeightChangeKg * 7700 / 7`.
- Suggested muscle-building adjustment: default +250 kcal/day.

Clamp automatically suggested calorie targets to a conservative configurable floor and display a warning rather than claiming medical safety. Do not prevent a manual override. The initial product should default to warnings below 1,200 kcal/day, not personalized medical advice.

Macro targets may be manual. If generated, calculate protein and fat first and assign remaining calories to carbs:

- protein calories = grams × 4
- carbohydrate calories = grams × 4
- fat calories = grams × 9
- alcohol calories = grams × 7 if added later

### Meal and item

```ts
type Meal = {
  id: string;
  localDate: string;               // date in the profile time zone
  eatenAt: string;                 // UTC ISO timestamp
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  notes?: string;
  captureId?: string;
  source: "manual" | "webmcp" | "repeat";
  status: "confirmed";
  totals: Nutrition;
  createdAt: string;
  updatedAt: string;
};

type MealItem = {
  id: string;
  mealId: string;
  name: string;
  normalizedName: string;
  quantity: number;
  unit: "g" | "ml" | "oz" | "piece" | "serving" | "cup" | "tbsp" | "tsp";
  grams?: number;
  brand?: string;
  barcode?: string;
  nutrition: Nutrition;
  confidence?: number;             // 0..1 for external estimates
  estimationNotes?: string;
};

type Nutrition = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  saturatedFatG?: number;
  vitamins?: Array<{
    code: string;                  // e.g. vitamin_c
    amount: number;
    unit: "mg" | "mcg" | "IU";
  }>;
};
```

Nutrition on each item is for the entered quantity, not “per 100 g.” The UI can display per-100-g derived values when grams are known. Meal totals are computed by the app from items; ignore agent-supplied aggregate totals if they disagree. Return a warning in the tool result when item calories differ substantially from `4P + 4C + 9F`, because labels and fiber rounding can cause small legitimate differences.

Numbers must be finite and non-negative. Reject `NaN`, Infinity, negative nutrition, zero quantity, future dates beyond a small clock-skew allowance, and titles longer than their documented limits.

### Meal draft

Drafts isolate uncertain agent output from confirmed history.

```ts
type MealDraft = {
  id: string;
  captureId?: string;
  proposedEatenAt: string;
  proposedMealType: Meal["mealType"];
  proposedTitle: string;
  items: Omit<MealItem, "mealId">[];
  overallConfidence?: number;
  assumptions: string[];
  source: "webmcp" | "manual";
  status: "pending_review" | "committed" | "discarded";
  createdAt: string;
  expiresAt: string;
};
```

Default draft expiry is 24 hours. Cleanup expired drafts at app startup. Never remove a confirmed meal during cleanup.

### Weight and hydration

```ts
type WeightEntry = {
  id: string;
  localDate: string;
  recordedAt: string;
  weightKg: number;
  note?: string;
  source: "manual" | "webmcp";
  createdAt: string;
  updatedAt: string;
};

type WaterEntry = {
  id: string;
  localDate: string;
  recordedAt: string;
  amountMl: number;
  source: "manual" | "webmcp";
  createdAt: string;
};
```

Store kilograms and milliliters only. Convert pounds with `kg = lb × 0.45359237`. BMI is derived, never stored: `weightKg / (heightCm / 100)^2`.

## Domain service contract

Pages and WebMCP tools must call these services:

- `profileService.getProfile()`
- `profileService.updateProfile(input)`
- `profileService.getActiveGoal()`
- `profileService.setGoal(input)`
- `mealService.createDraft(input)`
- `mealService.updateDraft(id, patch)`
- `mealService.commitDraft(id)`
- `mealService.discardDraft(id)`
- `mealService.createManualMeal(input)`
- `mealService.updateMeal(id, input)`
- `mealService.deleteMeal(id)`
- `mealService.repeatMeal(id, eatenAt, mealType?)`
- `mealService.listMeals({ from, to, mealType?, limit?, cursor? })`
- `mealService.getMeal(id)`
- `mealService.findFrequentMeals({ query?, limit })`
- `weightService.addEntry(input)`
- `weightService.listEntries({ from, to })`
- `hydrationService.addWater(input)`
- `hydrationService.getDailyTotal(localDate)`
- `reportService.getDailySummary(localDate)`
- `reportService.getTrend({ metric, from, to, granularity })`
- `reportService.getProgressReport({ from, to })`

Service methods return domain objects or typed `DomainError`s. Never let raw Dexie, browser, or Zod errors leak into tool results.

Use error codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `CONFIRMATION_REQUIRED`
- `PROFILE_INCOMPLETE`
- `UNSUPPORTED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

## WebMCP integration architecture

Use `document.modelContext`, not a backend MCP transport. There is no SSE, stdio, JSON-RPC server, or `/mcp` endpoint.

Create a narrow adapter:

```ts
type RegisteredTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: unknown,
    context: { signal: AbortSignal }
  ) => Promise<string> | string;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

interface ModelContextAdapter {
  isAvailable(): boolean;
  register(tool: RegisteredTool): Promise<() => void>;
}
```

`register` returns an unregister function backed by an `AbortController`. Register tools once from a top-level `WebMCPProvider` after the database is ready. React Strict Mode mounts twice in development; cleanup must prevent duplicate registration.

The app must detect:

```ts
const modelContext =
  document.modelContext ??
  navigator.modelContext; // compatibility fallback only
```

The native current API is `document.modelContext`. Keep the fallback isolated.

If unavailable:

- Do not crash.
- Show “Agent tools unavailable in this browser” on `/agent-tools`.
- Explain the local Chrome testing flag and origin-trial status.
- Keep every manual feature functional.

Tool descriptions should stay under 500 characters, parameter descriptions under 150, names/parameter names under 30 where practical, and individual outputs under about 1,500 characters. These are current Chrome recommendations, not protocol limits.

Every tool output is a JSON string with this envelope:

```ts
type ToolResult<T> =
  | {
      ok: true;
      action: string;
      data: T;
      warnings?: string[];
      nextActions?: Array<{ tool: string; reason: string }>;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string>;
        recoverable: boolean;
      };
      nextActions?: Array<{ tool: string; reason: string }>;
    };
```

Return minimal data. For example, after creating a meal return its ID, totals, daily totals, and remaining budget, not the user's entire diary.

Pass cancellation signals to async service work where possible. Before each write after an awaited operation, check `signal.aborted`.

## Tool catalog

Start with the following tools. Avoid multiple names for the same action. Register static tools by default. If a tool is impossible in the current page state, it should return a recoverable error with the route or prerequisite rather than disappearing unexpectedly.

### 1. `get_app_guide` — meta tool

Purpose: explains the app, available workflows, estimation policy, and which other tools to call. This is one of the requested “tools that teach the agent how to use tools.”

Annotations: `{ readOnlyHint: true, untrustedContentHint: false }`.

Input:

```json
{
  "type": "object",
  "properties": {
    "topic": {
      "type": "string",
      "enum": [
        "overview",
        "log_meal",
        "analyze_photo",
        "daily_review",
        "progress_review",
        "correct_meal",
        "privacy"
      ]
    }
  },
  "required": ["topic"]
}
```

Output must be a compact machine-oriented recipe. Example for `analyze_photo`:

```json
{
  "ok": true,
  "action": "describe_workflow",
  "data": {
    "steps": [
      "Ask the user to stage a photo in the app or attach it to this conversation.",
      "Call get_pending_photo_context if the app photo is staged.",
      "Analyze the image using your own visual capability.",
      "Call create_meal_draft with item-level estimates and confidence.",
      "Ask the user to review the visible draft.",
      "Call commit_meal_draft only after confirmation."
    ],
    "important": "WebMCP cannot transfer the photo pixels to you; captureId is correlation metadata only."
  }
}
```

This tool must not return the complete schemas of every tool; discovery already provides schemas. It teaches sequencing and policies.

### 2. `get_workflow_status` — meta/context tool

Purpose: tells the agent where a workflow currently stands and the single best next action.

Annotations: read-only.

Input:

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "enum": ["log_meal", "daily_review", "progress_review"]
    }
  },
  "required": ["workflow"]
}
```

For `log_meal`, return pending capture metadata, pending draft ID, review status, and a recommended next tool. Do not include image bytes or a full meal history.

This is the second orchestration tool. It makes multi-step execution recoverable after an interruption without forcing the agent to guess state.

### 3. `get_user_context`

Purpose: returns units, locale, time zone, active targets, and only the profile fields necessary for nutrition calculations.

Annotations: read-only.

Input properties: optional `includeBodyMetrics` boolean, default false. Body metrics are sensitive; do not return them unless explicitly requested.

Never include photos, notes, or full history.

### 4. `get_pending_photo_context`

Purpose: reports whether a user-staged photo exists and is visible.

Annotations: read-only.

Input: empty object.

Output:

```json
{
  "captureId": "uuid",
  "createdAt": "ISO timestamp",
  "mimeType": "image/jpeg",
  "width": 1600,
  "height": 1200,
  "previewVisible": true,
  "pixelAccess": "not_available_via_webmcp",
  "instruction": "Analyze the visible preview or the image the user attached to your conversation."
}
```

### 5. `create_meal_draft`

Purpose: creates a reviewable proposed meal from an external agent’s analysis. It does not alter confirmed intake.

Annotations: `{ readOnlyHint: false, untrustedContentHint: false }`.

Input fields:

- optional `captureId`
- `eatenAt` ISO timestamp
- `mealType` enum
- `title`, 1–80 characters
- `items`, 1–30 item objects
- optional `overallConfidence`, 0–1
- `assumptions`, maximum 10 short strings

Each item requires:

- `name`
- `quantity`
- `unit`
- optional `grams`, `brand`, `barcode`
- `nutrition` with calories, protein, carbs, and fat required
- optional fiber and additional nutrients
- optional `confidence`
- optional `estimationNotes`

Normalize names in the service. Recalculate totals. Return validation warnings and `reviewRoute: "/meals/drafts/{id}"`.

### 6. `update_meal_draft`

Purpose: corrects a pending draft before commitment.

Input: `draftId` and either a full replacement `items` array or a constrained patch. Prefer full replacement for v1 because JSON Patch increases agent errors. Include title, time, and meal type as optional fields.

Return updated totals and remaining warnings.

### 7. `commit_meal_draft`

Purpose: converts a pending draft into one confirmed meal.

Input:

```json
{
  "type": "object",
  "properties": {
    "draftId": { "type": "string" },
    "userConfirmed": {
      "type": "boolean",
      "description": "True only after the user reviewed and approved the visible draft."
    }
  },
  "required": ["draftId", "userConfirmed"]
}
```

Reject false with `CONFIRMATION_REQUIRED`. The boolean is not a perfect security boundary; the UI must still show agent activity and provide undo. When standardized `requestUserInteraction()` is available, use it in addition to this policy, behind the adapter. Until then, do not depend on an experimental confirmation API that may be missing.

After commit, navigate or update UI to Today, show the new meal, and offer an Undo action for a short period. Return meal ID, totals, and daily summary.

### 8. `log_meal`

Purpose: direct deterministic logging when the user explicitly wants to skip draft review, such as repeating known data or entering label facts.

Keep this tool out of the first public tool set unless testing shows it is needed. The preferred external-estimate flow is draft then commit. If enabled, require `userConfirmed: true` and accept the same item schema.

### 9. `get_meal`

Purpose: retrieves one meal by ID for correction or explanation.

Annotations: `{ readOnlyHint: true, untrustedContentHint: true }` because user-authored meal names and notes may contain prompt injection text.

### 10. `list_meals`

Purpose: returns a bounded diary interval.

Annotations: read-only + untrusted content.

Input:

- `from` and `to` as local dates
- optional meal type
- optional `limit`, default 20, maximum 50
- optional opaque cursor

Maximum date range is 31 days. Return summarized meals by default. Agents use `get_meal` for details.

### 11. `update_meal`

Purpose: corrects a confirmed meal.

Require meal ID, complete replacement data, and `userConfirmed: true`. Return old and new totals in a compact diff plus updated daily summary.

### 12. `delete_meal`

Purpose: deletes a confirmed meal.

Require meal ID and `userConfirmed: true`. Return a recoverable confirmation error otherwise. Preserve enough information in memory for a short UI Undo; if durable undo is desired later, implement soft-delete.

### 13. `find_frequent_meals`

Purpose: food memory. Finds frequently repeated meals/items by normalized name and nutritional similarity.

Annotations: read-only + untrusted content.

Input: optional query and `limit` up to 10. Rank using count first and recency second. Return reusable meal IDs and summaries.

### 14. `repeat_meal`

Purpose: copies a known confirmed meal to a new timestamp.

Input: source meal ID, new `eatenAt`, optional meal type, `userConfirmed`. Return the new meal and daily summary.

### 15. `get_daily_summary`

Purpose: returns calories, macros, fiber, and hydration consumed/target/remaining for one local date.

Annotations: read-only.

Input: optional `date`; default “today” in profile time zone. Return numeric values, percentages, target status, and meal count. Do not return motivational medical claims.

### 16. `get_progress_report`

Purpose: calculates data and deterministic observations for charts and progress review.

Annotations: read-only.

Input:

- `from`, `to`
- `metrics`: subset of calories, protein, carbs, fat, fiber, water, weight
- `granularity`: day or week

Maximum range: 366 days. Return chart-ready series and concise facts such as average calories, days logged, target-hit count, weight change, and data coverage. The app renders charts; current WebMCP does not standardize returning chart images.

Do not call statistical noise an “insight.” Require at least 3 data points for a trend and disclose sample count.

### 17. `open_progress_view`

Purpose: configures the visible Progress page to a requested range and metrics.

This changes UI navigation/filter state but not user health data. Input mirrors the report range. Return the route and applied filters. This is how an agent can “generate a chart”: it supplies filters and the app renders the chart responsively.

### 18. `log_weight`

Purpose: records one weigh-in.

Input: weight, unit, optional timestamp and note, `userConfirmed`. Convert to kg before saving. Apply broad sanity limits and return BMI only when height exists.

### 19. `get_weight_progress`

Purpose: returns bounded weigh-ins, moving average, change, target gap, and BMI.

Annotations: read-only + untrusted content if notes are returned. Exclude notes by default.

For the chart, show raw points and a seven-entry moving average only when enough observations exist. Never interpolate missing weigh-ins as real measurements.

### 20. `log_water`

Purpose: records consumed water.

Input: amount, unit (`ml`, `l`, `fl_oz`, `cup`), optional timestamp. A small water entry can be directly committed; provide UI Undo. Convert to ml.

### 21. `get_hydration_summary`

Purpose: returns daily amount, target, remaining, and recent entry times.

Annotations: read-only.

### 22. `set_goals`

Purpose: updates the active goal and targets.

This is sensitive because it can materially change guidance. Use a visible form or review screen, require `userConfirmed`, and return a before/after diff. Prefer the Declarative WebMCP API for the settings form so the browser fills the visible controls and the user manually submits it. If imperative registration is used, keep identical confirmation behavior.

## Declarative versus imperative tools

Use imperative tools for:

- Queries and reports.
- Creating/updating drafts.
- Operations that need domain services and structured results.
- Opening configured chart views.

Use declarative form annotations where visible human review is the feature:

- Profile setup.
- Goal and target changes.
- Potentially final draft confirmation.

For declarative forms:

- Use semantic labels and ordinary HTML validation.
- Add `toolname`, `tooldescription`, and useful `toolparamdescription`.
- Do not use `toolautosubmit` for goal changes or destructive actions.
- Listen for `toolactivated` and `toolcancel` to show/clear an “Agent is filling this form” state.
- Style `:tool-form-active` and `:tool-submit-active` with an obvious, accessible outline.
- If using `respondWith`, call `preventDefault()` first and resolve with a concise result.

The app must still work in browsers that ignore these experimental attributes.

## Security and privacy requirements

Nutrition history, body metrics, photos, and goals are sensitive personal data.

- Default tool exposure is same-origin only. Do not set `exposedTo` in v1.
- Never broadly expose tools to `*` or arbitrary origins.
- Set `readOnlyHint: true` accurately.
- Set `untrustedContentHint: true` on tools that return user-entered notes, meal names, brands, or imported data.
- Treat annotations as hints, not authorization.
- Validate every tool argument after receipt with Zod.
- Never execute code, URLs, selectors, SQL, or arbitrary property paths supplied by a tool argument.
- Strip control characters from free text and enforce length limits.
- Do not include external page text in a tool description or privileged instruction.
- Any imported backup is untrusted. Validate schema/version and show a preview before replacing local data.
- Add a privacy screen explaining exactly what is local, what an invoked tool can reveal, and that the external agent has its own privacy policy.
- Add “Delete all local data,” export, and import controls.
- Photos never leave the device through app code in v1. The user may separately share one with their agent; make that distinction explicit.
- Avoid analytics in v1. If product analytics are added, exclude nutrition values, weights, notes, images, tool arguments, and tool outputs.
- Apply a simple in-memory tool execution limiter to accidental loops: e.g. 30 read calls/minute and 10 writes/minute per page. Return `RATE_LIMITED` with retry guidance.
- Log agent mutations visibly in Settings > Agent activity. Allow clearing that local audit log.

Prompt injection is still possible. A meal title or note could contain instructions aimed at an agent. Returning it with `untrustedContentHint` and keeping write tools confirmation-gated reduces risk but does not eliminate it.

## UI and interaction specification

Use the supplied Cal AI screenshots as functional composition references, not assets to copy. Do not reproduce Cal AI branding, logo, exact wording, or proprietary images.

### Visual direction

- Light mode first: warm white page, near-black text, soft gray secondary surfaces.
- Use one fresh green accent for positive progress and active states.
- Use distinct restrained colors for protein, carbs, and fat, with adequate contrast and non-color labels.
- Rounded surfaces, thin borders, restrained shadows, generous spacing.
- Use a clean geometric sans-serif for this app UI. The app is an instrument panel; avoid oversized marketing-site typography.
- Icons are Lucide with text/accessible labels.
- Motion is 150–250 ms and respects `prefers-reduced-motion`.
- Charts use a neutral grid, readable axis labels, visible tooltips, and never rely only on color.

Define tokens in `tokens.css`:

```css
:root {
  --color-bg: #fbfbfa;
  --color-surface: #ffffff;
  --color-surface-muted: #f4f4f2;
  --color-text: #1d1c22;
  --color-text-muted: #74737c;
  --color-border: #e8e7eb;
  --color-accent: #32a66a;
  --color-accent-soft: #e8f6ee;
  --color-danger: #c84a4a;
  --color-protein: #df6468;
  --color-carbs: #c98c49;
  --color-fat: #5d88d6;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --content-mobile: 480px;
  --content-desktop: 1120px;
}
```

Dark mode can be added after core flows pass; do not delay v1 for it.

### Responsive layout

At widths below 768 px:

- Single-column app.
- Sticky top summary where useful.
- Fixed bottom navigation with Today, Diary, Progress, Settings.
- Floating Add button above the navigation.
- Respect `env(safe-area-inset-bottom)`.
- Main content width 100%, minimum 16 px side padding.
- Tap targets at least 44×44 CSS pixels.
- Never require hover.
- Forms use correct mobile input modes.
- Photo capture uses `<input type="file" accept="image/*" capture="environment">` with library fallback.

At 768–1023 px:

- Content can use two columns for summaries and charts.
- Bottom navigation may remain if touch-first.

At 1024 px and above:

- Replace bottom navigation with a left rail.
- Limit main content to approximately 1120 px.
- Today page uses a summary column and diary column.
- Progress can show two charts side by side where readable.

Test explicitly at 360×800, 390×844, 430×932, 768×1024, 1024×768, and 1440×900. No horizontal page scrolling at any size.

### Today page `/`

Order on mobile:

1. Header with local date and streak.
2. Large calorie budget card: consumed / target, remaining, circular progress.
3. Three macro cards: consumed / target and ring/bar.
4. Water card with quick-add buttons.
5. Meal sections for breakfast, lunch, dinner, snack.
6. Floating Add button.

Over-target values remain truthful; show `250 over`, not negative remaining without explanation. Progress rings may exceed 100% visually only via an over-target state, not by wrapping around.

### Add meal `/add`

Show choices:

- Take/select photo.
- Enter meal manually.
- Repeat frequent meal.
- Scan barcode (phase 2 unless a food data provider is chosen).

Do not label photo logging “AI analysis” inside the app. Label it “Use your agent to analyze,” with a short explanation.

### Photo capture `/add/photo`

- Camera/library chooser.
- Client-side preview and optional compression for storage.
- Capture metadata.
- “Photo ready for your agent” state.
- Plain instructions: open/use the browser agent and ask it to analyze the visible meal, or attach the photo in the agent.
- Show whether WebMCP is available and which tools are relevant.
- Never claim the agent has read the image until a draft arrives.

### Draft review `/meals/drafts/:id`

This is the key trust screen.

- Large image at top if present.
- Meal title, timestamp, type.
- Calories and macro total.
- Editable item list.
- Each item has quantity, unit, nutrition, confidence indicator, and estimation note.
- Highlight values below 0.6 confidence.
- Show assumptions as a separate list.
- “Confirm meal” primary action.
- “Ask agent to revise” helper text that names `update_meal_draft`.
- “Discard” secondary destructive action.

Confirmation must be possible manually even without an agent.

### Diary `/diary`

- Day/week calendar strip.
- Group meals by meal type.
- Search and bounded filtering.
- Edit, delete, and repeat actions.
- Empty state offers manual add and agent workflow instructions.

Virtualization is unnecessary initially; query and render one day or one bounded range.

### Progress `/progress`

Mobile order:

1. Range selector: 7D, 30D, 90D, 6M, 1Y.
2. Summary facts and data coverage.
3. Calories line/bar chart with target reference.
4. Macro adherence chart.
5. Weight trend with goal line.
6. Hydration consistency.

Every chart needs:

- Title.
- Unit.
- Date range.
- Accessible text summary.
- Tooltip usable by touch and pointer.
- No false interpolation.
- Empty/insufficient-data state with exact requirement.

Chart generation is deterministic local rendering from `reportService`; no model is needed.

### Weight `/weight`

- Current weight and target.
- Log weight form.
- Trend and optional moving average.
- BMI only when height exists, with neutral category wording and a statement that BMI is a limited screening measure.

### Goals `/goals`

- Goal type.
- Body/profile inputs needed for calculations.
- Calculated estimate breakdown.
- Manual override.
- Macro and water targets.
- Review before save.

Never use shame-based language, red failure states for ordinary food choices, or “good/bad food” labels.

### Agent tools `/agent-tools`

This page makes the product understandable:

- WebMCP availability badge.
- Experimental browser support notice.
- Registered tool names grouped into Read, Draft, Write, Navigation.
- Last 10 local agent actions.
- Photo workflow explanation.
- Button to stage a sample/manual workflow.
- Privacy explanation.
- Developer-only inspector panel behind a query flag or development build.

Do not add an in-app chatbot.

## Food memory

Implement memory from local history rather than AI:

- Normalize names: Unicode normalize, lowercase, trim, collapse spaces, remove punctuation that does not affect identity.
- A frequent meal signature is a sorted list of normalized item names plus rounded quantities.
- Rank candidates using `score = count * 3 + recencyWeight`.
- Keep original confirmed nutrition; repeating creates a copy so later edits do not mutate history.
- Show “based on N previous logs” in UI.

Do not automatically merge similarly named foods in v1. “Chicken curry” and “chicken salad” are not interchangeable.

## Barcode scope

Barcode scanning cannot be complete without a nutrition database. Implement in phase 2:

1. Use `BarcodeDetector` when available.
2. Fallback to manual barcode text input.
3. Query a chosen food API through a small provider interface.
4. Cache normalized product responses locally with source and fetched timestamp.
5. Always show the label data for review.

Provider interface:

```ts
interface FoodLookupProvider {
  lookupBarcode(
    barcode: string,
    options?: { signal?: AbortSignal }
  ): Promise<FoodLookupResult | null>;
}
```

Do not select or embed a third-party provider key until privacy, terms, rate limits, and attribution are reviewed. A barcode can still be stored manually on a meal item in v1.

## Reports and deterministic analysis

`reportService` produces facts, not prose:

- Daily totals.
- Average per logged day and average per calendar day; label them differently.
- Target adherence count.
- Data coverage: logged days / requested days.
- Weight change from first to last observed entry.
- Moving average where enough points exist.
- Calorie-deficit estimate only when TDEE exists, labeled as an estimate.

The external agent can turn those facts into personalized prose. This keeps the app model-free and makes the numerical source auditable.

Avoid claiming causal relationships, e.g. “carbs caused weight gain.” The tool only returns correlation-ready facts and sample sizes.

## Validation rules

Centralize constants:

- Meal title: 1–80 characters.
- Food name: 1–100.
- Notes: maximum 500.
- Items per meal: 1–30.
- Calories per item: 0–10,000.
- Macros per item: 0–2,000 g.
- Quantity: greater than 0 and no more than 100,000.
- Confidence: 0–1.
- Weight: broad range 20–500 kg; warn on implausible jumps rather than silently accepting.
- Water per entry: 1–5,000 ml.
- List meals: 31-day range, maximum 50 returned.
- Progress report: 366-day range.

These limits defend the app, not define health norms. Error messages must identify the bad field and valid format.

## Error and recovery behavior

Tools must help agents recover:

Bad:

```json
{ "error": "Failed" }
```

Good:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One meal item is invalid.",
    "fieldErrors": {
      "items.1.quantity": "Must be greater than 0."
    },
    "recoverable": true
  },
  "nextActions": [
    {
      "tool": "create_meal_draft",
      "reason": "Retry with a positive quantity for items[1]."
    }
  ]
}
```

UI errors should persist long enough to read, move focus to the error summary, and not discard user-entered values.

## Import and export

Export a versioned JSON backup plus photos as an optional archive in a later increment. The first implementation can export data-only JSON:

```ts
type Backup = {
  format: "webmcp-calorie-tracker";
  version: 1;
  exportedAt: string;
  profile: Profile;
  goals: Goal[];
  meals: Array<Meal & { items: MealItem[] }>;
  weights: WeightEntry[];
  water: WaterEntry[];
};
```

On import:

1. Parse as unknown.
2. Validate.
3. Show counts and date range.
4. Offer merge or replace.
5. Require manual confirmation.
6. Complete in one transaction.

No import/export tool should be exposed to agents in v1.

## Accessibility

- WCAG 2.2 AA target.
- Semantic landmarks, headings, buttons, forms, and labels.
- Visible keyboard focus.
- Bottom navigation exposes current page with `aria-current="page"`.
- Progress rings include readable text; SVG is decorative when equivalent text exists.
- Charts include a nearby textual summary and optionally a screen-reader data table.
- Color is never the only status signal.
- Modal focus is trapped and returns to the invoker.
- Announce successful logging through an `aria-live="polite"` region.
- Respect reduced motion and high zoom.
- Photo controls and agent states have text labels, not icon-only meaning.

## Performance

- Initial JS should not include all charts. Lazy-load Progress and chart components.
- Load photos only for visible meal/draft views; generate thumbnails for diary cards.
- Compress camera images locally for display/storage while optionally retaining original only if the user chooses.
- Query IndexedDB by indexed date ranges.
- Memoize chart data transformations, not ordinary JSX.
- Avoid rerendering the whole app on hydration quick-add.
- Set a storage management screen showing approximate local usage.

## PWA and offline

The core tracker should work offline after first load. Add PWA support only after the data layer is stable:

- Cache app shell and static assets.
- Never cache sensitive API responses from a future food provider without review.
- Explain that WebMCP agent availability may depend on browser/agent connectivity.
- Service worker updates must not destroy open drafts.

## Testing strategy

### Unit tests

- Unit conversions.
- BMR/TDEE and target calculation.
- Nutrition total aggregation.
- Date conversion around midnight and DST.
- BMI.
- Frequent-meal ranking.
- Moving averages and report coverage.
- Every Zod schema boundary.
- Tool result serialization stays under the desired budget for common cases.

### Service tests with fake IndexedDB

- Draft creation does not change daily intake.
- Commit is atomic and idempotence behavior is defined.
- A committed draft cannot be committed twice.
- Delete updates summaries.
- Repeat produces independent records.
- Date-range queries use local dates correctly.
- Import rollback on one invalid record.

### WebMCP adapter tests

Build `FakeModelContext` with `registerTool`, registration map, abort cleanup, and execute helper.

Test:

- All expected names are unique.
- Strict Mode mount/unmount does not leave duplicates.
- Read-only annotations are correct.
- Unknown input is rejected.
- Tool writes use the same services as UI writes.
- Aborted execution does not commit after cancellation.
- Meta tools point only to real registered tool names.
- Output envelopes are valid JSON and bounded.
- Missing native API does not crash.

### Component tests

- Today over-target behavior.
- Draft confidence and assumptions.
- Manual confirmation flow.
- Responsive navigation mode.
- Goal form calculation and override.
- Tool activation/cancellation visual state.

### End-to-end journeys

1. First-run setup → calculated goal → Today.
2. Manual meal → edit → daily totals update.
3. Stage photo → fake agent calls `create_meal_draft` → user edits → confirms.
4. Agent attempts commit without confirmation → rejected → confirms → succeeds.
5. Frequent meal → repeat to today.
6. Weight and water logging → progress chart.
7. Tool unavailable browser → all manual flows still work.
8. Export → clear → import → totals match.

Run accessibility checks and screenshots at all target widths.

## Implementation phases

### Phase 0 — foundation

- Convert to TypeScript.
- Add dependencies and test setup.
- Create design tokens, router, app shell, error boundary.
- Create Dexie database and migrations.
- Add seed data only in development.
- Add fake model context for tests.

Exit criteria: production build, lint, and one smoke test pass; empty app shell works at 360 px without overflow.

### Phase 1 — manual tracker

- Profile/goal onboarding.
- Target calculations.
- Today screen.
- Manual meal create/edit/delete.
- Daily summaries.
- Hydration and weight logging.
- Diary.

Exit criteria: app is useful without WebMCP or AI.

### Phase 2 — draft and photo staging

- IndexedDB capture storage and preview.
- Draft data model and review screen.
- Confidence, assumptions, corrections, commit/discard.
- Frequent meals and repeat.

Exit criteria: a human can stage a photo and manually enter/review the resulting items.

### Phase 3 — WebMCP

- Native adapter and availability UI.
- Register meta/context tools first.
- Register meal draft workflow.
- Add summary/report/body/hydration tools.
- Add visible agent activity and audit records.
- Add declarative annotations to goal/profile forms.
- Test with Chrome WebMCP flag/origin trial and Model Context Tool Inspector.

Exit criteria: an external agent can complete the supported workflows without DOM clicking, while missing WebMCP support remains harmless.

### Phase 4 — charts and polish

- Progress report service.
- Responsive charts and accessible summaries.
- Desktop rail/layout.
- Loading, empty, and failure states.
- Performance and accessibility pass.
- Import/export.

Exit criteria: all required widths, keyboard paths, tests, lint, and production build pass.

### Phase 5 — optional integrations

- Barcode provider.
- PWA/offline shell.
- Cloud account/sync behind repositories.
- Richer nutrient databases.
- WebMCP image content only after it is standardized and supported by target browsers.

## Definition of done

The first release is done when:

- Manual profile, target, meal, hydration, and weight flows work.
- Today, Diary, Draft Review, Progress, Goals, and Agent Tools pages are responsive.
- The app never invokes an AI API.
- A staged photo stays local and the UI accurately explains the external-agent workflow.
- `get_app_guide` and `get_workflow_status` reliably teach/recover workflows.
- Draft creation and confirmed logging are distinct operations.
- Charts are generated locally from persisted data.
- All writes validate and create local audit events when agent-triggered.
- Destructive/sensitive writes require visible review or explicit confirmation and offer recovery where practical.
- WebMCP absence causes a status message, not a broken app.
- There are no duplicate or overlapping public tools.
- `npm run lint`, `npm run build`, unit/integration tests, and critical Playwright journeys pass.
- The UI has no horizontal scrolling at 360 px, bottom controls respect safe areas, and all primary tap targets are at least 44 px.

## References and implementation caveats

- WebMCP draft: https://webmachinelearning.github.io/webmcp/
- Chrome overview: https://developer.chrome.com/docs/ai/webmcp
- Imperative API: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- Declarative API: https://developer.chrome.com/docs/ai/webmcp/declarative-api
- Security guidance: https://developer.chrome.com/docs/ai/webmcp/secure-tools
- Best practices: https://developer.chrome.com/docs/ai/webmcp/best-practices

WebMCP is an experimental Community Group report, not a stable W3C Recommendation. Chrome API details can change. Keep every WebMCP-specific call in `src/webmcp`, test the feature independently, and never make core tracking depend on it.
