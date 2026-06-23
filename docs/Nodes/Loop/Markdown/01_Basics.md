# Loop Node Documentation: Basics

## How Loops Work Mechanically

The Loop Node executes in distinct phases. Understanding this flow is key to using loops effectively.

### Execution Phases

```
1. INPUT PHASE
   ├─ Loop Node receives input object
   └─ Extracts collection from one of three sources
        ├─ Property Name (direct lookup)
        ├─ Expression (computed formula)
        └─ JSONPath (nested query)

2. SETUP PHASE
   ├─ Apply filters (if filterExpression configured)
   ├─ Apply sorting (if sortByExpression configured)
   ├─ Validate collection size against minAllowedCount/maxAllowedCount
   └─ If invalid, error or skip based on configuration

3. ITERATION PHASE (repeated for each item)
   ├─ Set mem:current_item to item #N
   ├─ Set mem:current_index to N-1 (zero-indexed)
   ├─ Execute body port nodes with these variables in scope
   ├─ Capture body output
   ├─ Move to next item or apply logic:
   │  ├─ breakOnFirstError? Stop if error detected
   │  ├─ retryFailedItems? Retry failed items immediately
   │  └─ Otherwise continue
   └─ Repeat for all items (or until exit condition)

4. AGGREGATION PHASE
   ├─ Collect all iteration outputs
   ├─ Apply aggregation rules:
   │  ├─ returnLastResultOnly? Use final output only
   │  ├─ aggregateResults? Merge outputs
   │  └─ Otherwise return array of all outputs
   └─ Prepare result object

5. OUTPUT PHASE
   ├─ Send aggregated results to "done" port
   └─ Flow continues downstream
```

### Port Routing

The Loop Node has exactly **two output ports**:

```
┌─────────────────────┐
│   Loop Node         │
├─────────────────────┤
│  (body workflow)    │  ← Nodes added here run each iteration
└─────────────────────┘
    │              │
    ↓              ↓
  error          done
    │              │
    └──────┬───────┘
           ↓
      (downstream)
```

- **done** (success) → Sent when all iterations complete successfully (or with collected results)
- **error** → Sent when loop fails (invalid collection, exceeds limits, or breakOnFirstError triggered)

## Three Collections: How to Specify Items

The Loop Node can source items from your data in three different ways. Choose based on where your collection lives.

### Method 1: Property Name (Most Common)

**When to use:** Your input has a top-level property containing the collection.

**Configuration:**
- Property: `itemsIterationPropertyName`
- Value: `orders` (or `customers`, `transactions`, etc.)

**Example Input:**
```json
{
  "orders": [
    { "id": 101, "amount": 250.00, "status": "pending" },
    { "id": 102, "amount": 500.00, "status": "pending" },
    { "id": 103, "amount": 75.00, "status": "pending" }
  ],
  "metadata": { "timestamp": "2026-06-20T10:00:00Z" }
}
```

**Inside Loop Body:**
```
@{mem:current_item}
  → { "id": 101, "amount": 250.00, "status": "pending" }
@{mem:current_item|id}
  → 101
@{mem:current_item|amount}
  → 250.00
```

**Pros:** Simple, direct, readable  
**Cons:** Requires property at top level

### Method 2: Expression (Dynamic Formula)

**When to use:** Your collection is nested, computed, or filtered dynamically.

**Configuration:**
- Property: `itemsIterationPropertyFormula`
- Value: Expression that evaluates to an array

**Example Input:**
```json
{
  "data": {
    "orders": [
      { "id": 101, "amount": 250.00 },
      { "id": 102, "amount": 500.00 }
    ]
  }
}
```

**Expression Syntax:**
```
@{data|orders}                    ← Access nested property
@{data|orders|map(x => x.amount)} ← Transform (if supported)
@{[1, 2, 3]}                      ← Literal array
```

**Pros:** Flexible, supports transformations  
**Cons:** More complex, requires expression knowledge

### Method 3: JSONPath (Query Syntax)

**When to use:** You need to query deeply nested structures or arrays within arrays.

**Configuration:**
- Property: `itemsIterationSubQuery`
- Value: JSONPath expression (e.g., `$.orders[*]`)

