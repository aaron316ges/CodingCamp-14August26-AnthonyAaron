# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal spending transactions, view a categorized expense summary, and visualize spending distribution through an interactive pie chart. The application runs entirely in the browser with no backend server, uses the Local Storage API for persistence, and is built with HTML, CSS, and Vanilla JavaScript only.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Input_Form**: The UI form component used to enter a new transaction.
- **Balance_Display**: The UI component at the top of the page that shows the total balance derived from all transactions.
- **Chart**: The pie chart component that visualizes spending distribution by category.
- **Category**: One of the three predefined expense classifications — Food, Transport, or Fun.
- **Local_Storage**: The browser's built-in Local Storage API used for client-side data persistence.
- **Spend_Limit**: A user-defined monetary threshold used to highlight excessive spending in a category.
- **Theme**: The visual color scheme of the App, either light mode or dark mode.
- **Validator**: The input validation logic that enforces field completeness before a transaction is added.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can log a new expense transaction.

#### Acceptance Criteria

1. THE App SHALL render an Input_Form containing three fields: a text field for item name (maximum 100 characters), a numeric field for amount, and a dropdown selector for Category.
2. THE Input_Form SHALL provide exactly three Category options: Food, Transport, and Fun.
3. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add a new Transaction to the Transaction_List within 1 second.
4. WHEN the user submits the Input_Form, THE Validator SHALL check that the item name field is not empty, the amount field contains a numeric value between 0.01 and 999,999,999.99 inclusive, and a Category has been selected.
5. IF the Validator detects that any required field is empty or invalid, THEN THE Input_Form SHALL display an inline error message adjacent to each offending field identifying the missing or invalid value and SHALL NOT add a Transaction to the Transaction_List.
6. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the Category dropdown to its unselected default state.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my logged transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored Transactions in a scrollable container.
2. THE Transaction_List SHALL show the item name, amount, and Category for each Transaction.
3. WHEN the number of Transactions exceeds the visible height of the Transaction_List container, THE Transaction_List SHALL become vertically scrollable without overflowing the page layout.
4. THE Transaction_List SHALL render a delete button for each Transaction.
5. WHEN the user activates the delete button for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Local_Storage.
6. WHEN no Transactions are stored in Local_Storage, THE Transaction_List SHALL display an informative empty-state message rather than a blank container.
7. IF Local_Storage is inaccessible at render time, THE App SHALL display an error message indicating that stored data could not be loaded instead of silently failing.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total balance at the top of the page, so that I can immediately understand my overall spending.

#### Acceptance Criteria

1. THE Balance_Display SHALL be rendered above all other components at the top of the App viewport.
2. THE Balance_Display SHALL show the sum of all Transaction amounts currently stored, where each Transaction amount is treated as an expense (positive value subtracted from the running total).
3. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total within the same render cycle as the Transaction_List update.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the revised total within the same render cycle as the Transaction_List update.
5. WHEN no Transactions are stored, THE Balance_Display SHALL show a total of 0.
6. THE Balance_Display SHALL format all monetary totals to exactly two decimal places (e.g., 0.00, 12.50, 1,234.56).
7. WHEN the Balance_Display total is negative, THE App SHALL apply a distinct visual style (such as a different color) to differentiate a negative balance from a zero or positive balance.

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a Chart that displays the proportion of total spending for each Category as a pie chart, where each segment's arc length is proportional to that Category's share of the total spending amount across all Transactions.
2. THE Chart SHALL use a charting library (Chart.js or equivalent) loaded via CDN, requiring no local build step.
3. WHEN a Transaction is added, THE Chart SHALL update to reflect the new spending distribution without requiring a page reload.
4. WHEN a Transaction is deleted, THE Chart SHALL update to reflect the revised spending distribution without requiring a page reload.
5. WHEN all Transactions are deleted, THE Chart SHALL hide all segments and display a placeholder message indicating no spending data is available.
6. THE Chart SHALL label each segment with its corresponding Category name and that Category's percentage of total spending, rounded to one decimal place.
7. IF two or more Transactions share the same Category name, THE Chart SHALL aggregate their amounts into a single segment for that Category.
8. IF a Transaction amount is zero or negative, THE Chart SHALL exclude that Transaction from the spending distribution calculation.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialize and write all Transactions to Local_Storage under a fixed, application-specific storage key.
2. WHEN a Transaction is deleted, THE App SHALL serialize and write the updated Transaction collection to Local_Storage under the same application-specific storage key.
3. WHEN the App initializes, THE App SHALL read and deserialize all previously stored Transactions from Local_Storage and render the full Transaction collection in the Transaction_List, Balance_Display, and Chart before accepting user input.
4. IF Local_Storage does not contain any stored Transaction data on initialization, THEN THE App SHALL initialize with an empty Transaction_List, a Balance_Display total of 0, and an empty Chart state.
5. IF Local_Storage contains data under the application-specific storage key that cannot be deserialized into a valid Transaction collection on initialization, THEN THE App SHALL discard the corrupt data, display an error message indicating that saved data could not be loaded, and initialize with an empty Transaction_List, a Balance_Display total of 0, and an empty Chart state.
6. FOR ALL valid Transaction collections written to Local_Storage, reading and re-parsing the stored data SHALL produce a Transaction collection where each Transaction retains its original id, amount, item name, category, and timestamp values with no loss of precision.

