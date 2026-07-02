# Universal Item Iteration Documentation Suite

Complete user guide documentation for Universal Item Iteration (SupportsItemIteration pattern) in Flow Studio.

**Total Size:** ~220 KB across 14 files  
**Last Updated:** June 2026

## Directory Structure

```
Universal/
├── README.md (this file)
├── index.html (main landing page)
├── configuration_reference.html (all 21 properties reference)
├── sample.html (7 working configuration examples)
├── usecases.html (12+ real-world use cases)
│
├── Markdown/ (7 comprehensive guides)
│   ├── 00_Overview.md (250 lines) - What & why
│   ├── 01_Getting_Started.md (350 lines) - 5-minute setup
│   ├── 02_Configuration.md (600 lines) - All 21 properties
│   ├── 03_Batching_And_Parallelization.md (450 lines) - Performance tuning
│   ├── 04_Variable_Access.md (350 lines) - Data access patterns
│   ├── 05_Error_Handling.md (350 lines) - Error strategies
│   ├── 06_Best_Practices.md (300 lines) - Design patterns
│   └── 07_vs_Loop_Node.md (300 lines) - Architecture comparison
│
└── Features/ (feature showcase)
    ├── index.md (overview)
    └── index.html (visual feature matrix)
```

## File Descriptions

### HTML Pages (Entry Points)

| File | Purpose | Lines |
|------|---------|-------|
| **index.html** | Main navigation and overview | 300 |
| **sample.html** | 7 working configuration examples | 400 |
| **usecases.html** | 12+ real-world scenarios | 600 |
| **configuration_reference.html** | All 21 properties in searchable table | 350 |

### Markdown Guides (Sequential Learning Path)

| File | Topic | Length | Read Time |
|------|-------|--------|-----------|
| **00_Overview.md** | What is Universal Iteration? When to use? | 250 lines | 5 min |
| **01_Getting_Started.md** | Build your first iteration | 350 lines | 10 min |
| **02_Configuration.md** | Complete property reference | 600 lines | 25 min |
| **03_Batching_And_Parallelization.md** | Performance optimization | 450 lines | 15 min |
| **04_Variable_Access.md** | Access current item & iteration data | 350 lines | 8 min |
| **05_Error_Handling.md** | Failure strategies & recovery | 350 lines | 12 min |
| **06_Best_Practices.md** | Design patterns & lessons learned | 300 lines | 10 min |
| **07_vs_Loop_Node.md** | When to use each approach | 300 lines | 8 min |

### Features Section

- **Features/index.md** - Feature overview and categories
- **Features/index.html** - Visual feature matrix and capabilities

## Content Overview

### Topics Covered

#### Fundamentals
- ✅ What is Universal Item Iteration
- ✅ How it differs from Loop Node
- ✅ When to use it vs. alternatives
- ✅ Supported node types (SMTP, HTTP, DataMapping, Database, Custom)

#### Getting Started
- ✅ 5-minute first iteration walkthrough
- ✅ Enable iteration on a node
- ✅ Specify items source (3 options)
- ✅ Access current item in configuration
- ✅ Troubleshooting first steps

#### Configuration (21 Properties)
- ✅ Iteration sources (4): how to specify items
- ✅ Core behavior (4): basic controls
- ✅ Limits & exits (2): bounds on iteration
- ✅ Error handling (3): failure strategies
- ✅ Result management (2): output control
- ✅ Performance & batching (3): speed tuning
- ✅ Batch timing (2): rate limiting
- ✅ Filtering & sorting (2): pre-iteration transforms

#### Advanced Topics
- ✅ Batching strategies (sequential, parallel)
- ✅ Parallelization tuning
- ✅ Rate limiting with batch wait times
- ✅ Variable access (@{input:item}, nested properties)
- ✅ Error handling (retries, filters, timeouts)
- ✅ Memory management
- ✅ Performance optimization
- ✅ Real-world use cases (12+)
- ✅ Best practices (5 patterns)

#### Real-World Examples
1. Sequential email sending
2. Parallel API calls (100 concurrent)
3. Batch database insert with rate limiting
4. Error handling and retries
5. Filtering and sorting before iteration
6. Large dataset with limits
7. Nested property access
8. E-commerce: order confirmation emails
9. HR: bulk employee updates
10. Finance: parallel credit card validation
11. CRM: data enrichment from API
12. Reporting: transaction log processing
13. Marketing: customer segmentation
14. Support: priority ticket processing
15. Data migration between systems
16. Analytics: event processing
17. Image processing in parallel
18. Payment processing with retries
19. Webhook delivery with rate limiting

## Key Features Documented

### Iteration Sources
- Property name lookup
- Expression formulas
- JSONPath queries
- Item filtering before iteration
- Item sorting before iteration

### Performance Features
- Sequential processing (default)
- Sequential batching
- Parallel batching (10-100× speedup)
- Rate limiting with batch wait times
- Staggered startup delays
- Memory-efficient processing

### Error Handling
- Break on first error vs. continue
- Automatic retries (up to N attempts)
- Exponential backoff
- Per-item timeouts
- Error reporting options
- Empty array handling

### Result Management
- Independent results (default)
- Aggregated array results
- Last result only
- Partial success handling

### Variable Access
- Current item: @{input:item}
- Iteration index: @{input:current_iteration_index}
- Nested properties: @{input:item|field|nested}
- Static input access

## Configuration Properties Documented

All 21 properties with:
- Type (Boolean, String, Integer)
- Default value
- Category
- When to use
- Example configurations
- Impact on performance/behavior
- Common mistakes

