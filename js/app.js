// Expense & Budget Visualizer - Application Logic

(function () {
  'use strict';

  // --- Constants ---
  const STORAGE_KEY = 'ebv_transactions';
  const THEME_KEY = 'ebv_theme';
  const CATEGORIES = ['Food', 'Transport', 'Fun'];

  // --- State ---
  const state = {
    transactions: [],   // Transaction[]
    sortOrder: null,    // 'amount-asc' | 'amount-desc' | 'category-az' | null
    spendLimit: null,   // number | null
    theme: 'light',     // 'light' | 'dark'
  };

  // --- Schema Validation ---

  /**
   * Returns true if `t` is a structurally valid Transaction object.
   * @param {*} t
   * @returns {boolean}
   */
  function isValidTransaction(t) {
    return (
      t !== null &&
      typeof t === 'object' &&
      typeof t.id === 'string' &&
      typeof t.name === 'string' &&
      typeof t.amount === 'number' &&
      isFinite(t.amount) &&
      ['Food', 'Transport', 'Fun'].includes(t.category) &&
      typeof t.timestamp === 'number'
    );
  }

  // --- localStorage Persistence ---

  /**
   * Serialises state.transactions to localStorage.
   * Silently swallows any write errors (QuotaExceededError, SecurityError, etc.).
   */
  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
    } catch (e) {
      // Silently fail — in-memory state remains valid for the current session
    }
  }

  /**
   * Reads and validates transactions from localStorage.
   * - null stored value  → initialise to empty array, no error shown
   * - parse error        → initialise to empty array, show error banner
   * - any item invalid   → initialise to empty array, show error banner
   * - success            → populate state.transactions
   */
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      // No data stored yet — silent empty initialisation
      if (raw === null) {
        state.transactions = [];
        hideErrorBanner();
        return;
      }

      const parsed = JSON.parse(raw);

      // Stored value must be an array
      if (!Array.isArray(parsed)) {
        throw new Error('Stored value is not an array');
      }

      // Every item must pass the schema check; discard the whole set if any item fails
      if (!parsed.every(isValidTransaction)) {
        throw new Error('One or more stored transactions failed schema validation');
      }

      state.transactions = parsed;
      hideErrorBanner();
    } catch (e) {
      state.transactions = [];
      showErrorBanner('Stored data could not be loaded. Starting with an empty list.');
    }
  }

  // --- Transaction Mutations ---

  /**
   * Constructs a new Transaction, pushes it to state, persists, and re-renders.
   * @param {string} name     - Item name (will be trimmed)
   * @param {number} amount   - Raw numeric amount (will be rounded to 2 dp)
   * @param {string} category - One of 'Food', 'Transport', 'Fun'
   * @returns {Object} The newly created Transaction object
   */
  function addTransaction(name, amount, category) {
    const transaction = {
      id: crypto.randomUUID(),
      name: name.trim(),
      amount: Math.round(amount * 100) / 100,
      category: category,
      timestamp: Date.now(),
    };
    state.transactions.push(transaction);
    saveTransactions();
    renderAll();
    return transaction;
  }

  /**
   * Removes the Transaction with the given id from state, persists, and re-renders.
   * @param {string} id - UUID of the Transaction to remove
   */
  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(function (t) {
      return t.id !== id;
    });
    saveTransactions();
    renderAll();
  }

  // --- Form Validation ---

  /**
   * Clears all inline error spans, validates the three form fields, and injects
   * error messages for any offending field.
   * @returns {boolean} true only when all fields pass validation
   */
  function validateForm() {
    // Clear all error spans before re-validating
    document.getElementById('error-item-name').textContent = '';
    document.getElementById('error-amount').textContent = '';
    document.getElementById('error-category').textContent = '';

    var name = document.getElementById('item-name').value;
    var amountRaw = document.getElementById('amount').value;
    var category = document.getElementById('category').value;

    var isValid = true;

    // Validate item name: non-empty after trim, max 100 chars
    if (name.trim().length === 0) {
      document.getElementById('error-item-name').textContent = 'Item name is required.';
      isValid = false;
    } else if (name.trim().length > 100) {
      document.getElementById('error-item-name').textContent = 'Item name must be 100 characters or fewer.';
      isValid = false;
    }

    // Validate amount: finite number, 0.01 ≤ value ≤ 999,999,999.99
    var amount = parseFloat(amountRaw);
    if (amountRaw === '' || !isFinite(amount)) {
      document.getElementById('error-amount').textContent = 'A valid amount is required.';
      isValid = false;
    } else if (amount < 0.01 || amount > 999999999.99) {
      document.getElementById('error-amount').textContent = 'Amount must be between $0.01 and $999,999,999.99.';
      isValid = false;
    }

    // Validate category: must be one of the allowed values
    if (!CATEGORIES.includes(category)) {
      document.getElementById('error-category').textContent = 'Please select a category.';
      isValid = false;
    }

    return isValid;
  }

  // --- Form Submit Event Listener ---

  /**
   * Attaches the submit handler on #transaction-form.
   * Validates, then either adds the transaction and resets the form,
   * or leaves the error messages in place.
   */
  function attachFormListener() {
    var form = document.getElementById('transaction-form');
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!validateForm()) {
        return;
      }

      var name = document.getElementById('item-name').value;
      var amount = parseFloat(document.getElementById('amount').value);
      var category = document.getElementById('category').value;

      addTransaction(name, amount, category);

      // Reset form fields to their default empty state
      document.getElementById('item-name').value = '';
      document.getElementById('amount').value = '';
      document.getElementById('category').value = '';
    });
  }

  // --- Spend Limit Event Listener ---

  /**
   * Attaches the input handler on #spend-limit.
   *
   * - Valid value (finite number, 0.01 ≤ value ≤ 999,999,999.99):
   *     sets state.spendLimit, clears the error span, calls renderList().
   * - Empty value:
   *     clears state.spendLimit (no limit), clears the error span, calls renderList().
   * - Invalid value (non-numeric, ≤ 0, > 999,999,999.99):
   *     displays inline error on #error-spend-limit, retains previous state.spendLimit.
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  function attachSpendLimitListener() {
    var input = document.getElementById('spend-limit');
    var errorSpan = document.getElementById('error-spend-limit');
    if (!input || !errorSpan) return;

    input.addEventListener('input', function () {
      var raw = input.value.trim();

      // Empty input → clear the limit (no highlighting)
      if (raw === '') {
        state.spendLimit = null;
        errorSpan.textContent = '';
        renderList();
        return;
      }

      var value = parseFloat(raw);

      if (!isFinite(value) || value < 0.01 || value > 999999999.99) {
        errorSpan.textContent = 'Spend limit must be between $0.01 and $999,999,999.99.';
        // Retain previous state.spendLimit — do not update it
        return;
      }

      // Valid input
      state.spendLimit = value;
      errorSpan.textContent = '';
      renderList();
    });
  }

  // --- Theme ---

  /**
   * Applies the given theme to the document and updates the toggle button icon.
   * - Sets document.body.dataset.theme to 'light' or 'dark'.
   * - Shows 🌙 when the active theme is light (clicking will switch to dark).
   * - Shows ☀️ when the active theme is dark (clicking will switch to light).
   * @param {'light'|'dark'} theme
   *
   * Requirements: 8.1, 8.2, 8.3
   */
  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    state.theme = theme;
  }

  /**
   * Reads the persisted theme from localStorage and applies it.
   * Falls back to 'light' silently if the key is missing or the read fails.
   *
   * Requirements: 8.4, 8.5
   */
  function loadTheme() {
    try {
      var stored = localStorage.getItem(THEME_KEY);
      var theme = (stored === 'dark' || stored === 'light') ? stored : 'light';
      applyTheme(theme);
    } catch (e) {
      applyTheme('light');
    }
  }

  /**
   * Persists state.theme to localStorage.
   * Silently swallows any write errors.
   *
   * Requirements: 8.6
   */
  function saveTheme() {
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch (e) {
      // Silently fail — in-memory state remains valid
    }
  }

  // --- Sort Event Listener ---

  /**
   * Attaches the change listener on #sort-select.
   * Updates state.sortOrder and calls renderList() only — sort is view-only
   * and must NOT persist to localStorage (Requirement 6.2).
   *
   * Requirements: 6.1, 6.2, 6.4, 6.5
   */
  function attachSortListener() {
    var select = document.getElementById('sort-select');
    if (!select) return;
    select.addEventListener('change', function (e) {
      // Empty string (default "Newest First" option) maps to null
      state.sortOrder = e.target.value || null;
      renderList();
    });
  }

  /**
   * Attaches the click listener on #theme-toggle.
   * Toggles state.theme between 'light' and 'dark', then applies and persists.
   *
   * Requirements: 8.7
   */
  function attachThemeToggleListener() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      saveTheme();
    });
  }

  // --- Error Banner Helpers ---

  /**
   * Shows the #error-banner with the given message.
   * @param {string} msg
   */
  function showErrorBanner(msg) {
    var banner = document.getElementById('error-banner');
    if (!banner) return;
    banner.textContent = msg;
    banner.classList.remove('hidden');
  }

  /**
   * Hides the #error-banner.
   */
  function hideErrorBanner() {
    var banner = document.getElementById('error-banner');
    if (!banner) return;
    banner.classList.add('hidden');
  }

  // --- Render: Balance ---

  /**
   * Computes the total balance as the negative sum of all transaction amounts,
   * formats it to two decimal places, and writes it to #balance-amount.
   * Applies .balance--negative when the total is negative; removes it otherwise.
   *
   * Requirements: 3.1, 3.2, 3.5, 3.6, 3.7
   */
  function renderBalance() {
    var total = -(state.transactions.reduce(function (sum, t) {
      return sum + t.amount;
    }, 0));

    var formatted = '$' + total.toFixed(2);
    var el = document.getElementById('balance-amount');
    if (!el) return;

    el.textContent = formatted;

    if (total < 0) {
      el.classList.add('balance--negative');
    } else {
      el.classList.remove('balance--negative');
    }
  }

  // --- HTML Escaping Helper ---

  /**
   * Escapes special HTML characters in a string to prevent XSS when inserting
   * user-provided content via innerHTML.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Category Total ---

  /**
   * Sums all transaction amounts for the given category.
   * Returns 0 if no transactions exist for that category.
   * @param {string} category - One of 'Food', 'Transport', 'Fun'
   * @returns {number}
   */
  function getCategoryTotal(category) {
    return state.transactions.reduce(function (sum, t) {
      return t.category === category ? sum + t.amount : sum;
    }, 0);
  }

  // --- Sorting ---

  /**
   * Returns a shallow copy of state.transactions sorted according to state.sortOrder.
   *
   * Sort orders:
   *   'amount-asc'   → ascending by amount
   *   'amount-desc'  → descending by amount
   *   'category-az'  → alphabetical by category name
   *   null (default) → newest first (descending timestamp)
   *
   * Equal sort keys are broken by descending timestamp (newest first).
   *
   * Requirements: 6.1, 6.3
   * @returns {Transaction[]}
   */
  function getSortedTransactions() {
    var copy = state.transactions.slice();
    copy.sort(function (a, b) {
      var primary = 0;
      if (state.sortOrder === 'amount-asc')  primary = a.amount - b.amount;
      if (state.sortOrder === 'amount-desc') primary = b.amount - a.amount;
      if (state.sortOrder === 'category-az') primary = a.category.localeCompare(b.category);
      // null / default: timestamp descending only (primary stays 0, falls through to tiebreaker)
      if (primary !== 0) return primary;
      return b.timestamp - a.timestamp; // tiebreaker: newest first
    });
    return copy;
  }

  // --- Render: Transaction List ---

  /**
   * Renders the transaction list from state using the current sort order and
   * spend-limit highlight rules.
   *
   * - Empty list  → hides <ul>, shows #empty-state
   * - Non-empty   → shows <ul>, hides #empty-state, builds one <li> per transaction
   * - Each <li> contains: item name, amount, category, and a delete button
   * - Rows whose category total ≥ state.spendLimit get the .highlighted class
   * - Shows a performance warning banner when transaction count ≥ 500
   *
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.4, 7.2, 7.4, 7.5, 10.4
   */
  function renderList() {
    var list = getSortedTransactions();
    var ul = document.getElementById('transaction-list');
    var emptyState = document.getElementById('empty-state');
    var errorBanner = document.getElementById('error-banner');

    if (!ul || !emptyState) return;

    // Toggle empty-state visibility
    if (list.length === 0) {
      ul.classList.add('hidden');
      emptyState.classList.remove('hidden');
    } else {
      ul.classList.remove('hidden');
      emptyState.classList.add('hidden');
    }

    // Rebuild list rows
    ul.innerHTML = '';
    list.forEach(function (t) {
      var shouldHighlight = state.spendLimit !== null &&
        getCategoryTotal(t.category) >= state.spendLimit;

      var li = document.createElement('li');
      if (shouldHighlight) li.classList.add('highlighted');

      li.innerHTML =
        '<span class="t-name">'     + escapeHtml(t.name)     + '</span>' +
        '<span class="t-amount">$'  + t.amount.toFixed(2)    + '</span>' +
        '<span class="t-category">' + escapeHtml(t.category) + '</span>' +
        '<button class="delete-btn" data-id="' + t.id + '" aria-label="Delete ' + escapeHtml(t.name) + '">Delete</button>';

      li.querySelector('.delete-btn').addEventListener('click', function () {
        deleteTransaction(t.id);
      });

      ul.appendChild(li);
    });

    // Performance warning at 500+ transactions
    if (state.transactions.length >= 500) {
      if (errorBanner) {
        errorBanner.dataset.type = 'perf';
        showErrorBanner('Performance warning: you have 500 or more transactions. The app may slow down.');
      }
    } else {
      // Only hide the banner when it was set by the performance guard, not by a data-load error
      if (errorBanner && errorBanner.dataset.type === 'perf') {
        delete errorBanner.dataset.type;
        hideErrorBanner();
      }
    }
  }

  // --- Chart Data Aggregation ---

  /**
   * Groups transactions by category, summing only positive-amount entries.
   * Categories with a zero or negative aggregate are omitted from the result.
   *
   * @returns {{ labels: string[], data: number[] }}
   *
   * Requirements: 4.1, 4.2, 4.7, 4.8
   */
  function getChartData() {
    var totals = {};

    state.transactions.forEach(function (t) {
      if (t.amount > 0) {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      }
    });

    var labels = [];
    var data = [];

    CATEGORIES.forEach(function (cat) {
      if (totals[cat] && totals[cat] > 0) {
        labels.push(cat);
        data.push(Math.round(totals[cat] * 100) / 100);
      }
    });

    return { labels: labels, data: data };
  }

  // --- Chart Instance (closure variable) ---
  var chart = null;

  /**
   * Initialises the Chart.js doughnut chart on #spending-chart.
   * Called once on DOMContentLoaded; the instance is stored in `chart`.
   *
   * Requirements: 4.1, 4.2
   */
  function initChart() {
    var canvas = document.getElementById('spending-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#4f7ef8', '#f0a500', '#e04444'],
          borderColor: ['#3a6de0', '#d4900a', '#c23030'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                var total = context.dataset.data.reduce(function (sum, v) {
                  return sum + v;
                }, 0);
                var value = context.parsed;
                var pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return context.label + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });
  }

  // --- Render: Chart ---

  /**
   * Updates the Chart.js instance in-place using the latest aggregated data.
   *
   * - If no positive-amount data exists, hides the <canvas> and shows
   *   #chart-placeholder.
   * - Otherwise, shows the <canvas>, hides #chart-placeholder, updates
   *   chart.data.labels and chart.data.datasets[0].data, and calls
   *   chart.update().
   * - Segment labels are formatted as "CategoryName (XX.X%)" via the
   *   Chart.js tooltip callback configured at init time.
   *
   * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
   */
  function renderChart() {
    var canvas = document.getElementById('spending-chart');
    var placeholder = document.getElementById('chart-placeholder');

    var chartData = getChartData();

    if (chartData.data.length === 0) {
      // No data — show placeholder, hide canvas
      if (canvas)      canvas.classList.add('hidden');
      if (placeholder) placeholder.classList.remove('hidden');
      return;
    }

    // Data available — show canvas, hide placeholder
    if (canvas)      canvas.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');

    // Guard: chart may not have been initialised yet (e.g. Chart.js not loaded)
    if (!chart) return;

    // Compute total for percentage labels on the datalabels plugin (if used);
    // the tooltip callback in initChart() handles percentages at tooltip time.
    var total = chartData.data.reduce(function (sum, v) { return sum + v; }, 0);

    // Build display labels with inline percentages: "Category (XX.X%)"
    var displayLabels = chartData.labels.map(function (label, i) {
      var pct = total > 0 ? ((chartData.data[i] / total) * 100).toFixed(1) : '0.0';
      return label + ' (' + pct + '%)';
    });

    chart.data.labels = displayLabels;
    chart.data.datasets[0].data = chartData.data;
    chart.update();
  }

  // --- Render: All ---

  /**
   * Master render function — calls all sub-renders in order.
   * Requirements: 3.3, 3.4, 4.3, 4.4
   */
  function renderAll() {
    renderBalance();
    renderList();
    renderChart();
  }

  // --- Initialisation ---

  /**
   * Entry point. Called on DOMContentLoaded.
   * Loads persisted data and theme, initialises the chart, attaches all event
   * listeners, then renders the full UI.
   *
   * Requirements: 1.3, 3.3, 3.4, 4.3, 4.4, 5.3, 9.3
   */
  function init() {
    loadFromStorage();
    loadTheme();
    initChart();
    renderAll();
    attachFormListener();
    attachSortListener();
    attachSpendLimitListener();
    attachThemeToggleListener();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
