# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a purely client-side Expense & Budget Visualizer using HTML, CSS (one file), and Vanilla JavaScript (one IIFE-wrapped file). Chart.js v4 is loaded via jsDelivr CDN. All state lives in memory and is persisted to `localStorage`. The render pipeline is `renderAll()` → `renderBalance()` + `renderList()` + `renderChart()`. No backend, no build step — `index.html` opens directly in a browser.

---

## Tasks

- [ ] 1. Scaffold project structure and create static HTML skeleton
  - Create `index.html` at the project root with correct `<!DOCTYPE html>`, `<html lang="en">`, `<head>` (charset, viewport, title, `<link>` to `css/style.css`), and `<body>`.
  - Add the Chart.js v4 CDN `<script>` tag (`https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js`) and a deferred `<script src="js/app.js">` tag.
  - Create empty placeholder files: `css/style.css` and `js/app.js`.
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Build the complete HTML document structure
  - [x] 2.1 Add semantic HTML body content matching the design's HTML structure spec
    - Write the `<header>` with `<h1>` and `#theme-toggle` button (`aria-label="Toggle dark/light mode"`).
    - Write `<main>` containing all five sections: `#balance-section`, `#form-section`, `#controls-section`, `#list-section`, `#chart-section`.
    - Include `#balance-amount` display element, `#transaction-form` with all three field groups (`#item-name`, `#amount`, `#category` dropdown with Food/Transport/Fun options, plus `#error-*` `<span role="alert">` elements), and the submit button.
    - Include `#controls-section` with `#sort-select` (four options: default, amount-asc, amount-desc, category-az) and `#spend-limit` input with its error span.
    - Include `#list-section` with `#error-banner`, `<ul id="transaction-list" aria-live="polite">`, and `#empty-state` paragraph.
    - Include `#chart-section` with `<h2>`, `#chart-placeholder`, and `<canvas id="spending-chart" role="img" aria-label="Pie chart of spending by category">`.
    - _Requirements: 1.1, 1.2, 2.1, 2.6, 3.1, 4.1, 6.1, 7.1, 8.1, 9.1_

- [x] 3. Implement CSS theming and layout
  - [x] 3.1 Define CSS custom properties and base styles
    - Declare `:root` and `[data-theme="dark"]` blocks using CSS custom properties for all colour tokens: background, surface, text-primary, text-secondary, accent, error-color, highlight-color, border.
    - Write `body`, `header`, `main`, `section`, `button`, `input`, `select` base styles using only the custom property tokens.
    - Style `.error-msg` (inline error text, error-color, initially hidden), `.error-banner` (visible error block), and `.hidden` utility class.
    - _Requirements: 8.1, 8.2, 9.1_
  - [x] 3.2 Style UI components
    - Style `#balance-section` so it appears above all other components; style `.balance` class and add a `.balance--negative` modifier rule that applies a distinct colour (maps to the negative-balance visual style).
    - Style `#form-section`, `.field-group`, labels, inputs, the select dropdown, and the submit button with comfortable spacing and focus indicators.
    - Style `#controls-section` with inline layout for sort and spend-limit controls.
    - Style `#list-section` `<ul>` as a scrollable container (`max-height`, `overflow-y: auto`) so it scrolls without overflowing the page layout.
    - Style `<li>` transaction rows with item name, amount, category label, and delete button. Add `.highlighted` modifier rule for spend-limit over-threshold rows.
    - Style `#chart-section` with appropriate sizing for the canvas element; hide `#chart-placeholder` by default.
    - _Requirements: 2.3, 3.7, 7.2, 9.1_

- [x] 4. Implement the JavaScript state model and IIFE scaffold
  - [x] 4.1 Write IIFE wrapper, constants, and state object
    - Wrap all JS in `(function () { 'use strict'; ... })();`.
    - Declare `STORAGE_KEY = 'ebv_transactions'` and `THEME_KEY = 'ebv_theme'` constants.
    - Declare `CATEGORIES = ['Food', 'Transport', 'Fun']` constant.
    - Declare the `state` object: `{ transactions: [], sortOrder: null, spendLimit: null, theme: 'light' }`.
    - Write the `isValidTransaction(t)` schema-check function matching the design spec (checks id, name, amount, category, timestamp types and category whitelist).
    - _Requirements: 5.1, 5.2, 9.2_

