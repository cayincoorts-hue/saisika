# Security Policy

## Reporting a Vulnerability

Saisca runs entirely offline on your local machine. No data leaves your computer, and there are no cloud dependencies. However, security issues may still exist in the codebase.

To report a vulnerability:

- **Do NOT** open a public issue — this could expose the vulnerability before a fix is available.
- **Email** the maintainer directly at the GitHub profile email listed on the [repository owner's page](https://github.com/cayincoorts-hue).
- Include a detailed description of the issue, steps to reproduce, and any potential impact.

## What to Expect

- Acknowledgment of your report within **72 hours**.
- Regular updates on the status of the fix.
- Credit in the release notes if you wish to be recognized (optional).

## Scope

Security concerns include but are not limited to:

- Data leakage or unintended network access
- Unsafe handling of uploaded files
- Dependency vulnerabilities
- Input validation bypass

## Supported Versions

Only the latest release on the `main` branch receives security updates.

| Version | Supported |
|---------|-----------|
| latest `main` | ✅ |
| older releases | ❌ |