**Example Input:**
```json
{
  "response": {
    "data": {
      "orders": [
        { "id": 101, "customer": "Alice" },
        { "id": 102, "customer": "Bob" }
      ]
    }
  }
}
```

**JSONPath Syntax:**
```
$.response.data.orders      ← Exact path to array
$.response.data.orders[0]   ← First item only
$.response..orders          ← Recursive (any level)
$.response.data.orders[*]   ← All items in array
```

**Pros:** Powerful for complex structures  
**Cons:** JSONPath syntax has learning curve

### Comparison Table

| Aspect | Property Name | Expression | JSONPath |
|--------|---------------|------------|----------|
| **Syntax** | `orders` | `@{data\|orders}` | `$.data.orders` |
| **Nesting Support** | Top-level only | Multi-level | Multi-level |
| **Transformations** | No | Yes (if supported) | Yes |
| **Readability** | High | Medium | Medium |
| **Performance** | Fastest | Fast | Fast |
| **Best For** | Simple structures | Complex formulas | Query-heavy data |

## The Body Port Concept

The Loop Node contains an internal workflow called the **body**. This is where your business logic runs, once per item.

### Structure

```
┌─────────────────────────────────┐
│ Loop Node                       │
├─────────────────────────────────┤
│  Body (this runs each iteration)│
│  ┌─────────────────────────────┐│
│  │ Node 1: Validate Order      ││
│  │ - Input: @{mem:current_item}││
│  │ - Check: amount > 0?        ││
│  └──────────┬──────────────────┘│
│             ↓                    │
│  ┌─────────────────────────────┐│
│  │ Node 2: Call PaymentAPI     ││
│  │ - Input: order ID            ││
│  │ - Output: { tx_id, status }  ││
│  └──────────┬──────────────────┘│
│             ↓                    │
│  ┌─────────────────────────────┐│
│  │ Node 3: Log Result          ││
│  │ - Input: payment response   ││
│  │ - Output: { id, tx_id, ... }││
│  └──────────┬──────────────────┘│
│             ↓                    │
│         [Body Output]            │
│  (returned for aggregation)      │
└─────────────────────────────────┘
      ↓
  Loop aggregates 3 outputs
  and sends via "done" port
```

### Adding Nodes to the Body

In Flow Studio Designer:

1. Double-click the Loop Node (or click "Edit Body")
2. Add nodes like you would to any workflow:
   - Drag nodes from palette
   - Connect ports
   - Configure each node
3. Exit the body editor
4. The final node in the body becomes the "body output"

### Body Output

The **last node** in the body chain produces the output that gets aggregated:

```
Iteration 1:
  Input: { id: 101, amount: 250 }
  → Validate → PaymentAPI → Log
  Output: { id: 101, tx_id: "abc123" }

Iteration 2:
  Input: { id: 102, amount: 500 }
  → Validate → PaymentAPI → Log
  Output: { id: 102, tx_id: "abc124" }

Iteration 3:
  Input: { id: 103, amount: 75 }
  → Validate → PaymentAPI → Log
  Output: { id: 103, tx_id: "abc125" }

Aggregated (sent via "done" port):
[
  { id: 101, tx_id: "abc123" },
  { id: 102, tx_id: "abc124" },
  { id: 103, tx_id: "abc125" }
]
```

## Output Routing: Body → Done

After all iterations complete (or error occurs), the Loop Node sends results to one of two ports:

### Success Path: "done" Port

**When:** All iterations succeed (or complete with configured error handling)

**Output Structure:**
```json
{
  "result": [
    { ... iteration 1 output ... },
    { ... iteration 2 output ... },
    { ... iteration 3 output ... }
  ],
  "metadata": {
    "itemsProcessed": 3,
    "itemsSucceeded": 3,
    "itemsFailed": 0,
    "totalDuration": "1.5s"
  }
}
```

Connect the `done` port to downstream nodes that handle successful results (database saves, notifications, etc.).

### Error Path: "error" Port

**When:** Loop encounters an error (invalid collection, exceeds limits, breakOnFirstError triggered)