## Sample Configurations Provided

1. **Sequential Email Sending** - Simple, no parallelization
2. **Parallel API Calls** - 100 concurrent requests
3. **Batch Database Insert** - 500 per batch with rate limiting
4. **Error Handling & Retries** - Retry logic example
5. **Filtering & Sorting** - Pre-iteration filtering
6. **Large Dataset with Limits** - Safety limits example
7. **Nested Property Access** - Complex data structure access

## Real-World Use Cases

Complete scenarios for:
- Bulk email campaigns (50,000 customers)
- HR employee record updates (1,000 employees)
- Parallel credit card validation (500 cards)
- CRM data enrichment (10,000 leads)
- Transaction log reporting (100,000 events)
- Customer segmentation (10,000 customers)
- Support ticket processing (500 tickets)
- Data migration (50,000 records)
- Event processing (100,000 events)
- Image processing (1,000 images)
- Payment processing (100 customers)
- Webhook delivery (10,000 subscribers)

Each use case includes:
- Problem statement
- Complete configuration
- Input sample data
- Expected behavior
- Performance characteristics
- Key properties used
- Troubleshooting tips

## Best Practices Documented

### Design Patterns
1. Simple loop (5-10 items)
2. Safe bulk operation (100-1000 items)
3. Parallel powerhouse (1000+ items, I/O-bound)
4. Critical operation (payment, authentication)
5. Graceful degradation (best effort)

### Performance Tuning
- Identifying bottlenecks
- Choosing batch size
- Parallelization for I/O
- Sequential for CPU
- Memory management
- Common pitfalls

### Production Checklist
- Testing at scale
- Monitoring setup
- Error handling configuration
- Performance tuning
- Rollback plan

## Comparison with Loop Node

| Feature | Universal | Loop |
|---------|-----------|------|
| Setup time | 2 min | 10 min |
| Single-node ops | ✅ Perfect | Works |
| Multi-node workflows | ❌ No | ✅ Yes |
| Batching | ✅ Advanced | Basic |
| Parallel execution | ✅ Yes | Yes |
| Conditional branching | ❌ No | ✅ Yes |

## How to Use This Documentation

### For Quick Start (10 minutes)
1. Read **00_Overview.md** (what & why)
2. Follow **01_Getting_Started.md** (build first iteration)
3. Check **sample.html** (copy example configuration)

### For Complete Understanding (1-2 hours)
1. Start with **00_Overview.md**
2. Follow **01_Getting_Started.md**
3. Deep dive: **02_Configuration.md** (all properties)
4. Learn: **03_Batching_And_Parallelization.md** (performance)
5. Master: **04_Variable_Access.md** (data access)
6. Understand: **05_Error_Handling.md** (failure strategies)

### For Real-World Application (30 minutes)
1. Find your use case in **usecases.html**
2. Copy the configuration
3. Reference **02_Configuration.md** for property details
4. Check **06_Best_Practices.md** for optimization tips
5. Review **05_Error_Handling.md** for error handling

### For Production Deployment
1. Review **06_Best_Practices.md** production checklist
2. Study **03_Batching_And_Parallelization.md** for tuning
3. Test with realistic data volume
4. Set up monitoring and alerts
5. Have rollback plan ready

## Search & Navigation

### Key Topics Quick Links
- **Iteration setup:** 01_Getting_Started.md
- **All properties:** 02_Configuration.md & configuration_reference.html
- **Performance tuning:** 03_Batching_And_Parallelization.md
- **Variable access:** 04_Variable_Access.md
- **Error handling:** 05_Error_Handling.md
- **Real examples:** sample.html (7 samples), usecases.html (12+ cases)
- **Best patterns:** 06_Best_Practices.md
- **Loop vs Universal:** 07_vs_Loop_Node.md

## Important Notes

### Scope
- Focuses on **SupportsItemIteration** pattern (not Loop Node)
- Covers **all 21 configuration properties**
- Includes **12+ real-world use cases**
- Provides **5 design patterns**
- Documents **8 feature categories**

### Audience
- Intermediate Flow Studio users
- Developers building workflows
- Platform operators tuning performance
- System architects choosing patterns

### Assumptions
- Readers know basic Flow Studio concepts
- Familiar with JSON and data structures
- Understand APIs and HTTP requests
- Ready to optimize for production

## Technical Details Covered

### Data Types
- String (expressions, JSONPath)
- Boolean (toggles)
- Integer (counts, timeouts in milliseconds)
- Null (no limit, use default)

### Performance Metrics
- Sequential: 1 item/second baseline
- Parallel (10 concurrent): 10× speedup for I/O
- Parallel (50 concurrent): 50× speedup for I/O
- Batch efficiency depends on operation type

### Memory Management
- Formula: batchSize × memoryPerItem × parallelWorkers
- Example: 100 × 1KB × 1 = 100KB for sequential
- Example: 50 × 10KB × 10 = 5MB for parallel batching

## File Statistics

| Metric | Value |
|--------|-------|
| Total files | 14 |
| Total lines | ~3,800 |
| Total size | ~220 KB |
| Markdown files | 8 |
| HTML files | 4 |
| Configuration examples | 7 |
| Real-world use cases | 12 |
| Properties documented | 21 |

## Last Updated

**June 2026**

Documentation is current with latest Flow Studio features and best practices.

---

**For questions or updates:** Refer to execution logs for per-iteration debugging, or consult the best practices section.
