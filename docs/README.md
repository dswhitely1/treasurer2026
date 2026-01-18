# Treasurer Documentation

Welcome to the Treasurer application documentation. This comprehensive guide will help you understand, develop, deploy, and use the Treasurer financial management system.

## Table of Contents

### For Developers

1. **[Architecture Documentation](./ARCHITECTURE.md)** - System architecture, design patterns, and technical decisions
2. **[Development Guide](./DEVELOPMENT.md)** - Developer onboarding, setup, and workflow
3. **[API Documentation](./API.md)** - Complete API reference with examples
4. **[Transaction Status Feature](./TRANSACTION_STATUS.md)** - Detailed documentation of the transaction status management system

### For Operations

5. **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment, environment setup, and operations

### For End Users

6. **[User Guide](./USER_GUIDE.md)** - How to use Treasurer's features including transaction reconciliation

### Architecture Decision Records

7. **[ADR Directory](./adr/)** - Historical record of architectural decisions
   - [ADR-001: Transaction Status State Machine](./adr/001-transaction-status-state-machine.md)
   - [ADR-002: Optimistic Updates with RTK Query](./adr/002-optimistic-updates-rtk-query.md)
   - [ADR-003: Zero-Downtime Database Migrations](./adr/003-zero-downtime-migrations.md)
   - [ADR-004: Bulk Operations Partial Failure Support](./adr/004-bulk-operations-partial-failure.md)
   - [ADR-005: Single Transaction for Bulk Updates](./adr/005-single-transaction-bulk-updates.md)

## Quick Start

### New Developer Onboarding

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for setup instructions
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
3. Explore [API.md](./API.md) for API details
4. Check [ADR documents](./adr/) to understand key decisions

**Recommended reading order:**
```
DEVELOPMENT.md → ARCHITECTURE.md → API.md → TRANSACTION_STATUS.md
```

### Operations Team

1. Start with [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment procedures
2. Reference [ARCHITECTURE.md](./ARCHITECTURE.md) for system understanding
3. Keep [API.md](./API.md) handy for troubleshooting

### End Users

Go directly to [USER_GUIDE.md](./USER_GUIDE.md) for feature walkthroughs and how-to guides.

## Project Overview

**Treasurer** is a full-stack financial management application designed for multi-organization financial tracking with comprehensive transaction reconciliation capabilities.

**Tech Stack:**
- Frontend: React 18, TypeScript, Redux Toolkit, Tailwind CSS, Vite
- Backend: Express, TypeScript, Prisma ORM, PostgreSQL
- Testing: Vitest (138 backend tests, 232 frontend tests)
- Development: Docker Compose with hot reload

**Key Features:**
- Multi-organization support with role-based access control
- Financial account management (checking, savings, credit cards, etc.)
- Transaction tracking with categories and splits
- **Transaction status management** (UNCLEARED → CLEARED → RECONCILED)
- Bulk transaction operations
- Account reconciliation workflows
- Status history and audit trails

## Documentation Standards

All documentation in this repository follows these standards:

- **Markdown format** with clear heading hierarchy
- **Code examples** with syntax highlighting
- **Diagrams** using Mermaid or ASCII art
- **Cross-references** between related documents
- **Version information** where applicable
- **Last updated** dates on major documents

## Contributing to Documentation

When updating documentation:

1. Keep it clear and concise
2. Include practical examples
3. Update the table of contents if adding sections
4. Add cross-references to related documents
5. Test all code examples
6. Update the "Last Updated" date

## Getting Help

- **Development questions**: Check [DEVELOPMENT.md](./DEVELOPMENT.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API questions**: See [API.md](./API.md)
- **Feature questions**: Review feature-specific docs like [TRANSACTION_STATUS.md](./TRANSACTION_STATUS.md)
- **Deployment issues**: Consult [DEPLOYMENT.md](./DEPLOYMENT.md)

## License

This documentation is part of the Treasurer application. See main repository for license information.

---

**Last Updated:** 2026-01-17
