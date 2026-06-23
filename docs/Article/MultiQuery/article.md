# Mastering the MultiQuery Engine: Building Hierarchical Data Trees in SQL Server

## Introduction

Enterprise applications frequently need to retrieve complex, nested data structures. Imagine fetching an employee with all their payslips, each payslip with its deductions, or a department with all its teams and members. Traditionally, this has forced developers into painful compromises: N+1 query patterns that destroy performance, complex mega-joins that duplicate parent data, or fragmented multi-call orchestrations scattered across the codebase.

The BizFirstAI MultiQuery Engine solves this with a template-driven approach that executes hierarchical SQL record trees in a single API call. One template, one request, complete nested resultsâ€”across any depth of parent-child relationships.

## The Problem: Traditional Approaches Fall Short

Before MultiQuery, enterprise applications faced three primary anti-patterns when fetching hierarchical data:

**N+1 Query Problem**: Fetch 50 employees, then issue 50 individual payslip queriesâ€”one per employeeâ€”resulting in 51 database round-trips for a single report. This approach works fine with small datasets but becomes prohibitively slow at scale.

**Mega Joins**: Write a single SQL statement with multiple JOIN clauses and GROUP BY aggregations, then re-flatten the result in application code, duplicating parent columns for every child row. This approach requires manual de-duplication logic in your service layer and becomes increasingly complex with deeper hierarchies.

**Multiple API Calls**: Call `/employees`, then for each ID call `/payslips?employeeId=X`, then for each payslip call `/deductions?payslipId=Y`. Client code becomes fragile orchestration logic scattered across front-end components, making testing and maintenance a nightmare.

Each approach adds latency, maintenance burden, or bothâ€”and none of them are tenant-safe by default. MultiQuery eliminates all three problems.

## Why MultiQuery Exists: Solving Real Business Problems

Enterprise applications handle massive volumes of data. Payroll systems need to generate reports containing thousands of employees and their associated deductions. Organizational applications require fast org chart rendering across deep hierarchical structures. Audit compliance systems must track every change to critical entities with full context.

Traditional approaches introduce unacceptable trade-offs: either accept poor performance, accept maintenance burden, or accept security risks. MultiQuery sidesteps these trade-offs entirely by:

- **Eliminating N+1 queries**: The engine executes one query per hierarchy level, not one per parent row
- **Providing native hierarchical output**: Results arrive as nested JSON or expandable HTML tables, matching how applications actually consume the data
- **Injecting tenant isolation automatically**: The caller's TenantID from their JWT is injected into every queryâ€”templates cannot be misconfigured to expose another tenant's data
- **Enabling template reuse**: Store templates in the database, update without redeployment, and call them via REST, expressions, or direct service invocations

## Core Features: What MultiQuery Delivers

### 1. Template-Driven Query Execution

Instead of writing code to assemble hierarchical data, you write a single JSON template defining the complete query tree. The template specifies the root SQL query, any caller-supplied parameters, output options, and one or more child collection definitions. Each child carries its own SQL and can have further grandchild collections.

```json
{
  "name": "Departments with Employees",
  "sql": "SELECT DepartmentID, DepartmentName, ManagerID FROM Departments WHERE TenantID = @TenantID",
  "recordType": "Department",
  "isTemplate": true,
  "parameters": [],
  "options": {
    "outputFormat": "json",
    "maxDepth": 5,
    "cacheSeconds": 60
  },
  "children": [
    {
      "collectionName": "employees",
      "sql": "SELECT EmployeeID, FirstName, LastName FROM Employees WHERE DepartmentID = @parent.DepartmentID AND TenantID = @TenantID",
      "recordType": "Employee",
      "isTemplate": false,
      "children": []
    }
  ]
}
```

### 2. Parent Token Substitution with @parent Syntax

Child queries reference parent row values using `@parent.ColumnName` syntax. The engine substitutes these tokens with actual column values at runtime. For deeper hierarchies, use `@parent.parent.ColumnName` to reference grandparent values. This creates natural SQL joins across hierarchy levels without requiring complex string manipulation.

### 3. Automatic Tenant Isolation

The engine extracts the caller's TenantID from their JWT and injects it as a SQL parameter into every query in the tree. Callers have no mechanism to supply or override this valueâ€”it's automatically enforced at the engine layer. This means templates cannot accidentally expose another tenant's data, even if they omit the TenantID predicate from their WHERE clause.

### 4. Flexible Output Formats

The same template can be executed in JSON mode (compact nested JsonArray) or HTML mode (expandable cascaded table). JSON works perfectly for API clients and data export. HTML mode is ideal for displaying data in web interfaces, iframes, or generating email bodies.

## Architecture Overview: Five Layered Components

The MultiQuery Engine is composed of five project layers, each with a clearly bounded responsibility:

**Domain Layer** (`BizFirst.Domain`): Defines `QueryTemplate`, `ChildCollection`, `QueryParameter`, and `QueryOptions` domain models with no infrastructure dependencies. These are pure C# classes representing the template structure.

**Services Layer** (`BizFirst.Services`): Contains the engine orchestration logicâ€”template resolution, recursive child execution, result tree assembly, and cache management. This layer orchestrates the entire execution flow.

