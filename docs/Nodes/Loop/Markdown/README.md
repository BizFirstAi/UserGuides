# Loop Node Documentation

Welcome to the comprehensive Loop Node documentation for Flow Studio. This documentation provides everything you need to understand, configure, and optimize the Loop Node for your workflows.

## Quick Navigation

### For Different Audiences

**I'm new to the Loop Node:**
Start here → [00_Overview.md](00_Overview.md) (5 minutes)
Then read → [01_Basics.md](01_Basics.md) (10 minutes)

**I know the basics, I need the details:**
Jump to → [02_Configuration.md](02_Configuration.md) (20 minutes)
Then → [03_Variables_And_Scope.md](03_Variables_And_Scope.md) (8 minutes)

**I need to solve a specific problem:**
Browse → [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) (30 minutes)
10 real-world scenarios with complete working examples

**I'm optimizing for performance:**
Read → [05_Best_Practices.md](05_Best_Practices.md) (10 minutes)
Performance tips, debugging, testing patterns

**I'm deciding between LoopNode and Universal Iteration:**
See → [06_vs_Universal_Iteration.md](06_vs_Universal_Iteration.md) (8 minutes)
Feature comparison, decision tree, migration guide

---

## Documentation Structure

### 1. [00_Overview.md](00_Overview.md) – What is the Loop Node? (250+ lines)
**Duration:** 5 minutes | **Level:** Beginner

Learn what the Loop Node is, when to use it, and get a 3-minute quick start. Includes:
- What/why/when overview
- Quick start example (customer emails)
- Key concepts preview
- FAQ and pro tips

**Start here if:** You're completely new to the Loop Node.

---

### 2. [01_Basics.md](01_Basics.md) – How Loops Work Mechanically (300+ lines)
**Duration:** 10 minutes | **Level:** Beginner to Intermediate

Deep dive into execution flow, port routing, and the three ways to specify collections. Includes:
- 5-phase execution flow diagram
- Port routing (done vs error)
- Three collections (Property, Expression, JSONPath)
- Body port concept
- Simple complete example

**Start here if:** You understand the concept and want to know how it works internally.

---

### 3. [02_Configuration.md](02_Configuration.md) – All Properties Reference (400+ lines)
**Duration:** 20 minutes | **Level:** Intermediate

Complete reference for all ~25 Loop Node properties, organized by category. Includes:
- Iteration Source (3 properties)
- Core Controls (4 properties)
- Result Management (2 properties)
- Error Handling (3 properties)
- Performance (3 properties)
- Filtering & Sorting (2 properties)
- Batch Timing (2 properties)
- 6 configuration examples
- UI walkthrough
- Common mistakes table

**Use this for:** Looking up specific properties or finding the right configuration for your use case.

---

### 4. [03_Variables_And_Scope.md](03_Variables_And_Scope.md) – Variables and Scope (300+ lines)
**Duration:** 8 minutes | **Level:** Intermediate

Understand variable scope, isolation, and how to access loop variables. Includes:
- Memory hierarchy and scope isolation
- Built-in variables (current_item, current_index)
- Variable access syntax and examples
- Nested loop scope handling
- Accessing parent loop context
- Variable patterns and pitfalls

**Use this for:** Understanding how variables work in loops and avoiding scope-related bugs.

---

### 5. [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Real-World Examples (600+ lines)
**Duration:** 30 minutes | **Level:** Intermediate to Advanced

10 detailed, production-ready scenarios with complete working configurations. Includes:

| Scenario | Use Case | Key Feature |
|----------|----------|------------|
| A | Nested loops (3 levels) | Scope isolation |
| B | Conditional routing by priority | If-Else branching |
| C | Payment processing with retry | Error handling |
| D | Filter before iteration | Performance |
| E | Email batch with rate limiting | Batching & timing |
| F | Data transformation | Map/Reduce pattern |
| G | Document validation chain | Sequential steps |
| H | 100K CSV rows sampling | Large datasets |
| I | Company→Dept→Employee | Complex scoping |
| J | Loop + Universal Iteration | Hybrid pattern |

Each scenario includes:
- Problem statement
- Sample data (JSON)
- Loop configuration
- Flow diagram (ASCII)
- Body node details
- Expected output

**Use this for:** Finding a pattern similar to your problem, then adapting it.

---

### 6. [05_Best_Practices.md](05_Best_Practices.md) – Performance & Debugging (250+ lines)
**Duration:** 10 minutes | **Level:** Intermediate to Advanced

Optimization tips, memory management, testing patterns, and debugging. Includes:
- 5 performance optimization tips
- Memory considerations (aggregation, nesting, leaks)
- Batching strategy by dataset size
- Common mistakes and solutions
- How to read execution logs
- Testing patterns (unit, load)
- Monitoring execution time

**Use this for:** Making your loops faster, finding bottlenecks, testing workflows.

---

### 7. [06_vs_Universal_Iteration.md](06_vs_Universal_Iteration.md) – LoopNode vs Alternatives (200+ lines)
**Duration:** 8 minutes | **Level:** Intermediate

Compare LoopNode with Flow Studio's universal iteration pattern. Includes:
- Pattern overview
- 15-item feature comparison table
- When to use each (with criteria)
- Detailed comparison examples (email, routing)
- Hybrid approaches
- Migration guides
- Decision tree
- Performance comparison

