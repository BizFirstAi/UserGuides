# Loop Node Documentation: Variables and Scope

## Loop-Scoped Variables Explained

The Loop Node creates a **scoped memory context** for each iteration. Variables created inside the body exist only during that iteration; they do not leak to other iterations or to the parent flow.

### Memory Hierarchy

```
Global Flow Variables
├─ my_user_id
├─ api_token
└─ ...

    ↓ (enters Loop Node)

Loop Iteration 1 Scope
├─ current_item (built-in) ← Alice
├─ current_index (built-in) ← 0
├─ customer_name (created in loop) ← "Alice Johnson"
└─ email_sent (created in loop) ← true

    ↓ (exits Iteration 1, Iteration 1 variables destroyed)

Loop Iteration 2 Scope
├─ current_item (built-in) ← Bob
├─ current_index (built-in) ← 1
├─ customer_name (created in loop) ← "Bob Smith"
└─ email_sent (created in loop) ← true

    ↓ (exits Loop)

Global Flow Variables (restored)
├─ my_user_id (unchanged)
├─ api_token (unchanged)
└─ ...
```

### Key Principle: Isolation

**Variables modified inside the loop do NOT affect the parent flow.**

```json
Input:
{
  "counter": 0,
  "customers": [...]
}

Loop Body:
- Set counter = @{counter} + 1

After Loop:
- counter is still 0 (not 1, 2, 3...)
```

This is intentional. Loop iterations are independent, and isolation prevents accidental cross-iteration side effects.

---

## Built-In Variables

Every iteration automatically provides two variables in memory scope:

### current_item

The current item being processed.

**Type:** Whatever type is in the collection (usually object)  
**Updated Each Iteration:** Yes

**Access Syntax:**
```
@{mem:current_item}              ← The entire item object
@{mem:current_item|fieldName}    ← Access a property
@{mem:current_item|nested|deep}  ← Access nested property
```

**Example:**

Input:
```json
{
  "customers": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" }
  ]
}
```

**Iteration 1:**
```
@{mem:current_item}
  → { "id": 1, "name": "Alice", "email": "alice@example.com" }

@{mem:current_item|id}
  → 1

@{mem:current_item|email}
  → "alice@example.com"
```

**Iteration 2:**
```
@{mem:current_item}
  → { "id": 2, "name": "Bob", "email": "bob@example.com" }

@{mem:current_item|id}
  → 2

@{mem:current_item|email}
  → "bob@example.com"
```

### current_index

Zero-indexed position in the collection.

**Type:** Integer (0, 1, 2, ...)  
**Updated Each Iteration:** Yes

**Access Syntax:**
```
@{mem:current_index}    ← The current index (zero-based)
```

**Example:**

```
Iteration 1: @{mem:current_index} → 0
Iteration 2: @{mem:current_index} → 1
Iteration 3: @{mem:current_index} → 2
```

**Use Case:** Generate row numbers, skip first/last item, etc.

```
Skip first item: @{mem:current_index} > 0

Last item: @{mem:current_index} === @{collection|length} - 1

Odd items only: @{mem:current_index} % 2 === 1
```

---

## How to Access Loop Variables in Body Nodes

The Loop Node passes iteration variables to body nodes via memory scope. Each body node sees the current iteration's variables.

### Example 1: Email Service Node

```
Configuration:
  To Email: @{mem:current_item|email}
  Subject: "Hello, @{mem:current_item|name}!"
  Body: "This is message number @{mem:current_index|add(1)}"
         (add(1) because indices are zero-based; shows 1, 2, 3...)
```

### Example 2: API Call Node

```
Configuration:
  URL: "https://api.example.com/customers/@{mem:current_item|id}"
  Method: POST
  Body:
  {
    "customerId": "@{mem:current_item|id}",
    "customerName": "@{mem:current_item|name}",
    "orderIndex": @{mem:current_index}
  }
```

### Example 3: Conditional Branch

```
Body Nodes:
1. If-Else Node
   Condition: @{mem:current_item|amount} > 1000
   
   If TRUE:
   └─ High-Value-Process Node
      Input: @{mem:current_item}
   
   If FALSE:
   └─ Standard-Process Node
      Input: @{mem:current_item}
```

### Example 4: DataMapping Node

```
Configuration:
  Input: @{mem:current_item}
  Mapping:
  {
    "id": @{mem:current_item|id},
    "name": @{mem:current_item|name},
    "position_in_batch": @{mem:current_index|add(1)},
    "is_first": @{mem:current_index} === 0,
    "is_last": false  ← (can't compute without total length)
  }
```

---

## Variable Isolation in Nested Loops

Nested loops (loop inside loop) maintain separate scopes for each level. Variables do not leak between nesting levels.

### Structure

```
Outer Loop
├─ current_item = "Customer A" (outer)
├─ current_index = 0 (outer)
│
├─ Inner Loop
│  ├─ current_item = "Order 1" (inner, shadows outer)
│  ├─ current_index = 0 (inner, shadows outer)
│  └─ Body nodes see inner variables
│
├─ Inner Loop (continues for "Order 2")
│  ├─ current_item = "Order 2" (inner)
│  ├─ current_index = 1 (inner)
│  └─ Body nodes see inner variables
│
└─ After Inner Loop exits
   └─ current_item, current_index revert to outer scope
      (current_item = "Customer A", current_index = 0)
```

### Example: Order-Items Processing