**Output Structure:**
```json
{
  "error": "Collection 'customers' not found in input",
  "code": "COLLECTION_NOT_FOUND",
  "metadata": {
    "itemsProcessed": 0,
    "errorAt": "SETUP_PHASE"
  }
}
```

Connect the `error` port to error handlers (logging, alerts, recovery workflows).

### Routing Diagram

```
Input Data
  ↓
Loop Node
  ├─── All iterations succeed ───→ "done" port → [Send Email Confirmation]
  │                                             → [Log Success]
  │
  └─── Error detected ───────────→ "error" port → [Log Error]
                                               → [Send Alert]
                                               → [Rollback]
```

## Simple Example: Iterate Over Customers

Let's walk through a complete, simple example: sending a welcome message to each customer.

### Input Data
```json
{
  "customers": [
    { "id": 1, "name": "Alice Johnson", "email": "alice@acme.com" },
    { "id": 2, "name": "Bob Smith", "email": "bob@acme.com" },
    { "id": 3, "name": "Charlie Brown", "email": "charlie@acme.com" }
  ]
}
```

### Loop Node Configuration
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "maxAllowedCount": 100,
  "aggregateResults": true
}
```

### Body Nodes
**Node 1: Format Message** (DataMapping Node)
- Input: `@{mem:current_item}`
- Transformation: `{ name: @{mem:current_item|name}, greeting: "Welcome, @{mem:current_item|name}!" }`
- Output: `{ name: "Alice Johnson", greeting: "Welcome, Alice Johnson!" }`

**Node 2: Send Email** (Email Node)
- To: `@{mem:current_item|email}`
- Subject: "Welcome!"
- Body: `@{greeting}` (from previous output)
- Output: `{ sentTo: "alice@acme.com", status: "sent", timestamp: "2026-06-20T10:15:00Z" }`

### Execution Flow
```
Iteration 1: alice@acme.com
  ├─ Format Message → { name: "Alice", greeting: "Welcome, Alice!" }
  └─ Send Email → { sentTo: "alice@acme.com", status: "sent" }

Iteration 2: bob@acme.com
  ├─ Format Message → { name: "Bob", greeting: "Welcome, Bob!" }
  └─ Send Email → { sentTo: "bob@acme.com", status: "sent" }

Iteration 3: charlie@acme.com
  ├─ Format Message → { name: "Charlie", greeting: "Welcome, Charlie!" }
  └─ Send Email → { sentTo: "charlie@acme.com", status: "sent" }

Aggregated Result (via "done" port):
[
  { sentTo: "alice@acme.com", status: "sent", timestamp: "2026-06-20T10:15:00Z" },
  { sentTo: "bob@acme.com", status: "sent", timestamp: "2026-06-20T10:15:01Z" },
  { sentTo: "charlie@acme.com", status: "sent", timestamp: "2026-06-20T10:15:02Z" }
]
```

### Downstream Processing
The `done` port sends the aggregated array to a downstream node:

**Node 3: Log Results** (Logger Node)
- Input: Array of 3 email confirmations
- Logs: "Sent welcome emails to 3 customers"

**Node 4: Update Dashboard** (API Node)
- POST to `/dashboard/welcome-emails`
- Body: Aggregated results
- Updates UI with confirmation count

## Key Takeaways

1. **Loop execution is phased**: Input → Setup → Iteration (repeated) → Aggregation → Output
2. **Collections come in three flavors**: Property Name, Expression, JSONPath—pick based on your data structure
3. **Body nodes run once per item** with `current_item` and `current_index` in memory scope
4. **Results automatically aggregate** into an array (configurable)
5. **Port routing** is simple: "done" for success, "error" for failure

Next: Learn how to configure all 25+ properties. See [02_Configuration.md](02_Configuration.md)

---

## Related Pages

- [00_Overview.md](00_Overview.md) – Quick introduction
- [02_Configuration.md](02_Configuration.md) – All Loop Node properties
- [03_Variables_And_Scope.md](03_Variables_And_Scope.md) – Variable isolation
- [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Real-world examples

---

**Last Updated:** June 2026