**Use this for:** Deciding whether to use LoopNode or universal iteration for your workflow.

---

## Reading Paths

### Path 1: Complete Beginner
1. [00_Overview.md](00_Overview.md) – Get familiar
2. [01_Basics.md](01_Basics.md) – Understand mechanics
3. [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – See examples (Scenario A & B)
4. [02_Configuration.md](02_Configuration.md) – Learn properties
5. [03_Variables_And_Scope.md](03_Variables_And_Scope.md) – Understand variables
6. [05_Best_Practices.md](05_Best_Practices.md) – Optimize

**Time:** ~1 hour | **Outcome:** Full competence

---

### Path 2: I Know General Workflow Concepts
1. [00_Overview.md](00_Overview.md) – 5 min overview
2. [02_Configuration.md](02_Configuration.md) – Understand all properties
3. [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Find your pattern
4. [03_Variables_And_Scope.md](03_Variables_And_Scope.md) – Handle scope issues

**Time:** ~45 minutes | **Outcome:** Ready to build

---

### Path 3: I Need to Solve a Specific Problem Now
1. [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Find matching scenario
2. [02_Configuration.md](02_Configuration.md) – Fine-tune properties
3. [05_Best_Practices.md](05_Best_Practices.md) – Optimize if needed

**Time:** ~20 minutes | **Outcome:** Working solution

---

### Path 4: I'm Choosing Between LoopNode and Universal Iteration
1. [06_vs_Universal_Iteration.md](06_vs_Universal_Iteration.md) – Feature table & decision tree
2. [00_Overview.md](00_Overview.md) – LoopNode overview (if choosing LoopNode)

**Time:** ~10 minutes | **Outcome:** Right choice made

---

## Key Concepts at a Glance

### What is the Loop Node?
A dedicated iteration container that processes a collection of items through an identical internal workflow (the "body"). Items have isolated scope; results are automatically aggregated.

### When to Use It?
- Processing is self-contained (all items follow the same path)
- You need isolated scope (one iteration doesn't affect another)
- You want automatic result aggregation and control (batching, retry, filtering)

### How Does It Work?
```
Input → Select Collection → Setup (filter, sort, validate) 
→ Iteration (per-item body execution, batching, error handling) 
→ Aggregation (merge results) → Output
```

### Built-in Variables
- `@{mem:current_item}` – The item being processed
- `@{mem:current_index}` – Position (0-based)

### Three Ways to Specify Items
1. **Property Name:** Top-level collection (e.g., "customers")
2. **Expression:** Computed collection (e.g., "@{data|orders}")
3. **JSONPath:** Nested query (e.g., "$.response.data[*]")

### Result Aggregation
By default, all iteration outputs collected into an array. Configurable via:
- `aggregateResults` (true/false)
- `returnLastResultOnly` (true/false)

---

## Common Questions

**Q: Can I modify variables from outside the loop inside the loop?**  
A: You can read them, but modifications don't escape the loop (isolated scope). See [03_Variables_And_Scope.md](03_Variables_And_Scope.md).

**Q: What's the difference between LoopNode and universal iteration?**  
A: LoopNode is scoped and contains a body; universal iteration is flow-wide. See [06_vs_Universal_Iteration.md](06_vs_Universal_Iteration.md).

**Q: How do I handle errors in a loop?**  
A: Use `breakOnFirstError`, `retryFailedItems`, or If-Else inside body. See [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md#scenario-c-error-handling-and-retry).

**Q: How do I process 100,000 items without memory issues?**  
A: Use batching, set `aggregateResults: false`, use `forceExitAfterCount`. See [05_Best_Practices.md](05_Best_Practices.md#memory-considerations).

**Q: Can I have nested loops?**  
A: Yes, with full scope isolation. See [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md#scenario-a-nested-loops-with-scope-isolation).

---

## File Sizes & Scope

| File | Size | Lines | Scope |
|------|------|-------|-------|
| 00_Overview.md | 8.1 KB | 250 | Concepts |
| 01_Basics.md | 13 KB | 330 | Mechanics |
| 02_Configuration.md | 15 KB | 420 | Reference |
| 03_Variables_And_Scope.md | 11 KB | 300 | Advanced |
| 04_Advanced_Scenarios.md | 35 KB | 1200 | Examples |
| 05_Best_Practices.md | 11 KB | 280 | Practical |
| 06_vs_Universal_Iteration.md | 13 KB | 320 | Comparison |
| **Total** | **106 KB** | **3,300** | **Complete** |

---

## Tips for This Documentation

- **Use Ctrl+F** to search for specific properties or scenarios
- **Read tables first** for quick reference (feature comparison, property list)
- **Follow the examples** exactly when learning—they're tested and working
- **Check execution logs** when debugging; logs are documented in [05_Best_Practices.md](05_Best_Practices.md)
- **Refer to scenarios** when building—odds are your use case is close to one of the 10 examples

---

## Feedback & Updates

This documentation was created for Flow Studio Loop Node users. Scenarios cover common real-world patterns (e-commerce, HR, support, finance, and data processing).

**Last Updated:** June 2026  
**Total Content:** ~3,300 lines of comprehensive, production-ready documentation

---

**Start with [00_Overview.md](00_Overview.md) and pick your path!**
