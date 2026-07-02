# Universal Item Iteration: Getting Started

## Your First Iteration in 5 Minutes

This guide walks you through building a complete working example: **Send personalized emails to multiple customers using Universal Item Iteration on an SMTP node.**

### Prerequisites

- Basic Flow Studio workflow understanding
- An SMTP node in your workflow
- Sample input data with a customer array

## Step 1: Prepare Your Input Data

Universal Iteration needs an array of items to process. Create input data with a customers array:

```json
{
  "customers": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "plan": "Pro" },
    { "id": 2, "name": "Bob", "email": "bob@example.com", "plan": "Basic" },
    { "id": 3, "name": "Charlie", "email": "charlie@example.com", "plan": "Enterprise" }
  ],
  "sender_name": "BizFirstAI Support"
}
```

This input will be available to your node configuration via `@{input:...}` expressions.

## Step 2: Open Your SMTP Node and Enable Iteration

1. **Select or create an SMTP node** in your workflow
2. **Open the node's configuration panel**
3. **Look for "Iteration" or "Items" section** (varies by node type)
4. **Toggle `itemsIterationEnabled` to `true`**

The node now knows it will process multiple items.

## Step 3: Specify the Items Source

You have **three options** for telling the node which array to iterate over. Choose one:

### Option A: Property Name (Simplest)

If your items are a **top-level property** in input:

```
itemsIterationPropertyName: "customers"
```

This tells the node: "Use the `customers` array from input."

### Option B: Expression Formula

If you need to **transform or compute** the items:

```
itemsIterationPropertyFormula: "@{input:customers|filter(|plan=='Pro')}"
```

This tells the node: "Evaluate this expression to get items." Useful for filtering or mapping before iteration.

### Option C: JSONPath Query

If items are **nested deeply** in a complex structure:

```
itemsIterationSubQuery: "$.response.data.customers[*]"
```

This tells the node: "Use JSONPath to extract items from response data."

**For this example, use Option A:**

```
itemsIterationPropertyName: "customers"
```

## Step 4: Configure the Node to Use Current Item

Now configure the SMTP node's normal properties, but use **`@{input:item}`** to reference the current item in each iteration.

### SMTP Node Configuration

```json
{
  "recipients": "@{input:item|email}",
  "subject": "Hello @{input:item|name}! Welcome to @{input:item|plan} Plan",
  "fromName": "@{input:sender_name}",
  "body": "Hi @{input:item|name},\n\nYour account is on the @{input:item|plan} plan.\n\nBest regards,\n@{input:sender_name}"
}
```

**What's happening:**
- `@{input:item|email}` → Accesses the `email` field of the current item
- `@{input:item|name}` → Accesses the `name` field of the current item
- `@{input:item|plan}` → Accesses the `plan` field of the current item
- `@{input:sender_name}` → Static access to top-level input field (same for all iterations)

## Step 5: See the Results

**Run the workflow.** The SMTP node will:

1. Extract the `customers` array → 3 items
2. **Iteration 1**: recipient = alice@example.com, subject = "Hello Alice! Welcome to Pro Plan"
3. **Iteration 2**: recipient = bob@example.com, subject = "Hello Bob! Welcome to Basic Plan"
4. **Iteration 3**: recipient = charlie@example.com, subject = "Hello Charlie! Welcome to Enterprise Plan"

Each iteration produces one output. By default, all three outputs flow to the next node in your workflow independently.

### Output Example

**Iteration 1 output:**
```json
{
  "success": true,
  "messageId": "msg_12345",
  "recipient": "alice@example.com",
  "timestamp": "2026-06-20T10:15:30Z"
}
```

**Iteration 2 output:**
```json
{
  "success": true,
  "messageId": "msg_12346",
  "recipient": "bob@example.com",
  "timestamp": "2026-06-20T10:15:31Z"
}
```

**Iteration 3 output:**
```json
{
  "success": true,
  "messageId": "msg_12347",
  "recipient": "charlie@example.com",
  "timestamp": "2026-06-20T10:15:32Z"
}
```

## Step 6: Troubleshooting First Steps