**SQL Server Infrastructure** (`BizFirst.Infrastructure.SqlServer`): Implements the `SqlServerDeriveEngine` with ADO.NET query execution, `@parent` token substitution, and tenant parameter injection.

**API Base Layer** (`BizFirst.Api.Base`): Provides shared controller base classes, JWT parsing, tenant context resolution, and the expression directive handler.

**API Layer** (`BizFirst.Api`): Exposes the REST endpoints for JSON output, HTML output, stored script execution, and direct script execution. All routes enforce `TenantAdmin` role requirements.

## Step-by-Step Walkthrough: From Template to Results

### Step 1: Author Your Template

Write a QueryTemplate JSON defining the root SQL query and any child collections. Store this template in a local file.

### Step 2: Insert Into dbo.Shared_Configurations

Store the template in SQL Server's configuration table with a unique catalogue code:

```sql
INSERT INTO dbo.Shared_Configurations (Code, Value, TenantID, IsActive, ...)
VALUES ('MY_FIRST_TEMPLATE', '{"name": "...", "sql": "...", "children": [...]}', 42, 1, ...);
```

### Step 3: Call the REST Endpoint

Issue a GET request with a Bearer JWT:

```
GET /api/v1/expressions/multiquery/MY_FIRST_TEMPLATE.json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Receive Nested Results

The engine executes the root query, then for every root row returned executes each child query, substituting `@parent` values and injecting TenantID. Results arrive as nested JSON:

```json
[
  {
    "DepartmentID": 1,
    "DepartmentName": "Engineering",
    "employees": [
      {
        "EmployeeID": 101,
        "FirstName": "Alice",
        "LastName": "Nguyen"
      }
    ]
  }
]
```

## Real-World Use Case: Payroll Reporting

A payroll system needs to generate employee payroll reports showing each employee, their payslips for a period, and all deductions for each payslip. Traditionally, this requires:

- One query for employees (50 results)
- 50 queries for payslips (500 results)
- 500 queries for deductions (2000 results)
- Total: 551 database round-trips

With MultiQuery:

- One query for employees
- One query for payslips (executed per employee)
- One query for deductions (executed per payslip)
- Total: 3 database round-trips

The template defines a three-level hierarchy: Employee â†’ Payslip â†’ Deduction. All results arrive in a single JSON response, ready for PDF generation or spreadsheet export. The data is automatically tenant-isolated, and the response can be cached for 5 minutes to avoid redundant database hits.

## Benefits Summary: Why Teams Adopt MultiQuery

**Performance**: Eliminate N+1 queries and reduce database round-trips from potentially thousands to just a handful, linear in depth.

**Maintainability**: Templates live in the database, not scattered across your codebase. Update a report structure without redeploying.

**Security**: Tenant isolation is automatic and enforced at the engine layer. No accidental cross-tenant data leaks.

**Flexibility**: Switch between JSON and HTML output formats without changing templates. Use the same template via REST, direct service calls, or expression directives.

**Efficiency**: Built-in caching, configurable recursion depth limits, and parameterized queries that prevent SQL injection.

## Best Practices When Using MultiQuery

**Always Filter by TenantID**: Every SELECT at every level must include `AND TenantID = @TenantID`. The engine injects the tenant from the caller's JWT, but SQL must enforce it as a defense-in-depth safeguard.

**Use Parameterized Queries**: All dynamic values must come from declared parameters or `@parent` tokens. Never concatenate user-supplied strings into SQL. The engine uses SqlCommand.Parameters for all bindings.

**Avoid SELECT * in Production**: Always list columns explicitly. `SELECT *` breaks when schema changes add new columns, potentially exposing sensitive data, and unnecessarily transmits columns that consumers don't need.

**Reference Parents Correctly**: Child SQL joins to the parent row using `@parent.ColumnName`. The column name must exactly match the column returned in the parent SELECT.

**Filter Soft-Deleted Records**: Always include `AND Deleted = 0 AND Archived = 0` unless the use case explicitly requires deleted records. Omitting these filters returns logically deleted rows to callers.

**Use Caching Wisely**: Set `cacheSeconds` to 60â€“300 for read-heavy, infrequently-changing data. Always use 0 for audit and compliance queries that must return current data.

**Qualify All Column Names**: In queries that join multiple tables, prefix every column with its table alias. This prevents ambiguity errors when schema changes add identically-named columns.

## Conclusion: One Template, One Call, Complete Results

The MultiQuery Engine represents a fundamental shift in how enterprise applications fetch hierarchical data. Instead of fighting the N+1 problem or writing complex mega-joins, teams define templates that specify the exact structure they need, then call them via REST or embed them in expressions.

Whether you're building payroll reports, rendering org charts, exporting audit trails, or displaying nested configurations, MultiQuery eliminates the performance penalties and maintainability headaches of traditional approaches. Tenant isolation is automatic, caching is built-in, and the learning curve is gentleâ€”just JSON and SQL.

**Ready to streamline your hierarchical data retrieval?** Visit the complete [MultiQuery documentation](https://docs.bizfirstai.com/WebSites/MultiQuery/) to start writing your first template today. The Getting Started guide will have you executing your first nested query in minutes.
