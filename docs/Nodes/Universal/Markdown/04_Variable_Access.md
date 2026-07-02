# Universal Item Iteration: Variable Access Guide

This guide explains how to access current item data and iteration metadata while configuring nodes with Universal Item Iteration enabled.

## Current Item Access: `@{input:item}`

The primary way to access the current item in each iteration.

### Basic Syntax

```
@{input:item}
```

This represents the entire current item being processed in this iteration.

### Example 1: Simple Field Access

**Input:**
```json
{
  "customers": [
    { "id": 1, "email": "alice@example.com", "name": "Alice" },
    { "id": 2, "email": "bob@example.com", "name": "Bob" }
  ]
}
```

**Configuration (SMTP Node):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "recipients": "@{input:item|email}",
  "subject": "Hello @{input:item|name}!"
}
```

**Iteration 1:**
- `@{input:item|email}` → `"alice@example.com"`
- `@{input:item|name}` → `"Alice"`

**Iteration 2:**
- `@{input:item|email}` → `"bob@example.com"`
- `@{input:item|name}` → `"Bob"`

### Example 2: Numeric and Boolean Fields

**Input:**
```json
{
  "orders": [
    { "id": 101, "total": 150.50, "is_priority": true },
    { "id": 102, "total": 75.00, "is_priority": false }
  ]
}
```

**Configuration (Data Mapping):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "message": "Order @{input:item|id}: Total=$@{input:item|total}, Priority=@{input:item|is_priority}"
}
```

**Iteration 1:**
- `message` → `"Order 101: Total=$150.50, Priority=true"`

**Iteration 2:**
- `message` → `"Order 102: Total=$75.00, Priority=false"`

---

## Nested Property Access: Pipe Syntax

Access deeply nested fields using the pipe (`|`) separator.

### Syntax

```
@{input:item|field|nestedField|deeperField}
```

Each pipe adds one level of nesting.

### Example 3: One Level of Nesting

**Input:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "contact": {
        "email": "alice@example.com",
        "phone": "555-1234"
      }
    }
  ]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "users",
  "recipients": "@{input:item|contact|email}",
  "phone": "@{input:item|contact|phone}"
}
```

**Result:**
- `recipients` → `"alice@example.com"`
- `phone` → `"555-1234"`

### Example 4: Deep Nesting (3+ Levels)

**Input:**
```json
{
  "companies": [
    {
      "id": 1,
      "name": "TechCorp",
      "headquarters": {
        "address": {
          "street": "123 Main St",
          "city": "San Francisco",
          "zip": "94102"
        }
      }
    }
  ]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "companies",
  "mailing_city": "@{input:item|headquarters|address|city}",
  "mailing_zip": "@{input:item|headquarters|address|zip}"
}
```

**Result:**
- `mailing_city` → `"San Francisco"`
- `mailing_zip` → `"94102"`

### Example 5: Arrays Within Items

**Input:**
```json
{
  "orders": [
    {
      "id": 101,
      "items": [
        { "sku": "SKU001", "qty": 2 },
        { "sku": "SKU002", "qty": 1 }
      ]
    }
  ]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "order_id": "@{input:item|id}",
  "first_item_sku": "@{input:item|items|0|sku}",
  "first_item_qty": "@{input:item|items|0|qty}"
}
```

**Result:**
- `order_id` → `"101"`
- `first_item_sku` → `"SKU001"`
- `first_item_qty` → `2`

---

## Iteration Index: `@{input:current_iteration_index}`

Access the zero-based index of the current iteration.

### Syntax

```
@{input:current_iteration_index}
```

### Example 6: Sequential Processing with Index

**Input:**
```json
{
  "items": [
    { "name": "Alice" },
    { "name": "Bob" },
    { "name": "Charlie" }
  ]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "items",
  "greeting": "Item #@{input:current_iteration_index}: Welcome @{input:item|name}!"
}
```

**Iteration 1:**
- `greeting` → `"Item #0: Welcome Alice!"`

**Iteration 2:**
- `greeting` → `"Item #1: Welcome Bob!"`

**Iteration 3:**
- `greeting` → `"Item #2: Welcome Charlie!"`

**Note:** Indexing starts at 0 (zero-based), so first item is index 0.

### Example 7: Use Index for Conditional Logic

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "is_first": "@{input:current_iteration_index} == 0",
  "is_second": "@{input:current_iteration_index} == 1"
}
```

This can be used to handle first/last item specially.

---

## Alternative Syntax: `@{input:current_item}`

Some configurations accept `current_item` as an alias for `item`.

### Syntax

```
@{input:current_item}
@{input:current_item|email}
```

### Equivalence

These two are equivalent:
```json
{
  "option1": "@{input:item|email}",
  "option2": "@{input:current_item|email}"
}
```

**Recommendation:** Use `item` (shorter, more common).

---

## Static Input Access

Access properties outside the current item (same for all iterations).

### Syntax

```
@{input:property_name}
```

### Example 8: Mix Static and Dynamic

**Input:**
```json
{
  "sender_name": "Support Team",
  "sender_email": "support@example.com",
  "recipients": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ]
}
```