- [x] 5. Implement localStorage persistence functions
  - [x] 5.1 Implement `loadFromStorage()` and `saveTransactions()`
    - Write `saveTransactions()`: wraps `localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions))` in `try/catch`; silently swallows write errors.
    - Write `loadFromStorage()`: reads `localStorage.getItem(STORAGE_KEY)` in a `try/catch`; on read/parse error or when any item fails `isValidTransaction`, sets `state.transactions = []` and flags `showErrorBanner('Stored data could not be loaded. Starting with an empty list.')`.
    - If stored value is `null` (no prior data), initialise `state.transactions = []` silently.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 2.7_
  - [ ]* 5.2 Write property test for Transaction storage round-trip
    - **Property 1: Transaction Storage Round-Trip**
    - **Validates: Requirements 5.6**
    - Using fast-check: generate `fc.array(transactionArb)`, call `JSON.parse(JSON.stringify(arr))`, assert each field (`id`, `amount`, `name`, `category`, `timestamp`) is strictly equal to the original.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 1: Transaction Storage Round-Trip`

- [x] 6. Implement core Transaction operations
  - [x] 6.1 Implement `addTransaction(name, amount, category)` and `deleteTransaction(id)`
    - `addTransaction`: constructs a Transaction object with `id = crypto.randomUUID()`, `name` (trimmed), `amount = Math.round(raw * 100) / 100`, `category`, `timestamp = Date.now()`; pushes to `state.transactions`; calls `saveTransactions()` then `renderAll()`.
    - `deleteTransaction`: filters `state.transactions` by id; calls `saveTransactions()` then `renderAll()`.
    - _Requirements: 1.3, 2.4, 2.5, 5.1, 5.2_

- [x] 7. Implement form validation and submission handler
  - [x] 7.1 Implement `validateForm()` and form submit event listener
    - Write `validateForm()`: clears all `#error-*` spans; checks name field (non-empty after trim, ≤ 100 chars), amount field (finite number, 0.01 ≤ value ≤ 999,999,999.99), and category (one of CATEGORIES); injects inline error text into respective `<span role="alert">` on failure; returns `true` only when all fields pass.
    - Attach `submit` listener on `#transaction-form`: call `validateForm()`; if valid, call `addTransaction(name, amount, category)` and reset the form (name → empty, amount → empty, category → `''`); if invalid, do not add.
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  - [ ]* 7.2 Write property test for whitespace name rejection
    - **Property 3: Whitespace Names Are Rejected**
    - **Validates: Requirements 1.4, 1.5**
    - Using fast-check: generate `fc.stringMatching(/^\s+$/)`, assert `validateForm()` (with that string as the name input value) returns `false` and leaves `state.transactions` unchanged.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 3: Whitespace Names Are Rejected`
  - [ ]* 7.3 Write property test for amount boundary enforcement
    - **Property 4: Amount Boundary Enforcement**
    - **Validates: Requirements 1.4, 1.5**
    - Using fast-check: generate out-of-range values via `fc.oneof(fc.float({ max: 0 }), fc.float({ min: 1e9 }))`, assert validation rejects them and `state.transactions` is unchanged.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 4: Amount Boundary Enforcement`

- [x] 8. Implement `renderBalance()`
  - [x] 8.1 Write the balance render function
    - Compute `total = -(sum of all state.transactions amounts)` using a `reduce`; format with `.toFixed(2)`.
    - Write the formatted value into `#balance-amount`.
    - Toggle the `.balance--negative` CSS class on the element when `total < 0`; remove it otherwise.
    - When `state.transactions` is empty, display `$0.00`.
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7_
  - [ ]* 8.2 Write property test for balance sum correctness
    - **Property 2: Balance Sum Correctness**
    - **Validates: Requirements 3.2, 3.6**
    - Using fast-check: generate `fc.array(transactionArb, { minLength: 1 })`, call `renderBalance()`, assert the displayed text equals `(-(sum)).toFixed(2)`.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 2: Balance Sum Correctness`

- [x] 9. Implement `getSortedTransactions()` and `renderList()`
  - [x] 9.1 Implement `getSortedTransactions()`
    - Return a shallow copy of `state.transactions` sorted according to `state.sortOrder`.
    - `'amount-asc'`: sort by amount ascending; `'amount-desc'`: sort by amount descending; `'category-az'`: sort by category name A→Z; `null`: sort by timestamp descending (newest first).
    - For equal sort keys, always use timestamp descending as the tiebreaker (stable secondary sort).
    - _Requirements: 6.1, 6.3_
  - [ ]* 9.2 Write property test for sorting stability
    - **Property 5: Sorting Stability**
    - **Validates: Requirements 6.3**
    - Using fast-check: generate `fc.array(transactionArb)` with injected duplicate sort keys; for each sort order, assert all ties are broken by descending timestamp.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 5: Sorting Stability`
  - [ ]* 9.3 Write property test for sort storage immutability
    - **Property 8: Sort Does Not Mutate Storage**
    - **Validates: Requirements 6.2**
    - Using fast-check: generate `fc.array(transactionArb)` and `fc.constantFrom('amount-asc', 'amount-desc', 'category-az')`; capture `localStorage.getItem(STORAGE_KEY)` before and after a sort order change; assert strings are identical.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 8: Sort Does Not Mutate Storage`
  - [x] 9.4 Implement `renderList()`
    - Call `getSortedTransactions()` to get the display list.
    - If the list is empty, hide `<ul>` and show `#empty-state`; otherwise show `<ul>` and hide `#empty-state`.
    - For each transaction, build an `<li>` containing: item name, formatted amount (`.toFixed(2)`), category label, and a delete `<button>` with a `data-id` attribute.
    - Apply the `.highlighted` class to rows whose category total (`getCategoryTotal(category)`) is ≥ `state.spendLimit` when `state.spendLimit` is non-null.
    - Attach a click handler on each delete button that calls `deleteTransaction(id)`.
    - If `state.transactions.length >= 500`, show the performance warning banner; otherwise hide it.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.4, 7.2, 7.4, 7.5, 10.4_