---

### Requirement 6: Transaction Sorting

**User Story:** As a user, I want to sort my transactions by amount or by category, so that I can find and review entries more easily.

#### Acceptance Criteria

1. THE App SHALL provide a sort control that allows the user to select exactly one sort order at a time from the following options: by amount ascending (lowest to highest), by amount descending (highest to lowest), or by Category name alphabetically (A to Z); the default state of the sort control SHALL be no sort order selected, displaying Transactions in order of entry from most recent to oldest.
2. WHEN the user selects a sort order, THE Transaction_List SHALL re-render all Transactions in the selected order within 500 milliseconds without modifying the underlying stored data in Local_Storage.
3. WHEN the user selects a sort order and two or more Transactions share the same amount or the same Category name, THE Transaction_List SHALL display those Transactions ordered by date of entry from most recent to oldest as a tiebreaker.
4. WHEN a new Transaction is added while a sort order is active, THE Transaction_List SHALL insert the new Transaction into its correct sorted position within the existing Transaction_List without reordering Transactions that do not share the new Transaction's sort key value.
5. IF the user selects a sort order while the Transaction_List contains zero Transactions, THEN THE App SHALL retain the selected sort order and apply it when the first Transaction is added.

---

### Requirement 7: Spend Limit Highlighting

**User Story:** As a user, I want to set a spending limit and see highlighted warnings when a category exceeds it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide an input field that allows the user to set a numeric Spend_Limit value between 0.01 and 999,999,999.99 inclusive.
2. WHEN the total amount of Transactions in any Category equals or exceeds the Spend_Limit, THE Transaction_List SHALL apply a distinct visual highlight to all Transactions belonging to that Category within 100 milliseconds.
3. WHEN the user updates the Spend_Limit value, THE Transaction_List SHALL re-evaluate and update highlights for all Transactions within 100 milliseconds without a page reload.
4. WHEN a Transaction is deleted and the remaining total for its Category falls below the Spend_Limit, THE Transaction_List SHALL remove the highlight from the Transactions in that Category within 100 milliseconds.
5. IF no Spend_Limit has been set or the Spend_Limit field is empty, THEN THE App SHALL apply no highlights to any Transaction.
6. IF the user enters a non-numeric, negative, or zero value into the Spend_Limit field, THEN THE App SHALL reject the input, display an inline error message adjacent to the Spend_Limit field, and retain the previously valid Spend_Limit value (or no limit if none was previously set).

---

### Requirement 8: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL render a toggle control that switches the Theme between light mode and dark mode, and the toggle SHALL visually indicate the currently active Theme at all times.
2. WHEN the user activates the Theme toggle, THE App SHALL apply the selected Theme to all visible UI components within 100 milliseconds without a page reload.
3. WHEN the App initializes, THE App SHALL apply the Theme last selected by the user if a Theme preference has been stored in Local_Storage.
4. IF no Theme preference is stored in Local_Storage, THEN THE App SHALL apply light mode as the default Theme on initialization.
5. WHEN the user changes the Theme, THE App SHALL write the selected Theme preference to Local_Storage so it persists across sessions.
6. IF reading the Theme preference from Local_Storage fails on initialization, THEN THE App SHALL silently fall back to light mode without displaying an error.
7. IF writing the Theme preference to Local_Storage fails, THEN THE App SHALL apply the selected Theme for the current session without surfacing an error to the user.

---

### Requirement 9: Single-File Constraint and Code Organization

**User Story:** As a developer, I want all styles in one CSS file and all logic in one JavaScript file, so that the codebase remains clean, minimal, and easy to maintain.

#### Acceptance Criteria

1. THE App SHALL load exactly one CSS file located at `css/style.css` for all visual styling, and SHALL NOT load any additional external or inline stylesheets.
2. THE App SHALL load exactly one JavaScript file located at `js/app.js` for all application logic, and SHALL NOT load any additional external or inline scripts beyond the charting library CDN.
3. THE App SHALL operate without a backend server, build tool, or package manager, such that opening `index.html` directly in a browser via the file system produces a fully functional application.
4. THE App SHALL function correctly in the current stable release versions of Chrome, Firefox, Edge, and Safari, where "correctly" means all Acceptance Criteria across all requirements pass without errors or visual defects in each browser.

---

### Requirement 10: Performance and Responsiveness

**User Story:** As a user, I want the app to respond immediately to my interactions, so that adding, deleting, and sorting transactions feels instant.

#### Acceptance Criteria

1. WHEN the user submits the Input_Form, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds, measured from the moment the submit event fires to the moment all three UI elements reflect the new state, on a modern desktop browser with fewer than 500 stored Transactions.
2. WHEN the user deletes a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds, measured from the moment the delete action is triggered to the moment all three UI elements reflect the removed state, on a modern desktop browser with fewer than 500 stored Transactions.
3. WHEN the App is opened in a browser, THE App SHALL complete rendering of the initial page and display all stored Transactions within 2 seconds, measured from the time the browser begins parsing `index.html` to the time all stored Transactions are visible in the Transaction_List, assuming local file system access.
4. IF the number of stored Transactions equals or exceeds 500, THEN THE App SHALL display a warning message indicating that performance may degrade beyond the supported Transaction limit.
