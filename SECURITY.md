# Security Policy

## Reporting a Vulnerability

We take the security of RABot seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Create a Public Issue

Security vulnerabilities should **never** be reported through public GitHub issues.

### 2. Report Privately

Please report security vulnerabilities through one of these channels:

- **GitHub Security Advisories**: [Create a private security advisory](https://github.com/RetroAchievements/RABot-Next/security/advisories/new)
- **Discord**: Direct message a moderator on the [RetroAchievements Discord](https://discord.gg/dq2E4hE)

### 3. Provide Details

When reporting, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (if applicable)

### 4. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

## Security Best Practices

When contributing to RABot:

1. **Never commit secrets** - Use environment variables for sensitive data.
2. **Validate user input** - Sanitize and validate all user-provided data.
3. **Follow Discord best practices** - Use proper permission checks and rate limiting.
4. **Use TypeScript strictly** - Type safety helps prevent many security issues.

## Scope

The following are in scope for security reports:

- Command injection vulnerabilities
- Permission bypass issues
- Data exposure or leakage
- Authentication/authorization flaws
- Denial of service vulnerabilities
- Any issue that could compromise bot or user security

The following are OUT of scope:

- Issues in dependencies (report these to the dependency maintainer)
- Social engineering attacks
- Physical access attacks
- Issues requiring privileged access to the host system

Thank you for helping keep RABot and the RetroAchievements community secure!
