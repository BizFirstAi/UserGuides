# Loop Node Documentation: Advanced Scenarios

This section presents **8 detailed, real-world scenarios** with complete working examples. Each scenario includes problem statement, configuration, sample data, flow diagram, and expected output.

---

## Scenario A: Nested Loops with Scope Isolation

### Problem Statement
Process a list of **customers**, and for each customer, process their **orders**. Each order gets validated and an invoice is generated. We need to track both customer and order context without variable leakage.

### Sample Data
```json
{
  "customers": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "orders": [
        { "order_id": 101, "amount": 250.00, "status": "pending" },
        { "order_id": 102, "amount": 500.00, "status": "pending" }
      ]
    },
    {
      "id": 2,
      "name": "Bob Smith",
      "orders": [
        { "order_id": 201, "amount": 150.00, "status": "pending" }
      ]
    }
  ]
}
```

### Loop Node Configuration

**Outer Loop:**
```json
{
  "itemsIterationPropertyName": "customers",
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

### Flow Diagram

```
Outer Loop Node (Iterate customers)
  ├─ Iteration 1: Alice (id=1)
  │  └─ Body:
  │     ├─ DataMapping: Capture outer context
  │     │  Output: { outer_customer: { id, name, ... } }
  │     │
  │     └─ Inner Loop Node (Iterate Alice's orders)
  │        ├─ Iteration 1: Order 101
  │        │  └─ Validate Order
  │        │  └─ Generate Invoice
  │        │  Output: { invoiceId: "INV-101", total: 250 }
  │        │
  │        └─ Iteration 2: Order 102
  │           └─ Validate Order
  │           └─ Generate Invoice
  │           Output: { invoiceId: "INV-102", total: 500 }
  │     
  │     └─ Combine Results
  │        Output: { customer: "Alice", invoices: [INV-101, INV-102] }
  │
  └─ Iteration 2: Bob (id=2)
     └─ Body:
        ├─ DataMapping: Capture outer context
        └─ Inner Loop Node (Iterate Bob's orders)
           ├─ Iteration 1: Order 201
           └─ ...
        └─ Combine Results
           Output: { customer: "Bob", invoices: [INV-201] }

Outer Loop Output (aggregated):
[
  { customer: "Alice", invoices: ["INV-101", "INV-102"] },
  { customer: "Bob", invoices: ["INV-201"] }
]
```

### Body Nodes (Detailed)

**Outer Loop Body - Node 1: Capture Customer Context**
```
Type: DataMapping
Input: @{mem:current_item}
Output:
{
  "customer_id": @{mem:current_item|id},
  "customer_name": @{mem:current_item|name},
  "orders_to_process": @{mem:current_item|orders}
}
```

**Outer Loop Body - Node 2: Inner Loop (Process Orders)**
```
Type: Loop Node
Configuration:
  itemsIterationPropertyName: "orders_to_process"
  maxAllowedCount: 1000
  aggregateResults: true

Inner Loop Body:
├─ Node 1: Validate Order
│  Type: CodeExecute
│  Input: @{mem:current_item}
│  Validation: Check amount > 0, status = "pending"
│  Output: { order_id, amount, valid: true/false }
│
├─ Node 2: Generate Invoice
│  Type: API Call
│  URL: POST https://api.example.com/invoices
│  Body:
│  {
│    "order_id": @{mem:current_item|order_id},
│    "customer_id": @{outer_customer_id},
│    "amount": @{mem:current_item|amount}
│  }
│  Output: { invoice_id, generated_at }
│
└─ Node 3: Log
   Type: Logger
   Message: "Generated invoice for order @{mem:current_item|order_id}"
```

**Outer Loop Body - Node 3: Combine Results**
```
Type: DataMapping
Input: Results from inner loop
Output:
{
  "customer_name": @{customer_name},
  "invoices_generated": @{result|length},
  "invoice_ids": @{result|map(x => x.invoice_id)}
}
```

### Expected Output
```json
[
  {
    "customer_name": "Alice Johnson",
    "invoices_generated": 2,
    "invoice_ids": ["INV-001", "INV-002"]
  },
  {
    "customer_name": "Bob Smith",
    "invoices_generated": 1,
    "invoice_ids": ["INV-003"]
  }
]
```

---

## Scenario B: Conditional Branching with Priority Routing

### Problem Statement
Process a list of **support tickets**. High-priority tickets go to senior support, medium to standard support, low-priority are auto-resolved. We need to route each item to different body subflows based on a property.

### Sample Data
```json
{
  "tickets": [
    { "id": "TK-001", "priority": "high", "issue": "Payment failed" },
    { "id": "TK-002", "priority": "medium", "issue": "Can't login" },
    { "id": "TK-003", "priority": "low", "issue": "Missing feature" },
    { "id": "TK-004", "priority": "high", "issue": "Account locked" }
  ]
}
```

### Loop Node Configuration
```json
{
  "itemsIterationPropertyName": "tickets",
  "sortByExpression": "@{current_item|priority}",
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

**Note:** Sort by priority ensures high-priority tickets are processed first.

### Flow Diagram

```
Loop Node (Iterate tickets)
  ├─ Iteration 1: TK-001 (high)
  │  └─ If-Else Condition: @{mem:current_item|priority} === 'high'
  │     └─ True:
  │        ├─ Assign to Senior Support
  │        ├─ Send Notification: "Escalated to senior team"
  │        └─ Output: { ticket_id, routed_to: "senior" }
  │
  ├─ Iteration 2: TK-002 (medium)
  │  └─ If-Else Condition: @{mem:current_item|priority} === 'medium'
  │     └─ True:
  │        ├─ Assign to Standard Support
  │        ├─ Send Notification: "Assigned to support team"
  │        └─ Output: { ticket_id, routed_to: "standard" }
  │
  ├─ Iteration 3: TK-003 (low)
  │  └─ If-Else Condition
  │     └─ False (neither high nor medium):
  │        ├─ AutoResolve
  │        ├─ Send Notification: "Auto-resolved"
  │        └─ Output: { ticket_id, routed_to: "auto_resolved" }
  │
  └─ Iteration 4: TK-004 (high)
     └─ [same as iteration 1]

Output (aggregated):
[
  { ticket_id: "TK-001", routed_to: "senior" },
  { ticket_id: "TK-002", routed_to: "standard" },
  { ticket_id: "TK-003", routed_to: "auto_resolved" },
  { ticket_id: "TK-004", routed_to: "senior" }
]
```

### Body Nodes (Detailed)

**Loop Body - Node 1: Route Ticket**
```
Type: If-Else
Condition 1: @{mem:current_item|priority} === 'high'
  └─ Branch HIGH:
     Type: API Call
     URL: POST https://api.example.com/assignments/senior
     Body: { ticket_id: @{mem:current_item|id} }
     Output: { ticket_id, assigned_to, routed_to: "senior" }

Condition 2: @{mem:current_item|priority} === 'medium'
  └─ Branch MEDIUM:
     Type: API Call
     URL: POST https://api.example.com/assignments/standard
     Body: { ticket_id: @{mem:current_item|id} }
     Output: { ticket_id, assigned_to, routed_to: "standard" }

Else:
  └─ Branch LOW:
     Type: CodeExecute
     Logic: Mark as auto-resolved
     Output: { ticket_id: @{mem:current_item|id}, routed_to: "auto_resolved" }
```

**Loop Body - Node 2: Log Assignment**
```
Type: Logger
Message: "Ticket @{mem:current_item|id} routed to @{routed_to}"
```

### Expected Output
```json
[
  { "ticket_id": "TK-001", "assigned_to": "John (Senior)", "routed_to": "senior" },
  { "ticket_id": "TK-002", "assigned_to": "Sarah (Standard)", "routed_to": "standard" },
  { "ticket_id": "TK-003", "routed_to": "auto_resolved" },
  { "ticket_id": "TK-004", "assigned_to": "John (Senior)", "routed_to": "senior" }
]
```

---

## Scenario C: Error Handling and Retry

### Problem Statement
Process a list of **payment transactions**. Some transactions may fail due to transient API errors. We want to **retry failed ones**, but if the same transaction fails twice, break and report the error.

### Sample Data
```json
{
  "transactions": [
    { "id": "TX-001", "amount": 100.00, "customer_id": 1 },
    { "id": "TX-002", "amount": 250.00, "customer_id": 2 },
    { "id": "TX-003", "amount": 500.00, "customer_id": 3 }
  ]
}
```

### Loop Node Configuration
```json
{
  "itemsIterationPropertyName": "transactions",
  "retryFailedItems": true,
  "breakOnFirstError": false,
  "timeoutPerIteration": 15000,
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

**Note:** `retryFailedItems: true` + `breakOnFirstError: false` = retry once per item, continue on persistent failures.

### Flow Diagram

```
Loop Node (Iterate transactions)
  ├─ Iteration 1: TX-001 (amount=100)
  │  └─ Process Payment [attempt 1]
  │     └─ API call fails (transient error)
  │     └─ RETRY [attempt 2]
  │        └─ Success
  │        Output: { tx_id: "TX-001", status: "success" }
  │
  ├─ Iteration 2: TX-002 (amount=250)
  │  └─ Process Payment [attempt 1]
  │     └─ Success
  │     Output: { tx_id: "TX-002", status: "success" }
  │
  └─ Iteration 3: TX-003 (amount=500)
     └─ Process Payment [attempt 1]
        └─ API fails (transient error)
        └─ RETRY [attempt 2]
           └─ Fails again (persistent error)
           Output: { tx_id: "TX-003", status: "failed", error: "..." }

Overall Output (aggregated, no break):
[
  { tx_id: "TX-001", status: "success", attempts: 2 },
  { tx_id: "TX-002", status: "success", attempts: 1 },
  { tx_id: "TX-003", status: "failed", attempts: 2, error: "timeout" }
]
```

### Body Nodes (Detailed)

**Loop Body - Node 1: Process Payment with Retry**
```
Type: API Call
URL: POST https://payments.example.com/process
Timeout: 15000 ms (if exceeded, iteration fails and may retry)
Body:
{
  "transaction_id": @{mem:current_item|id},
  "amount": @{mem:current_item|amount},
  "customer_id": @{mem:current_item|customer_id}
}

Retry Behavior (auto-handled by Loop):
  - Attempt 1 fails → Immediate retry (same node)
  - Attempt 2 fails → Log error, continue to next iteration

Output: { transaction_id, status, timestamp }
```

**Loop Body - Node 2: Log Result**
```
Type: Logger
Message: "Transaction @{mem:current_item|id} - Status: @{status}"
```

### Expected Output
```json
{
  "result": [
    {
      "transaction_id": "TX-001",
      "status": "success",
      "timestamp": "2026-06-20T10:15:00Z",
      "attempts": 2
    },
    {
      "transaction_id": "TX-002",
      "status": "success",
      "timestamp": "2026-06-20T10:15:01Z",
      "attempts": 1
    },
    {
      "transaction_id": "TX-003",
      "status": "failed",
      "error": "timeout",
      "attempts": 2
    }
  ],
  "metadata": {
    "itemsProcessed": 3,
    "itemsSucceeded": 2,
    "itemsFailed": 1
  }
}
```

---

## Scenario D: Dynamic Filtering (Process Matching Items Only)

### Problem Statement
Process a list of **product records**. Only process products that match a filter criteria (e.g., status = "active" AND quantity < 10). Skip others without iteration.

### Sample Data
```json
{
  "products": [
    { "id": "P-001", "name": "Widget A", "status": "active", "quantity": 5 },
    { "id": "P-002", "name": "Widget B", "status": "inactive", "quantity": 15 },
    { "id": "P-003", "name": "Widget C", "status": "active", "quantity": 2 },
    { "id": "P-004", "name": "Widget D", "status": "active", "quantity": 20 }
  ]
}
```

### Loop Node Configuration
```json
{
  "itemsIterationPropertyName": "products",
  "filterExpression": "@{current_item|status} === 'active' AND @{current_item|quantity} < 10",
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

**Note:** `filterExpression` runs during setup, before iteration. Items not matching are excluded from the loop entirely.

### Flow Diagram

```
Setup Phase:
  Input: 4 products
  Filter: status === 'active' AND quantity < 10
  Result: P-001 (active, qty=5) ✓, P-003 (active, qty=2) ✓
          (P-002 skipped, P-004 skipped)

Loop Iteration:
  ├─ Iteration 1: P-001 (active, qty=5)
  │  └─ Reorder Stock
  │     └─ Output: { product_id: "P-001", reordered: true }
  │
  └─ Iteration 2: P-003 (active, qty=2)
     └─ Reorder Stock
        └─ Output: { product_id: "P-003", reordered: true }

Output (only 2 items, not 4):
[
  { product_id: "P-001", reordered: true, quantity_requested: 50 },
  { product_id: "P-003", reordered: true, quantity_requested: 50 }
]
```

### Body Nodes (Detailed)

**Loop Body - Node 1: Reorder Stock**
```
Type: API Call
URL: POST https://inventory.example.com/reorder
Body:
{
  "product_id": @{mem:current_item|id},
  "product_name": @{mem:current_item|name},
  "current_stock": @{mem:current_item|quantity},
  "reorder_amount": 50
}

Output: { product_id, reordered, reorder_id }
```

### Expected Output
```json
[
  {
    "product_id": "P-001",
    "product_name": "Widget A",
    "reordered": true,
    "reorder_id": "RO-12345"
  },
  {
    "product_id": "P-003",
    "product_name": "Widget C",
    "reordered": true,
    "reorder_id": "RO-12346"
  }
]
```

---

## Scenario E: Rate Limiting with Batch Processing

### Problem Statement
Process 1000 **emails** to a rate-limited email service. The service allows 20 emails per second. We'll batch process in groups and add delays between batches to stay within limits.

### Sample Data
```json
{
  "emails": [
    { "id": 1, "to": "user1@example.com", "subject": "Newsletter" },
    { "id": 2, "to": "user2@example.com", "subject": "Newsletter" },
    ... (1000 total)
  ]
}
```

### Loop Node Configuration
```json
{
  "itemsIterationPropertyName": "emails",
  "batchSize": 20,
  "parallelExecution": true,
  "batchWaitTimeMs": 1000,
  "maxAllowedCount": 1000,
  "aggregateResults": true
}
```

**Configuration Details:**
- `batchSize: 20` – Process 20 emails at a time
- `parallelExecution: true` – All 20 in a batch run in parallel
- `batchWaitTimeMs: 1000` – Wait 1 second between batches (20 emails / 1 sec = 20/sec)
- 1000 emails / 20 per batch = 50 batches
- Total time ≈ 50 seconds (at rate limit)

### Flow Diagram

```
Loop Execution Timeline:

Batch 1 (20 emails, parallel) ─────────┐
                                       ├─ Wait 1 sec
Batch 2 (20 emails, parallel) ─────────┤
                                       ├─ Wait 1 sec
Batch 3 (20 emails, parallel) ─────────┤
  ...
Batch 50 (20 emails, parallel) ────────┘

Total: ~50 seconds (respects rate limit)
```

### Body Nodes (Detailed)

**Loop Body - Node 1: Send Email**
```
Type: Email Service
To: @{mem:current_item|to}
Subject: @{mem:current_item|subject}
Body: "News Letter Content"

Output: { email_id, sent_to, status, timestamp }

Note: With parallel execution, 20 of these run simultaneously
```

### Expected Output
```json
{
  "result": [
    { "email_id": 1, "sent_to": "user1@example.com", "status": "sent", "timestamp": "..." },
    { "email_id": 2, "sent_to": "user2@example.com", "status": "sent", "timestamp": "..." },
    ... (1000 total)
  ],
  "metadata": {
    "itemsProcessed": 1000,
    "itemsSucceeded": 1000,
    "itemsFailed": 0,
    "batchesExecuted": 50,
    "totalDuration": "50s"
  }
}
```

---

## Scenario F: Data Transformation (Map/Reduce Pattern)

### Problem Statement
Transform a list of **raw transaction records** into a summary report. Normalize amounts, categorize transactions, and aggregate statistics.

### Sample Data
```json
{
  "transactions": [
    { "id": "T1", "date": "2026-06-01", "amount_cents": 50000, "currency": "USD", "type": "sale" },
    { "id": "T2", "date": "2026-06-02", "amount_cents": 25000, "currency": "USD", "type": "refund" },
    { "id": "T3", "date": "2026-06-03", "amount_cents": 75000, "currency": "USD", "type": "sale" }
  ]
}
```

### Loop Node Configuration
```json
{
  "itemsIterationPropertyName": "transactions",
  "aggregateResults": true,
  "maxAllowedCount": 10000
}
```

### Flow Diagram

```
Loop Node (Transform each transaction)

Iteration 1: T1
  ├─ Input: { id: "T1", amount_cents: 50000, currency: "USD", type: "sale" }
  ├─ Normalize Amount: 50000 cents → 500.00 USD
  ├─ Categorize: "sale" → "Revenue"
  └─ Output: { id: "T1", amount: 500.00, category: "Revenue", type: "sale" }

Iteration 2: T2
  ├─ Input: { id: "T2", amount_cents: 25000, currency: "USD", type: "refund" }
  ├─ Normalize Amount: 25000 cents → 250.00 USD
  ├─ Categorize: "refund" → "Expense"
  └─ Output: { id: "T2", amount: 250.00, category: "Expense", type: "refund" }

Iteration 3: T3
  ├─ Input: { id: "T3", amount_cents: 75000, currency: "USD", type: "sale" }
  ├─ Normalize Amount: 75000 cents → 750.00 USD
  ├─ Categorize: "sale" → "Revenue"
  └─ Output: { id: "T3", amount: 750.00, category: "Revenue", type: "sale" }

Aggregated Output:
[
  { id: "T1", amount: 500.00, category: "Revenue" },
  { id: "T2", amount: 250.00, category: "Expense" },
  { id: "T3", amount: 750.00, category: "Revenue" }
]

Reduce (post-loop, downstream node):
  ├─ Total Revenue: $1,250.00
  ├─ Total Expense: $250.00
  └─ Net: $1,000.00
```

### Body Nodes (Detailed)

**Loop Body - Node 1: Normalize Amount**
```
Type: DataMapping
Input: @{mem:current_item}
Output:
{
  "id": @{mem:current_item|id},
  "amount": @{mem:current_item|amount_cents} / 100,  /* convert cents to dollars */
  "currency": @{mem:current_item|currency},
  "type": @{mem:current_item|type}
}
```

**Loop Body - Node 2: Categorize**
```
Type: If-Else
If @{type} === 'sale':
  └─ Output addition: { "category": "Revenue" }
Else (@{type} === 'refund'):
  └─ Output addition: { "category": "Expense" }
```

**Loop Body - Node 3: Format Output**
```
Type: DataMapping
Input: Merged output from previous nodes
Output:
{
  "id": @{id},
  "amount": @{amount},
  "category": @{category}
}
```

**Downstream (After Loop) - Node 4: Aggregate Statistics**
```
Type: CodeExecute
Input: Array from loop aggregation
Logic:
  total_revenue = sum(result where category === 'Revenue')
  total_expense = sum(result where category === 'Expense')
  net = total_revenue - total_expense
Output: { total_revenue, total_expense, net, transaction_count: result.length }
```

### Expected Output (Loop Only)
```json
[
  { "id": "T1", "amount": 500.00, "category": "Revenue" },
  { "id": "T2", "amount": 250.00, "category": "Expense" },
  { "id": "T3", "amount": 750.00, "category": "Revenue" }
]
```

### Expected Output (After Reduce)
```json
{
  "total_revenue": 1250.00,
  "total_expense": 250.00,
  "net": 1000.00,
  "transaction_count": 3
}
```

---

## Scenario G: Cascade Operations (Sequential Processing)

### Problem Statement
Process a list of **documents** through multiple validation and enrichment steps. Each step depends on the output of the previous step (document must be valid before enrichment).

### Sample Data
```json
{
  "documents": [
    { "id": "DOC-001", "content": "Valid PDF content", "file_type": "pdf" },
    { "id": "DOC-002", "content": "Invalid content", "file_type": "txt" },
    { "id": "DOC-003", "content": "Valid Word doc", "file_type": "docx" }
  ]
}
```

### Loop Node Configuration
```json
{
  "itemsIterationPropertyName": "documents",
  "breakOnFirstError": false,
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

### Flow Diagram

```
Loop Node (Process documents sequentially)

Iteration 1: DOC-001
  ├─ Step 1: Validate Format
  │  └─ Check: file_type in ['pdf', 'docx']
  │  └─ Result: VALID
  │
  ├─ Step 2: Extract Metadata
  │  └─ Extract: title, author, creation_date
  │  └─ Result: { title: "...", author: "...", ... }
  │
  ├─ Step 3: Scan for Viruses
  │  └─ API call to scanner
  │  └─ Result: CLEAN
  │
  └─ Step 4: Enrich (OCR)
     └─ Extract text using OCR
     └─ Output: { id, valid: true, metadata, scanned: true, text: "..." }

Iteration 2: DOC-002
  ├─ Step 1: Validate Format
  │  └─ Check: file_type in ['pdf', 'docx']
  │  └─ Result: INVALID (txt not allowed)
  │
  └─ Exit (breakOnFirstError: false, so skip enrichment)
     └─ Output: { id: "DOC-002", valid: false, error: "Unsupported file type" }

Iteration 3: DOC-003
  ├─ Step 1: Validate Format → VALID
  ├─ Step 2: Extract Metadata → { title, author, ... }
  ├─ Step 3: Scan for Viruses → CLEAN
  └─ Step 4: Enrich → { id, valid: true, ... }

Output (aggregated):
[
  { id: "DOC-001", valid: true, metadata: {...}, scanned: true, text: "..." },
  { id: "DOC-002", valid: false, error: "Unsupported file type" },
  { id: "DOC-003", valid: true, metadata: {...}, scanned: true, text: "..." }
]
```

### Body Nodes (Detailed)

**Loop Body - Node 1: Validate Format**
```
Type: If-Else
Condition: @{mem:current_item|file_type} in ['pdf', 'docx']

If TRUE:
  └─ Output: { is_valid: true }

If FALSE:
  └─ Output: { is_valid: false, error: "Unsupported file type" }
```

**Loop Body - Node 2: Extract Metadata (Conditional)**
```
Type: If-Else
Condition: @{is_valid} === true

If TRUE:
  └─ API Call: POST /extract-metadata
     Body: { document_id: @{mem:current_item|id} }
     Output: { metadata: { title, author, creation_date } }

If FALSE:
  └─ Skip (return previous output unchanged)
```

**Loop Body - Node 3: Scan for Viruses (Conditional)**
```
Type: If-Else
Condition: @{is_valid} === true

If TRUE:
  └─ API Call: POST /scan
     Body: { document_id: @{mem:current_item|id} }
     Output: { scanned: true, is_clean: true/false }

If FALSE:
  └─ Skip
```

**Loop Body - Node 4: Final Enrichment & Merge**
```
Type: DataMapping
Input: Merge outputs from all previous nodes
Output:
{
  "id": @{mem:current_item|id},
  "valid": @{is_valid},
  "error": @{error} || null,
  "metadata": @{metadata},
  "scanned": @{scanned},
  "clean": @{is_clean}
}
```

### Expected Output
```json
[
  {
    "id": "DOC-001",
    "valid": true,
    "error": null,
    "metadata": { "title": "Report", "author": "Alice", "creation_date": "2026-06-01" },
    "scanned": true,
    "clean": true
  },
  {
    "id": "DOC-002",
    "valid": false,
    "error": "Unsupported file type: txt",
    "metadata": null,
    "scanned": false,
    "clean": null
  },
  {
    "id": "DOC-003",
    "valid": true,
    "error": null,
    "metadata": { "title": "Proposal", "author": "Bob", "creation_date": "2026-06-02" },
    "scanned": true,
    "clean": true
  }
]
```

---

## Scenario H: Large Dataset Handling with Limits

### Problem Statement
Process a massive file containing **100,000 CSV rows**. We want to:
1. Process in small batches to avoid memory issues
2. Stop after processing 1000 rows (sample/test mode)
3. Log progress every batch
4. Handle edge cases (empty rows, malformed data)

### Sample Data (Structure)
```csv
id,name,email,signup_date
1,Alice,alice@example.com,2026-01-01
2,Bob,bob@example.com,2026-01-02
3,Charlie,charlie@example.com,2026-01-03
...
100000,Zoe,zoe@example.com,2026-12-31
```

**Parsed as:**
```json
{
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "signup_date": "2026-01-01" },
    ...
    (100,000 total)
  ]
}
```

### Loop Node Configuration (Test Mode)
```json
{
  "itemsIterationPropertyName": "rows",
  "batchSize": 100,
  "forceExitAfterCount": 1000,
  "skipOnEmpty": true,
  "maxAllowedCount": 100000,
  "aggregateResults": false,
  "parallelExecution": false,
  "returnLastResultOnly": false
}
```

**Configuration Details:**
- `batchSize: 100` – Process 100 rows per batch (10 batches for 1000 rows)
- `forceExitAfterCount: 1000` – Stop after 1000 items (test mode; remove for production)
- `skipOnEmpty: true` – Handle empty rows gracefully
- `aggregateResults: false` – Stream results (not accumulate in memory)

### Flow Diagram

```
Input: 100,000 rows loaded

Loop Setup:
  ├─ Skip if empty? No, rows present
  ├─ Min items: 0 ✓
  └─ Max items: 100,000 ✓ (config allows)

Loop Execution (Test Mode):

Batch 1: Rows 1-100 (parallel=false, sequential)
  ├─ Row 1 → Validate & Import
  ├─ Row 2 → Validate & Import
  │ ...
  ├─ Row 100 → Validate & Import
  └─ Progress: "Processed 100 / 100,000 rows"

Batch 2: Rows 101-200
  └─ Progress: "Processed 200 / 100,000 rows"

...

Batch 10: Rows 901-1000
  └─ Progress: "Processed 1,000 / 100,000 rows"

STOP (forceExitAfterCount: 1000)
  Remaining 99,000 rows NOT processed
```

### Body Nodes (Detailed)

**Loop Body - Node 1: Validate Row**
```
Type: If-Else
Condition: @{mem:current_item|id} !== null AND @{mem:current_item|email} !== null

If TRUE:
  └─ Output: { is_valid: true, id: @{mem:current_item|id} }

If FALSE:
  └─ Output: { is_valid: false, id: @{mem:current_item|id}, error: "Missing required fields" }
```

**Loop Body - Node 2: Import User**
```
Type: If-Else
Condition: @{is_valid} === true

If TRUE:
  └─ API Call: POST /users/import
     Body:
     {
       "id": @{mem:current_item|id},
       "name": @{mem:current_item|name},
       "email": @{mem:current_item|email},
       "signup_date": @{mem:current_item|signup_date}
     }
     Output: { imported_id, status: "success" }

If FALSE:
  └─ Output: { status: "skipped", reason: "validation failed" }
```

**Loop Body - Node 3: Progress Logging**
```
Type: Logger
Message: "Processed row @{mem:current_index|add(1)} - User ID: @{mem:current_item|id} - Status: @{status}"

Note: Logs every row (or batch, depending on logger configuration)
```

### Expected Output (First 10 items, if aggregateResults: true)
```json
[
  { "imported_id": 1, "status": "success" },
  { "imported_id": 2, "status": "success" },
  { "imported_id": 3, "status": "success" },
  { "status": "skipped", "reason": "validation failed" },
  ...
  { "imported_id": 1000, "status": "success" }
]
```

### Execution Metrics
```
Total Items in Source: 100,000
Max Allowed: 100,000 ✓
Force Exit After: 1000
Batches Executed: 10
Items Processed: 1,000
Items Skipped: 99,000
Success Rate: 95% (example)
Total Duration: ~5 seconds
```

---

## Scenario I: Complex Variable Scoping with Nested Loops & Shared Context

### Problem Statement
Process **companies** → **departments** → **employees**. Three levels of nesting. We need to access company context inside the employee loop (department doesn't need company, but employee needs both).

### Sample Data
```json
{
  "companies": [
    {
      "company_id": "C1",
      "name": "TechCorp",
      "departments": [
        {
          "dept_id": "D1",
          "name": "Engineering",
          "employees": [
            { "emp_id": "E1", "name": "Alice", "salary": 120000 },
            { "emp_id": "E2", "name": "Bob", "salary": 110000 }
          ]
        },
        {
          "dept_id": "D2",
          "name": "Sales",
          "employees": [
            { "emp_id": "E3", "name": "Charlie", "salary": 80000 }
          ]
        }
      ]
    }
  ]
}
```

### Loop Node Configuration

**Outer Loop (Companies):**
```json
{
  "itemsIterationPropertyName": "companies",
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

**Middle Loop (Departments):**
```json
{
  "itemsIterationPropertyName": "departments_list",
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

**Inner Loop (Employees):**
```json
{
  "itemsIterationPropertyName": "employee_list",
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

### Flow Diagram

```
Outer Loop: Companies
  Iteration 1: C1 (TechCorp)
  ├─ Capture Company Context
  │  Output: { company_id: "C1", company_name: "TechCorp" }
  │
  ├─ Middle Loop: Departments
  │  Iteration 1: D1 (Engineering)
  │  ├─ Process Department
  │  │
  │  ├─ Inner Loop: Employees
  │  │  Iteration 1: E1 (Alice)
  │  │  ├─ Calculate Compensation Report
  │  │  │  Access: company_name (from outer), dept_name (implicit), emp_name (current)
  │  │  │  Output: { emp_id: "E1", company: "TechCorp", dept: "Engineering", salary: 120000 }
  │  │  │
  │  │  Iteration 2: E2 (Bob)
  │  │  └─ Same pattern
  │  │
  │  Iteration 2: D2 (Sales)
  │  ├─ Process Department
  │  │
  │  ├─ Inner Loop: Employees
  │  │  Iteration 1: E3 (Charlie)
  │  │  └─ Calculate Compensation Report
  │  │     Output: { emp_id: "E3", company: "TechCorp", dept: "Sales", salary: 80000 }
```

### Body Nodes (Detailed)

**Outer Loop Body - Node 1: Capture Company Context**
```
Type: DataMapping
Input: @{mem:current_item}
Output:
{
  "company_id": @{mem:current_item|company_id},
  "company_name": @{mem:current_item|name},
  "departments_list": @{mem:current_item|departments}
}
```

**Outer Loop Body - Node 2: Middle Loop (Departments)**
```
Type: Loop Node
Configuration: (shown above)

Middle Loop Body - Node 1: Capture Department Context
Type: DataMapping
Input: @{mem:current_item}
Output:
{
  "dept_id": @{mem:current_item|dept_id},
  "dept_name": @{mem:current_item|name},
  "employee_list": @{mem:current_item|employees}
}

Middle Loop Body - Node 2: Inner Loop (Employees)
Type: Loop Node
Configuration: (shown above)

Inner Loop Body - Node 1: Process Employee
Type: DataMapping
Input: Merge company, department, and employee context
Output:
{
  "emp_id": @{mem:current_item|emp_id},
  "emp_name": @{mem:current_item|name},
  "company_name": @{company_name},    ← From outer context
  "dept_name": @{dept_name},           ← From middle context
  "salary": @{mem:current_item|salary},
  "tax_rate": 0.30,
  "net_salary": @{mem:current_item|salary} * (1 - 0.30)
}
```

### Expected Output
```json
[
  {
    "emp_id": "E1",
    "emp_name": "Alice",
    "company_name": "TechCorp",
    "dept_name": "Engineering",
    "salary": 120000,
    "tax_rate": 0.30,
    "net_salary": 84000
  },
  {
    "emp_id": "E2",
    "emp_name": "Bob",
    "company_name": "TechCorp",
    "dept_name": "Engineering",
    "salary": 110000,
    "tax_rate": 0.30,
    "net_salary": 77000
  },
  {
    "emp_id": "E3",
    "emp_name": "Charlie",
    "company_name": "TechCorp",
    "dept_name": "Sales",
    "salary": 80000,
    "tax_rate": 0.30,
    "net_salary": 56000
  }
]
```

---

## Scenario J: Combining LoopNode with Universal Iteration

### Problem Statement
You have a two-stage workflow:
1. **Stage 1:** Use Loop Node to process a batch of **orders** (contained, scoped)
2. **Stage 2:** Use Universal Iteration on the loop results to route to different systems based on order status

### Sample Data
```json
{
  "batch": {
    "batch_id": "BATCH-001",
    "orders": [
      { "order_id": "ORD-001", "status": "processing", "amount": 500 },
      { "order_id": "ORD-002", "status": "completed", "amount": 300 },
      { "order_id": "ORD-003", "status": "processing", "amount": 750 }
    ]
  }
}
```

### Flow Diagram

```
Workflow:

1. Extract Batch Info
   └─ Extract batch_id, order count

2. Loop Node: Process Orders
   Configuration:
     itemsIterationPropertyName: "orders"
     aggregateResults: true
   
   Iteration 1: ORD-001
     ├─ Validate
     ├─ Calculate Tax
     └─ Output: { order_id: "ORD-001", status: "processing", total: 600 }
   
   Iteration 2: ORD-002
     └─ Output: { order_id: "ORD-002", status: "completed", total: 360 }
   
   Iteration 3: ORD-003
     └─ Output: { order_id: "ORD-003", status: "processing", total: 900 }
   
   Aggregated Output: [3 items with status & total]

3. Universal Iteration on Loop Results
   Configuration:
     itemsIterationEnabled: true
     (automatic array propagation)
   
   Item 1: Processing order → Route to Processing Queue
   Item 2: Completed order → Route to Completed Queue
   Item 3: Processing order → Route to Processing Queue

4. Downstream (based on route)
   ├─ Processing Queue: Update stock, notify warehouse
   └─ Completed Queue: Send invoice, update accounting
```

### Body Nodes (Detailed)

**Node 1: Extract Batch Metadata**
```
Type: DataMapping
Input: @{batch}
Output:
{
  "batch_id": @{batch|batch_id},
  "order_count": @{batch|orders|length}
}
```

**Node 2: Loop Node (Process Orders)**
```
Type: Loop Node
Configuration:
  itemsIterationPropertyName: "orders"
  aggregateResults: true

Loop Body:
├─ Node 1: Validate Order
│  Type: If-Else
│  Condition: @{mem:current_item|amount} > 0
│  Output: { is_valid: true/false }
│
├─ Node 2: Calculate Tax & Total
│  Type: DataMapping
│  Output:
│  {
│    "order_id": @{mem:current_item|order_id},
│    "status": @{mem:current_item|status},
│    "amount": @{mem:current_item|amount},
│    "tax": @{mem:current_item|amount} * 0.1,
│    "total": @{mem:current_item|amount} * 1.1
│  }
│
└─ Node 3: Format Final Output
   Type: DataMapping
   Output: { order_id, status, total }

Loop Output (aggregated):
[
  { order_id: "ORD-001", status: "processing", total: 600 },
  { order_id: "ORD-002", status: "completed", total: 360 },
  { order_id: "ORD-003", status: "processing", total: 900 }
]
```

**Node 3: Universal Iteration on Loop Results**
```
Type: Any node with itemsIterationEnabled: true
(Automatically iterates over the array from Loop)

Iteration 1: ORD-001 (status: processing)
  └─ Route to Processing System

Iteration 2: ORD-002 (status: completed)
  └─ Route to Completed System

Iteration 3: ORD-003 (status: processing)
  └─ Route to Processing System
```

### Expected Output (Loop Only)
```json
[
  { "order_id": "ORD-001", "status": "processing", "total": 600 },
  { "order_id": "ORD-002", "status": "completed", "total": 360 },
  { "order_id": "ORD-003", "status": "processing", "total": 900 }
]
```

### Expected Output (After Universal Iteration Routing)
```
Processing Queue:
  ORD-001: 600
  ORD-003: 900

Completed Queue:
  ORD-002: 360
```

---

## Summary

These 10 scenarios cover the major Loop Node use cases:

| Scenario | Key Feature | Best For |
|----------|-------------|----------|
| A. Nested Loops | Multi-level iteration with scope isolation | Hierarchical data processing |
| B. Conditional Branching | If-Else routing within loop | Smart routing, prioritization |
| C. Error Handling | Retry, break, continue strategies | Resilient workflows |
| D. Dynamic Filtering | Filter before iteration | Selective processing |
| E. Rate Limiting | Batch processing with delays | API throttling |
| F. Data Transformation | Map/Reduce patterns | Data normalization |
| G. Cascade Operations | Sequential, dependent steps | Validation chains |
| H. Large Datasets | Sampling, limits, memory mgmt | Scalability |
| I. Complex Scoping | Multi-level context access | Enterprise workflows |
| J. Combined Patterns | Loop + Universal Iteration | Multi-stage processing |

See [05_Best_Practices.md](05_Best_Practices.md) for optimization tips.

---

## Related Pages

- [00_Overview.md](00_Overview.md) – Quick introduction
- [01_Basics.md](01_Basics.md) – How loops work
- [02_Configuration.md](02_Configuration.md) – Property reference
- [03_Variables_And_Scope.md](03_Variables_And_Scope.md) – Variable handling
- [05_Best_Practices.md](05_Best_Practices.md) – Performance & debugging

---

**Last Updated:** June 2026
