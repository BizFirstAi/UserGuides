# InstallHub: Building a Package Management System for Workflow Automation

In enterprise automation environments, distributing workflows, forms, and business logic across multiple tenants and environments is complex and error-prone. InstallHub solves this by providing a complete package management system that treats automation artifacts as first-class deployable units.

## The Problem: Artifact Distribution Without Standards

Teams building on BizFirstAI face a critical challenge: how do you reliably move automation artifacts from development to production? How do you share reusable workflows across teams? Without a standardized approach, organizations resort to manual reconstruction, version control workarounds, or risky direct database manipulations. Each approach introduces risks â€” human error, version mismatches, missing dependencies, and no audit trail.

InstallHub eliminates these friction points by treating artifact distribution as a first-class concern with the same rigor applied to traditional software packaging.

## Why This Solution Exists

As organizations build more sophisticated automation across departments, they encounter three recurring problems:

1. **Cross-environment promotion requires rigor** â€” moving workflows from dev to staging to production must be repeatable, traceable, and reversible.

2. **Sharing components across teams needs safety** â€” other teams need access to proven workflows and forms without requiring tenant access or risking collisions.

3. **The marketplace economy requires trust** â€” enabling a community marketplace for automation components demands comprehensive security scanning and clear provenance.

InstallHub addresses all three by providing a complete three-phase platform: export (Phase 1, production-ready), import (Phase 2, in development), and marketplace distribution (Phase 3, in design).

## Core Features and Capabilities

### Feature 1: Automatic Dependency Resolution

When you select artifacts to package, InstallHub doesn't just include what you specify â€” it automatically discovers and includes all transitive dependencies. If a workflow references a form, that form is automatically included. If the form uses a field library, the library is included. This eliminates the manual work of tracking down all related components and the risk of deploying incomplete packages.

The dependency resolver traverses the artifact graph recursively, ensuring every referenced component is discovered before serialization begins.

### Feature 2: Integrity Verification via Checksums

Every package includes a SHA-256 checksum computed over all artifact file contents. On import, the system recomputes this hash and verifies it matches the manifest. If a package has been tampered with or corrupted during transfer, the import is rejected immediately with a clear error. This provides cryptographic assurance that what you import is exactly what was exported.

### Feature 3: Intelligent Conflict Resolution

When importing a package into a tenant that already contains artifacts with the same name and type, InstallHub applies configurable conflict strategies:

- **Replace**: Overwrite the existing artifact with the package version (ideal for devâ†’stagingâ†’production promotion)
- **Merge**: Intelligently combine the two artifacts (suitable for forms with shared fields)
- **Skip**: Keep the existing artifact and ignore the package version (safe default for community packages)

This flexibility allows different teams to use the same package with different conflict handling strategies appropriate to their environment.

### Feature 4: Comprehensive Pre-Import Security Scanning

Before any artifact is written to the target tenant, mandatory security scanning detects:

- **Expression injection patterns** that could execute arbitrary code
- **SQL injection vulnerabilities** in data queries
- **Known CVEs** in dependency manifests
- **Content policy violations** (credential exposure, restricted operations)
- **Credential leakage** (API keys, connection strings accidentally included)

Scanning produces three outcomes: PASS (safe to install), WARN (low/medium findings, install with caution), or FAIL (critical/high findings, import blocked). Critical findings cannot be overridden even by administrators â€” ensuring baseline security regardless of role.

### Feature 5: Transactional Installation

When importing, all artifacts are installed in dependency order within a single database transaction. If any artifact fails validation or installation, all changes roll back automatically. This guarantees that either the entire package succeeds or nothing is changed â€” no partial, broken states.

## Architecture Overview

InstallHub is built as a seven-project system:

1. **InstallHub.Core** â€” Package model, manifest schema, and semantic versioning
2. **InstallHub.Export** â€” Dependency resolver, serializer, checksum computer, ZIP assembly
3. **InstallHub.Import** â€” Validator, security scanner, ID remapper, conflict resolver, transaction manager
4. **InstallHub.Security** â€” Expression/SQL injection detectors, CVE checker, credential scanner
5. **InstallHub.PublicHub** â€” Marketplace catalog, search, trust level management, publishing workflow
6. **InstallHub.Api** â€” REST endpoints for export, import, history, and marketplace operations
7. **InstallHub.Tests** â€” 86% code coverage across all phases

The system follows a clean separation of concerns: each responsibility has a dedicated service interface (`IExportService`, `IImportService`, `IPackageSecurityScanner`, etc.). This enables testing components in isolation and replacing implementations without affecting the rest of the system.

## Step-by-Step: Exporting a Workflow Package

Let's walk through exporting a workflow with its dependencies:

**Step 1: Specify the root artifacts**

You call `IExportService.ExportAsync()` with an `ExportRequest` containing:
- The workflow ID(s) you want to package
- A package name (`"Onboarding Suite"`)
- A semantic version (`"2.1.0"`)
- Optional description and metadata

**Step 2: Pre-export validation**

The system validates that:
- All specified artifact IDs exist in your tenant
- No circular dependencies exist in the artifact graph
- All artifacts are in a valid, complete state

If validation fails, you receive detailed error messages before any processing begins.

**Step 3: Dependency discovery**