- [x] 10. Implement `getCategoryTotal()` and spend limit handling
  - [x] 10.1 Implement `getCategoryTotal(category)` and spend limit event listener
    - `getCategoryTotal(category)`: sums `amount` for all transactions in the given category; returns `0` if none.
    - Attach `input` listener on `#spend-limit`: parse the value as a float; if valid (finite, 0.01–999,999,999.99), set `state.spendLimit` and clear the error span, then call `renderList()`; if invalid (non-numeric, ≤ 0, > 999,999,999.99, or empty after clearing), display inline error and retain previous `state.spendLimit`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [ ]* 10.2 Write property test for spend limit highlighting completeness
    - **Property 7: Spend Limit Highlighting Completeness**
    - **Validates: Requirements 7.2, 7.4**
    - Using fast-check: generate `fc.array(transactionArb)` and `fc.float({ min: 0.01 })`; after `renderList()`, assert every `<li>` has `.highlighted` if-and-only-if its category total ≥ spend limit.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 7: Spend Limit Highlighting Completeness`

- [x] 11. Implement `getChartData()` and `renderChart()`
  - [x] 11.1 Implement `getChartData()` and initialise Chart.js instance
    - `getChartData()`: group transactions by category, summing only positive-amount entries; return `{ labels: string[], data: number[] }` — omit categories with a zero or negative aggregate.
    - On `DOMContentLoaded`, instantiate a Chart.js `'doughnut'` (or `'pie'`) chart on `#spending-chart` and store the instance in a closure variable.
    - _Requirements: 4.1, 4.2, 4.7, 4.8_
  - [x] 11.2 Implement `renderChart()`
    - Call `getChartData()` to get labels and data.
    - If data is empty (all transactions deleted or all amounts ≤ 0), hide `<canvas>` and show `#chart-placeholder`; otherwise show `<canvas>` and hide `#chart-placeholder`.
    - Update the existing Chart.js instance in-place: set `chart.data.labels`, `chart.data.datasets[0].data`, and call `chart.update()` — do not destroy/recreate.
    - Configure segment labels to show category name and percentage of total rounded to one decimal place.
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [ ]* 11.3 Write property test for chart aggregation correctness
    - **Property 6: Chart Aggregation**
    - **Validates: Requirements 4.1, 4.7, 4.8**
    - Using fast-check: generate `fc.array(transactionArb)`, call `getChartData()`, assert each category's data value equals the sum of positive-amount transactions for that category.
    - Tag comment: `// Feature: expense-budget-visualizer, Property 6: Chart Aggregation`

- [x] 12. Implement theme toggle
  - [x] 12.1 Implement `applyTheme(theme)`, `loadTheme()`, `saveTheme()`, and toggle listener
    - `applyTheme(theme)`: sets `document.body.dataset.theme` to `'light'` or `'dark'`; updates the toggle button icon (e.g. 🌙 for light, ☀️ for dark) to indicate the currently active theme.
    - `loadTheme()`: reads `localStorage.getItem(THEME_KEY)` in a `try/catch`; on success applies the stored theme; on failure or missing key silently falls back to `'light'`.
    - `saveTheme()`: writes `state.theme` to `localStorage.getItem(THEME_KEY)` in a `try/catch`; silently swallows write errors.
    - Attach `click` listener on `#theme-toggle`: toggle `state.theme` between `'light'` and `'dark'`; call `applyTheme(state.theme)` and `saveTheme()`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 13. Implement sort control and performance guard
  - [x] 13.1 Implement sort event listener and 500-transaction warning
    - Attach `change` listener on `#sort-select`: update `state.sortOrder` to the selected value (or `null` for the default option); call `renderList()` only (do not call `saveTransactions()`).
    - Inside `renderList()`, after building the list, if `state.transactions.length >= 500` show a persistent banner: "Performance warning: you have 500 or more transactions. The app may slow down."; otherwise hide it.
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 10.4_

