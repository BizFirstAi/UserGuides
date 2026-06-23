
# Task: Create a Documentation Link Validation Agent

Create an autonomous agent that scans the entire documentation repository and finds all broken links, missing pages, missing anchors, missing images, missing CSS files, and missing JavaScript references.

## Repository

```text
C:\BizFirstGO_FI_AI\UserGuides\

this is first page file:///C:/BizFirstGO_FI_AI/UserGuides/docs/index.html
```

## Published Site

```text
https://docs.bizfirstai.com/

under this user guides are here https://docs.bizfirstai.com/WebSites/

'''

## Agent Requirements

The agent must:

1. Recursively scan all files under:

```text
C:\BizFirstGO_FI_AI\UserGuides\
```

2. Analyze at minimum:

```text
*.html
*.htm
*.md
*.markdown
*.js
*.ts
```

3. Extract:

* href links
* src references
* iframe sources
* image references
* CSS references
* JavaScript references
* anchor links (#section)
* navigation menu links
* sidebar links
* card links
* breadcrumb links

4. Validate:

### File Links

Verify referenced files actually exist.

Examples:

```html
href="../MarketHub/index.html"
href="./Storage/index.html"
```

### Anchor Links

Verify:

```html
href="index.html#products"
```

points to an existing:

```html
id="products"
```

or

```html
name="products"
```

within the destination page.

### Images

Verify referenced image files exist.

### CSS

Verify referenced stylesheet files exist.

### JavaScript

Verify referenced script files exist.

### Directory Links

For links such as:

```html
href="../MarketHub/"
```

verify an index page exists.

---

## Published Website Validation

For any URL under:

```text
https://docs.bizfirstai.com/WebSites/
```

perform HTTP validation.

Detect:

* 404
* 500
* redirect loops
* unreachable pages

---

## Output Files

Generate:

```text
BROKEN_LINK_REPORT.md
broken-links.csv
```

### CSV Format

```csv
Source File,Broken Link,Resolved Path,Issue Type,Severity,Details
```

### Severity

Critical:

* Missing page
* Broken navigation
* 404 page

Medium:

* Missing anchor
* Missing image
* Missing CSS
* Missing JS

Low:

* Redirect issue
* Non-critical reference issue

---

## Final Summary

Include:

* Total files scanned
* Total links found
* Total valid links
* Total broken links
* Critical count
* Medium count
* Low count

Also include:

* Top 50 most frequently referenced broken links
* Suggested fixes where obvious
* Folders with highest error counts

---

## Execution Instructions

Do not stop after finding the first issue.

Continue until the entire repository has been scanned.

Create any temporary scripts needed to perform the scan.

Run the scan.

Produce the final report files.

Show progress during execution.