**Configuration (SMTP):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "recipients",
  "from": "@{input:sender_email}",
  "from_name": "@{input:sender_name}",
  "recipients": "@{input:item|email}",
  "subject": "Hello @{input:item|name} from @{input:sender_name}!"
}
```

**Iteration 1:**
- `from` → `"support@example.com"` (static, same all iterations)
- `from_name` → `"Support Team"` (static, same all iterations)
- `recipients` → `"alice@example.com"` (dynamic, per iteration)
- `subject` → `"Hello Alice from Support Team!"` (mixed)

**Iteration 2:**
- `from` → `"support@example.com"` (unchanged)
- `from_name` → `"Support Team"` (unchanged)
- `recipients` → `"bob@example.com"` (changes per iteration)
- `subject` → `"Hello Bob from Support Team!"` (changes per iteration)

---

## Working with Null/Undefined Fields

What happens when a field doesn't exist in the item?

### Example 9: Missing Optional Field

**Input:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "phone": "555-1234" },
    { "id": 2, "name": "Bob" }  /* missing phone field */
  ]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "users",
  "contact": "Name: @{input:item|name}, Phone: @{input:item|phone}"
}
```

**Iteration 1:**
- `contact` → `"Name: Alice, Phone: 555-1234"`

**Iteration 2:**
- `contact` → `"Name: Bob, Phone: undefined"` (or `null`, depending on node)

**Recommendation:** Check field existence before using, or provide defaults.

### Using Filters to Handle Missing Data

**Configuration (better approach):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "users",
  "filterExpression": "@{input:item|phone} != null && @{input:item|phone} != undefined"
}
```

This filters out users without phone numbers before iteration.

---

## Type Coercion and Formatting

Access fields and convert to required type.

### Example 10: Number Formatting

**Input:**
```json
{
  "transactions": [
    { "id": 1, "amount": 150.5 },
    { "id": 2, "amount": 75 }
  ]
}
```

**Configuration (Database Insert):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "transactions",
  "amount_cents": "@{input:item|amount} * 100"
}
```

This converts dollars to cents (multiply by 100).

### Example 11: String Templates

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "full_name": "@{input:item|first_name} @{input:item|last_name}",
  "slug": "@{input:item|first_name}-@{input:item|id}"
}
```

**Input Item:**
```json
{ "id": 1, "first_name": "Alice", "last_name": "Smith" }
```

**Result:**
- `full_name` → `"Alice Smith"`
- `slug` → `"Alice-1"`

---

## Common Access Patterns

### Pattern 1: Email List

**Input:**
```json
{
  "contacts": [
    { "email": "alice@example.com" },
    { "email": "bob@example.com" }
  ]
}
```

**Configuration (SMTP):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "contacts",
  "recipients": "@{input:item|email}"
}
```

### Pattern 2: Database Records

**Input:**
```json
{
  "records": [
    { "id": 1, "name": "Record A", "value": 100 },
    { "id": 2, "name": "Record B", "value": 200 }
  ]
}
```

**Configuration (Database Insert):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "id": "@{input:item|id}",
  "name": "@{input:item|name}",
  "value": "@{input:item|value}"
}
```

### Pattern 3: API Calls with ID

**Input:**
```json
{
  "user_ids": [
    { "id": 123 },
    { "id": 456 }
  ]
}
```

**Configuration (HTTP Request):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "user_ids",
  "url": "https://api.example.com/users/@{input:item|id}",
  "method": "GET"
}
```

### Pattern 4: Conditional Data Based on Item

**Input:**
```json
{
  "orders": [
    { "id": 101, "amount": 50, "is_express": false },
    { "id": 102, "amount": 500, "is_express": true }
  ]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "shipping_method": "@{input:item|is_express} ? 'express' : 'standard'",
  "message": "Order @{input:item|id}: @{input:item|amount} via @{shipping_method}"
}
```

### Pattern 5: Array Item Enumeration

**Input:**
```json
{
  "items": ["apple", "banana", "cherry"]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "items",
  "line_item": "@{input:current_iteration_index + 1}. @{input:item}"
}
```

**Results:**
- `"1. apple"`
- `"2. banana"`
- `"3. cherry"`

---

## Variable Scope Within Iteration

### What's Available

Within iteration, you can access:

1. **Current item:** `@{input:item}` or `@{input:item|field}`
2. **Iteration index:** `@{input:current_iteration_index}`
3. **Static input data:** `@{input:static_field}` (same across all iterations)
4. **Node output from earlier nodes:** `@{output:previous_node_key}`

### What's NOT Available

- ❌ Results from downstream nodes (they haven't executed yet)
- ❌ Memory variables from loop body (this is not Loop Node)
- ❌ Variables from other iterations (each iteration is independent)

---

## Pro Tips for Variable Access

> **💡 Test Variable Expressions**  
> Use execution logs to verify that variable expressions resolve correctly. Look at the "Resolved Value" in logs.

> **💡 Use Safe Defaults**  
> If a field might be missing, use filter expressions or provide fallback logic.

> **💡 Validate Nested Paths**  
> Before using `@{input:item|deeply|nested|path}`, verify the structure by printing one item.

> **💡 Keep Expressions Simple**  
> Complex variable expressions are hard to debug. Break them into steps if needed.

> **💡 Watch Array Index Boundaries**  
> When accessing array fields like `@{input:item|items|0}`, ensure the array has that index.

---

## Troubleshooting Variable Access

### Issue: Variable Resolves to `undefined`

**Cause:** Field doesn't exist in item.

**Fix:** 
1. Check execution logs to see the actual item data
2. Verify field name spelling and case sensitivity
3. Confirm nesting depth (use correct number of pipes)

### Issue: Complex String Doesn't Interpolate

**Cause:** Expression syntax error.

**Fix:**
1. Simplify the expression
2. Check pipe syntax (use `|` not `.` for nesting)
3. Quote string literals if needed

### Issue: Numeric Field Treated as String

**Cause:** Variable contains a number but node expects formatted output.

**Fix:**
1. Use type conversion in expression
2. Multiply by 1 to convert string to number
3. Use formatting functions if available

---

**Next:** See [05_Error_Handling.md](05_Error_Handling.md) to handle errors during iteration.
