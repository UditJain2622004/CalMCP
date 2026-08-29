# NutriTrack — Local-First Calorie & Nutrition Tracker with WebMCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**NutriTrack** is a modern, privacy-focused, local-first calorie and nutrition tracking application built with **React**, **TypeScript**, **Vite**, and **Dexie (IndexedDB)**. It integrates seamlessly with browser AI agents using the **WebMCP (Model Context Protocol)** browser specification (`document.modelContext` / `navigator.modelContext`).

---

## 🌟 Key Features

- **Local-First & Private:** All food logs, weight entries, hydration metrics, and user goals remain 100% local inside your browser's IndexedDB.
- **WebMCP Native Tools:** Exposes 14+ structured WebMCP tools directly to browser AI agents for intelligent meal logging, daily summary reviews, goal updates, and progress reports.
- **Real-Time Reactive UI:** Live UI synchronization powered by Dexie mutation observers—UI views update automatically when AI agents write or update records.
- **Combined AI Meal Logging:** Allows AI models to analyze user-attached meal photos and log detailed food items with calories and macro breakdowns in a single execution step via `create_meal_draft`.
- **Hackathon Product Catalog Tool:** Includes the required `search_products` tool registered via `document.modelContext.registerTool` to list all available WebMCP tools.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0 or later
- **npm** or **yarn**

### Setup & Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/UditJain2622004/CalMCP.git
cd CalMCP

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🤖 WebMCP Tool Registration

Tools are automatically registered on app startup using the standard WebMCP API:

```javascript
document.modelContext.registerTool({
  name: "search_products",
  description: "Search the product catalog",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Optional search query" }
    }
  },
  execute: async (input) => {
    // Returns all available WebMCP tools in the application
  }
});
```

### Available WebMCP Tools

| Tool Name | Type | Description |
| :--- | :--- | :--- |
| `search_products` | Required | Returns all registered WebMCP tools available in the application. |
| `create_meal_draft` | Action | Creates and logs a confirmed meal directly into daily intake from AI analysis. |
| `update_meal_draft` | Action | Updates or corrects a logged meal entry or draft by ID with updated items. |
| `get_user_context` | Context | Returns user preferences, timezone, targets, and locale. |
| `get_daily_summary` | Report | Returns daily calorie budget, macro intake, and hydration totals. |
| `get_meal` | Query | Retrieves a specific meal by ID with itemized nutrition details. |
| `list_meals` | Query | Lists meals for a given date range with pagination support. |
| `delete_meal` | Action | Deletes a meal by ID and updates daily totals. |
| `find_frequent_meals` | Memory | Searches frequent food items for quick re-logging. |
| `repeat_meal` | Action | Re-logs a past meal to today's intake. |
| `get_progress_report` | Report | Generates multi-day nutrition and weight trend reports. |
| `log_weight` | Action | Records a body weight entry in kg or lbs. |
| `get_weight_progress` | Query | Retrieves weight trend history. |
| `log_water` | Action | Adds water intake in milliliters. |
| `get_hydration_summary` | Query | Returns hydration consumed vs target. |

---

## 🛠️ Tech Stack

- **Framework:** React 19, React Router v7
- **Build Tool:** Vite 8, TypeScript
- **Database:** Dexie.js (IndexedDB)
- **Styling:** CSS Modules with Design Tokens & Modern SaaS UI
- **Schema Validation:** Zod
- **Icons:** Lucide React

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