- [x] 14. Implement error banner helper and `showErrorBanner()`
  - [x] 14.1 Write `showErrorBanner(msg)` and `hideErrorBanner()`
    - `showErrorBanner(msg)`: removes `hidden` from `#error-banner` and sets its `textContent` to `msg`.
    - `hideErrorBanner()`: adds `hidden` to `#error-banner`.
    - Call `hideErrorBanner()` on every successful `loadFromStorage()` run.
    - _Requirements: 2.7, 5.5_

- [x] 15. Wire everything together in `init()` and `renderAll()`
  - [x] 15.1 Implement `renderAll()` and `init()`
    - `renderAll()`: calls `renderBalance()`, `renderList()`, `renderChart()` in that order.
    - `init()`: calls `loadFromStorage()`, `loadTheme()`, `renderAll()`, then attaches all event listeners (form submit, delete button delegation, sort change, spend-limit input, theme toggle).
    - Register `init` as the `DOMContentLoaded` callback.
    - _Requirements: 1.3, 3.3, 3.4, 4.3, 4.4, 5.3, 9.3_

- [ ] 16. Checkpoint — verify full integration
  - Open `index.html` directly in a browser (no server). Add a transaction, confirm it appears in the list, balance updates, and chart updates. Delete the transaction and confirm all three views reset. Refresh the page and confirm persistence. Toggle the theme and refresh to confirm it persists. Ensure all automated tests pass. Ask the user if any questions arise.

- [ ] 17. Write unit tests for specific scenarios
  - [ ]* 17.1 Write unit tests for core state and rendering functions
    - Test: empty transaction list → `renderBalance()` shows `$0.00`.
    - Test: single transaction added → `state.transactions.length === 1`, balance updated.
    - Test: transaction deleted → list length decreases, balance updated.
    - Test: form submitted with missing name → inline error shown, list unchanged.
    - Test: form submitted with amount `0` → error shown.
    - Test: form submitted with amount `999999999.99` → accepted.
    - Test: form submitted with amount `1000000000` → error shown.
    - Test: `loadFromStorage()` with valid JSON → transactions populated.
    - Test: `loadFromStorage()` with corrupt JSON → empty state + error banner shown.
    - Test: `loadFromStorage()` with valid JSON containing one invalid item → empty state + error banner shown.
    - Test: chart shows placeholder when all transactions deleted.
    - Test: `state.spendLimit = null` → no `<li>` has `.highlighted`.
    - Test: theme preference persisted to localStorage and re-applied on `loadTheme()`.
    - Test: theme fallback to `'light'` when localStorage read throws.
    - Test: 500-transaction warning banner appears at `state.transactions.length >= 500`.
    - _Requirements: 1.4, 1.5, 2.6, 3.2, 3.5, 4.5, 5.3, 5.4, 5.5, 7.5, 8.3, 8.4, 8.6, 10.4_

- [ ] 18. Final checkpoint — full test suite and cross-browser smoke
  - Ensure all automated unit tests and property tests pass. Verify the application opens without console errors in Chrome, Firefox, and Edge. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 16 and 18) ensure incremental validation after major integration points.
- Property tests use [fast-check](https://fast-check.dev/) loaded via CDN or as a dev dependency; each is tagged with `// Feature: expense-budget-visualizer, Property N: ...`.
- Unit tests run in Node.js with the built-in `node:test` module or in-browser with a `<script>` tag — no build step required.
- The chart is initialised once and updated in-place (`chart.update()`) — never destroyed and recreated.
- All `localStorage` access is wrapped in `try/catch` per the design spec.
- `renderAll()` is the only orchestration function; isolated re-renders (`renderList()` only) are used for sort and spend-limit changes to avoid unnecessary chart redraws.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["3.2", "5.1"] },
    { "id": 2, "tasks": ["5.2", "6.1"] },
    { "id": 3, "tasks": ["7.1", "8.1", "9.1", "10.1", "11.1", "14.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "8.2", "9.2", "9.3", "11.2", "12.1", "13.1"] },
    { "id": 5, "tasks": ["9.4", "10.2", "11.3", "15.1"] },
    { "id": 6, "tasks": ["17.1"] }
  ]
}
```