### Issue: "Items expression returned null or undefined"

**Cause:** The items source property doesn't exist in input.

**Fix:** 
- Check your input data has the `customers` field
- Verify the field is an array, not an object
- Check spelling and capitalization

### Issue: "No iterations occurred"

**Cause:** The items array is empty.

**Fix:**
- Check `skipOnEmpty` property—if true, iteration skips (expected behavior)
- Verify input data contains non-empty array
- Check `filterExpression` isn't filtering out all items

### Issue: "itemsIterationEnabled is not recognized"

**Cause:** Your node type doesn't support Universal Iteration.

**Fix:**
- Confirm you're using a supported node (SMTP, HTTP, DataMapping, Database, Custom)
- Check node documentation for iteration support
- Use Loop Node instead if universal iteration isn't available

### Issue: Variable access returns undefined (e.g., `@{input:item|email}` is empty)

**Cause:** The field name doesn't exist in the current item, or nested path is wrong.

**Fix:**
- Verify the item has the field: Print or log the current item
- Check nesting: Use `@{input:item|address|zip}` not `@{input:item|zip}` if nested
- Use execution logs to inspect each iteration's input

### Issue: Only first or last item processed

**Cause:** Iteration is configured but one of these is true:
- `returnLastResultOnly: true` – Only last result returned
- `breakOnFirstError: true` – Loop stopped on error
- `forceExitAfterCount` is set to 1

**Fix:**
- Check and adjust these properties in configuration
- Review execution logs for errors during iteration

## Next Steps

Congratulations! You've built your first Universal Item Iteration. Now:

1. **Explore [02_Configuration.md](02_Configuration.md)** to learn about all 21 properties
2. **Try adding error handling** via `breakOnFirstError` and `retryFailedItems`
3. **Enable batching and parallelization** in [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md) for performance
4. **Review [06_Best_Practices.md](06_Best_Practices.md)** before scaling to large datasets

## Quick Reference: Properties Used

| Property | Value | Purpose |
|----------|-------|---------|
| `itemsIterationEnabled` | `true` | Enable iteration on this node |
| `itemsIterationPropertyName` | `"customers"` | Which array to iterate over |
| `recipients` | `@{input:item\|email}` | Current item's email field |
| `subject` | `Hello @{input:item\|name}!` | Personalize subject per item |

## Common Patterns

### Pattern 1: Iterate with Different Field Names

If your items have different field names, adjust the property:

**Input:**
```json
{
  "orders": [
    { "orderId": "ORD001", "email": "customer1@example.com" },
    { "orderId": "ORD002", "email": "customer2@example.com" }
  ]
}
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "recipients": "@{input:item|email}",
  "subject": "Order Confirmation: @{input:item|orderId}"
}
```

### Pattern 2: Computed Items Source

If items need transformation before iteration:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyFormula": "@{input:all_users|filter(|is_active==true)}",
  "recipients": "@{input:item|email}",
  "subject": "Welcome @{input:item|name}!"
}
```

This iterates only over active users.

### Pattern 3: Filtering Items

Add a filter condition to process only matching items:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "filterExpression": "@{input:item|plan} == 'Premium'",
  "recipients": "@{input:item|email}",
  "subject": "Premium Member Exclusive Offer"
}
```

This sends emails only to Premium customers.

## Pro Tips for Getting Started

> **💡 Always Validate Item Structure**  
> Before enabling iteration on a node, manually inspect one item from your array. Verify field names and nesting depth. This prevents common "undefined" errors.

> **💡 Test with Small Data First**  
> Start with 3-5 items, not 1000. Get the configuration right at small scale, then scale up.

> **💡 Use Execution Logs**  
> Check execution logs to see each iteration's input, configuration values, and output. This is the fastest way to debug variable access issues.

> **💡 Default Properties Are Conservative**  
> By default, iteration is sequential, break-on-error is off, and all items are processed. No special tuning needed for basic usage.

---

**Ready to scale?** See [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md) for performance tuning.

**Want all property details?** See [02_Configuration.md](02_Configuration.md).