```
Outer Loop: Iterate customers
  @{mem:current_item|name} = "Alice"
  @{mem:current_index} = 0
  
  Inner Loop: Iterate that customer's orders
    @{mem:current_item|order_id} = 101
    @{mem:current_index} = 0
    
    Inner Loop Body:
    └─ Process order 101 for Alice
    
    @{mem:current_item|order_id} = 102
    @{mem:current_index} = 1
    
    Inner Loop Body:
    └─ Process order 102 for Alice
  
  Back to Outer Loop:
  @{mem:current_item|name} = "Bob"
  @{mem:current_index} = 1
  
  Inner Loop: Iterate Bob's orders
    @{mem:current_item|order_id} = 201
    @{mem:current_index} = 0
    ...
```

### Accessing Parent Loop Variables

**Important:** Once inside an inner loop, the outer loop's `current_item` is **shadowed** (hidden) by the inner loop's `current_item`.

**If you need to access the outer loop's item:**

Create an intermediate node in the outer body (before the inner loop) that copies the outer item to a named variable:

```
Outer Loop Body:
1. DataMapping Node
   Input: @{mem:current_item}
   Output: 
   {
     "outer_customer": @{mem:current_item}  ← Store outer item
   }

2. Inner Loop
   Inside inner loop body:
   @{mem:current_item}              ← Inner (Order object)
   @{outer_customer}                ← Outer (Customer object)
```

**Result:** Inside the inner loop, you can access both:
- `@{mem:current_item|order_id}` (inner item)
- `@{outer_customer|name}` (outer item)

This pattern is essential for nested loops that need context from parent iterations.

---

## Creating New Variables Inside Loop Body

Variables created inside the loop body are **scoped to that iteration**. They do not persist to the next iteration.

### Example: Accumulation Pattern (Not Recommended)

```
Outer Flow:
  Set counter = 0

Loop Iteration 1:
  Set counter = 1    ← Creates a new scoped variable
  (does not affect parent counter)

Loop Iteration 2:
  Set counter = 1    ← Starts fresh (parent counter still 0)
  (does not affect parent counter)

After Loop:
  counter is still 0  ← Parent variable unchanged
```

**This is why iteration scoping can be tricky for accumulation.**

### Solution: Use Aggregation or Loop-Aware Properties

Instead of trying to update a parent variable, use the Loop Node's aggregation:

```
Loop Configuration:
  aggregateResults: true

Loop Body:
  Produces output: { count: 1, total: 100 }

After Loop:
  Aggregated result is an array of 3 objects:
  [
    { count: 1, total: 100 },
    { count: 1, total: 200 },
    { count: 1, total: 300 }
  ]

Downstream Processing:
  Process the array of results (e.g., sum totals)
```

### Creating Local Variables for Reuse Within an Iteration

You can create variables that exist only during one iteration and use them in subsequent nodes:

```
Iteration 1:
1. DataMapping Node
   Output: 
   {
     "order_id": @{mem:current_item|id},
     "customer_name": @{mem:current_item|customer|name}
   }
   
   This creates a temporary output object available to the next node

2. Email Service Node
   To: @{mem:current_item|email}
   Body: "Order @{order_id} for @{customer_name}"
   
   References the output from node 1

Iteration 2:
  (Node 1 and 2 repeat, creating new temporary variables)
```

---

## Variable Access Patterns

### Pattern 1: Direct Property Access

```
@{mem:current_item|firstName}
@{mem:current_item|address|city}
@{mem:current_item|orders|[0]|id}    ← First order ID
```

### Pattern 2: Nested Object Navigation

```
Item structure:
{
  "customer": {
    "name": "Alice",
    "contact": {
      "email": "alice@example.com"
    }
  }
}

Access:
@{mem:current_item|customer|contact|email}
  → "alice@example.com"
```

### Pattern 3: Array Element Access

```
Item structure:
{
  "orders": [
    { "id": 101, "amount": 500 },
    { "id": 102, "amount": 750 }
  ]
}

Access:
@{mem:current_item|orders|[0]|id}
  → 101

@{mem:current_item|orders|length}
  → 2
```

### Pattern 4: Using Index for Conditional Logic

```
Skip first item:
If @{mem:current_index} > 0
  └─ Process

Process last item only:
If @{mem:current_index} === 2  (for 3-item collection)
  └─ Archive results

Odd items (1st, 3rd, 5th):
If @{mem:current_index} % 2 === 0
  └─ Process odd-indexed items
```

---

## Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Modifying parent variable in loop | Changes don't persist | Use loop aggregation instead |
| Accessing outer item in nested loop | Inner `current_item` shadows outer | Store outer item before inner loop |
| Forgetting `mem:` prefix | Variable not found | Always use `@{mem:current_item}` |
| Using wrong index type | Off-by-one errors | Remember: index is zero-based (0, 1, 2...) |
| Assuming variables persist across iterations | Data loss | Plan for scope isolation |

---

## Pro Tips

> **💡 Nested Loop Best Practice**
> Always create a "context" variable in the outer loop body (before the inner loop) to capture the outer item. Reference it in the inner loop.

> **💡 Use Loop Aggregation**
> Don't fight the scope isolation. Embrace it by using the Loop Node's aggregation features to collect results.

> **💡 Test with Execution Logs**
> Enable execution logging to inspect memory variables at each iteration. This is invaluable for debugging scope issues.

> **💡 Index for Row Numbers**
> Use `@{mem:current_index|add(1)}` to display 1-indexed row numbers (1, 2, 3...) instead of zero-based indices.

---

## Related Pages

- [00_Overview.md](00_Overview.md) – Quick introduction
- [01_Basics.md](01_Basics.md) – How loops work
- [02_Configuration.md](02_Configuration.md) – Loop properties
- [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Nested loop examples

---

**Last Updated:** June 2026