`DependencyResolver` recursively traverses the artifact graph:
- The workflow references form ID 2005 â†’ form is included
- Form 2005 references field library ID 1050 â†’ library is included
- The workflow uses rule set ID 305 â†’ rule set is included

The result is an ordered set: all artifacts needed to run the workflow.

**Step 4: Serialization**

Each artifact is serialized to JSON:
- Workflow definition with all nodes, connections, and expressions
- Form schema with all fields and validation rules
- Rule set definitions
- Entity schemas

**Step 5: Checksum computation**

SHA-256 hash computed over all artifact JSON contents concatenated in dependency order. This hash is embedded in the manifest.

**Step 6: Manifest generation**

A `manifest.json` is created listing:
- All included artifacts with types, versions, file paths
- Dependencies with per-artifact hashes
- Package metadata (author, export timestamp, tenant ID, overall checksum)

**Step 7: ZIP assembly**

All artifacts and the manifest are assembled into a ZIP file:

```
my-onboarding-package-2.1.0.zip
â”œâ”€â”€ manifest.json
â”œâ”€â”€ README.md (auto-generated)
â””â”€â”€ artifacts/
    â”œâ”€â”€ workflows/proc-1001.json
    â”œâ”€â”€ workflows/thread-2002.json
    â”œâ”€â”€ forms/form-2005.json
    â”œâ”€â”€ rules/rule-305.json
    â””â”€â”€ entities/ent-44.json
```

You receive the ZIP bytes and can store, transfer, or submit it.

## Real-World Scenario: Cross-Environment Promotion

**Situation**: Your HR team builds an employee onboarding workflow in development. QA tests it in staging. After approval, it needs to reach production.

**Traditional approach**: Platform engineers manually recreate the workflow in production, copying nodes, connections, and expressions from the staging UI. This is tedious, error-prone, and creates version drift if staging and production workflows diverge.

**InstallHub approach**:

1. In the dev tenant, an engineer exports the workflow: `onboarding-v2.1.0.zip`
2. The package includes the workflow, all referenced forms, field libraries, and rule sets
3. The same ZIP is imported to staging with `conflictStrategy: Replace` (safely overwriting the test version)
4. QA verifies the imported workflow works identically
5. The same ZIP is imported to production with the same conflict strategy
6. Audit logs record who imported what, when, and with what result in each environment
7. If a bug is discovered, rollback is simple: re-import the previous version (`onboarding-v2.0.5.zip`)

Every environment runs the exact same checksum-verified artifact. Version history is queryable. Rollback is automated.

## Real-World Scenario: Sharing Components Across Teams

**Situation**: Your Finance team built a best-practice expense approval workflow. Operations, HR, and IT all want to reuse it.

**InstallHub approach**:

1. Finance exports the workflow as `expense-approval-v1.0.0.zip`
2. They post the ZIP to a shared file location
3. Each team imports it into their own tenant

The import pipeline automatically:
- Remaps the workflow ID and all referenced IDs to avoid collisions with existing artifacts
- Scans for security issues
- Applies the team's conflict strategy (e.g., Skip if a local approval workflow exists)
- Installs everything in a single transaction

Each team gets a working copy of the workflow without needing access to the source tenant or manually recreating components.

## Benefits Summary

- **Reproducibility**: Export a workflow once, import it identically many times
- **Auditability**: Complete history of who exported/imported what, when, and with what result
- **Safety**: Integrity verification, security scanning, and transactional installation
- **Flexibility**: Conflict resolution strategies adapted to different environments
- **Distribution**: Share packages across teams, environments, and eventually via the marketplace
- **Rollback**: Re-import previous package versions to undo changes

## Best Practices When Using InstallHub

1. **Always use semantic versioning** â€” follow SemVer (major.minor.patch) so consumers understand whether imports are safe
   - Patch: bug fixes, always safe to auto-update
   - Minor: new optional features, backward compatible
   - Major: breaking changes, test before importing

2. **Review security scan results** â€” a WARN result means medium/low findings; investigate before promoting to production

3. **Test major version imports first** â€” a major version bump signals breaking changes; always test in a non-production environment first

4. **Use dry-run imports** â€” before committing an import, use `dryRun: true` to preview the impact without modifying the tenant

5. **Automate promotion pipelines** â€” integrate `IExportService` and `IImportService` into CI/CD pipelines for reliable, repeatable deployment

6. **Version your packages independently** â€” package version is separate from artifact version; version the package based on the changes you're making to the bundle

7. **Document package dependencies** â€” if your package extends another package, declare that dependency in the manifest so consumers know the installation order

8. **Store packages in version control** â€” commit ZIPs to Git (or a package registry) so you have a complete history and can reconstruct any version

## Conclusion

InstallHub transforms workflow and form distribution from a manual, error-prone process into a reliable, audited, secure operation. Whether you're promoting automation across environments, sharing components across teams, or building toward a community marketplace, InstallHub provides the infrastructure to do it safely and at scale.

The export system is production-ready today. Import and marketplace phases are in active development and will deliver the complete vision of an automated ecosystem where teams can share, discover, and install trusted automation components with confidence.

Ready to standardize your artifact distribution? Explore the [InstallHub documentation](https://docs.bizfirstai.com/WebSites/InstallHub/) to get started with exports today and prepare for import workflows tomorrow.
