# Transaction Edit Architecture

## Service Layer Architecture Diagram

```mermaid
graph TD
    Client[Frontend Client] -->|PATCH /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId| Router[Express Router]
    Client -->|GET .../transactions/:transactionId/history| Router

    Router --> Auth[authenticate Middleware<br/>JWT Validation]
    Auth --> OrgRole[requireOrgRole Middleware<br/>OWNER/ADMIN Check]
    OrgRole --> Validate[validate Middleware<br/>Zod Schema Validation]
    Validate --> Reconciled[preventReconciledModification<br/>Business Rule Check]
    Reconciled --> Controller[Transaction Controller]

    Controller -->|updateTransactionWithAudit| Service[Transaction Service]
    Controller -->|getTransactionHistory| Service

    Service --> OptimisticLock{Optimistic Lock<br/>Version Check}
    OptimisticLock -->|Version Mismatch| ConflictError[409 Conflict Error]
    OptimisticLock -->|Version Match| BusinessRules[Business Rule Validation]

    BusinessRules --> ChangeDetection[Change Detection<br/>Build Diff]
    ChangeDetection --> BalanceCalc[Balance Adjustment<br/>Calculator]
    BalanceCalc --> DBTransaction[Prisma Transaction]

    DBTransaction --> UpdateTx[Update Transaction<br/>Increment Version]
    DBTransaction --> UpdateSplits[Update Splits<br/>Delete Old, Create New]
    DBTransaction --> UpdateBalances[Update Account Balances]
    DBTransaction --> CreateAudit[Create Audit Trail Entry]
    DBTransaction --> UpdateAuditFields[Update lastModifiedById<br/>updatedAt]

    UpdateTx --> Commit{Commit Transaction}
    UpdateSplits --> Commit
    UpdateBalances --> Commit
    CreateAudit --> Commit
    UpdateAuditFields --> Commit

    Commit -->|Success| Response[Format Response<br/>Return Updated Transaction]
    Commit -->|Failure| Rollback[Rollback All Changes]

    Response --> Client
    ConflictError --> Client
    Rollback --> ErrorHandler[Error Handler<br/>500 Error]
    ErrorHandler --> Client

    style OptimisticLock fill:#ff9,stroke:#333,stroke-width:3px
    style DBTransaction fill:#9cf,stroke:#333,stroke-width:3px
    style Commit fill:#9f9,stroke:#333,stroke-width:3px
    style ConflictError fill:#f99,stroke:#333,stroke-width:2px
```

## Data Flow: Transaction Update with Audit Trail

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Router/Middleware
    participant Ctrl as Controller
    participant Svc as Service
    participant DB as Database (Prisma)

    C->>R: PATCH /transactions/:id<br/>{version: 1, amount: 125.50}
    R->>R: authenticate (JWT)
    R->>R: requireOrgRole (OWNER/ADMIN)
    R->>R: validate (Zod schema)
    R->>R: preventReconciledModification
    R->>Ctrl: update(req, res, next)

    Ctrl->>Svc: updateTransactionWithAudit(orgId, accountId, txId, data, userId)

    Svc->>DB: findFirst (fetch existing transaction)
    DB-->>Svc: existing transaction (version: 1)

    Svc->>Svc: Check version: 1 === 1 ✓

    Svc->>Svc: Validate business rules<br/>(splits sum, transfer validation)

    Svc->>Svc: Build change log<br/>[{field: 'amount', oldValue: '100.50', newValue: '125.50'}]

    Svc->>Svc: Calculate balance adjustments<br/>[{accountId: 'acc456', adjustment: 25.00}]

    Svc->>DB: BEGIN TRANSACTION

    Svc->>DB: transactionSplit.deleteMany<br/>(if splits updated)
    DB-->>Svc: OK

    Svc->>DB: transaction.update<br/>{amount: 125.50, version: {increment: 1}, lastModifiedById: 'u222'}
    DB-->>Svc: updated transaction (version: 2)

    Svc->>DB: account.update<br/>{balance: {increment: 25.00}}
    DB-->>Svc: OK

    Svc->>DB: transactionEditHistory.create<br/>{transactionId, editedById, version: 2, changes: [...]}
    DB-->>Svc: audit entry created

    Svc->>DB: COMMIT TRANSACTION
    DB-->>Svc: SUCCESS

    Svc-->>Ctrl: formatted transaction with audit fields
    Ctrl-->>C: 200 OK<br/>{success: true, data: {...}}
```

## Concurrent Modification Handling

```mermaid
sequenceDiagram
    participant U1 as User 1 (Jane)
    participant U2 as User 2 (Bob)
    participant DB as Database

    Note over U1,DB: Both users fetch transaction (version: 1)

    U1->>DB: GET /transactions/tx789
    DB-->>U1: {id: 'tx789', amount: '100.50', version: 1}

    U2->>DB: GET /transactions/tx789
    DB-->>U2: {id: 'tx789', amount: '100.50', version: 1}

    Note over U1,U2: Both users make edits locally

    U1->>DB: PATCH /transactions/tx789<br/>{version: 1, amount: 125.50}
    DB->>DB: Check version: 1 === 1 ✓
    DB->>DB: Update transaction (version → 2)
    DB-->>U1: 200 OK {version: 2, amount: '125.50'}

    Note over U2: User 2 tries to update with stale version

    U2->>DB: PATCH /transactions/tx789<br/>{version: 1, amount: 150.00}
    DB->>DB: Check version: 1 !== 2 ✗
    DB-->>U2: 409 Conflict<br/>{currentVersion: 2, providedVersion: 1,<br/>lastModifiedBy: 'Jane', lastModifiedAt: '...'}

    Note over U2: User 2 sees conflict dialog

    U2->>DB: GET /transactions/tx789
    DB-->>U2: {id: 'tx789', amount: '125.50', version: 2}

    Note over U2: User 2 reviews Jane's changes and decides to retry

    U2->>DB: PATCH /transactions/tx789<br/>{version: 2, amount: 150.00}
    DB->>DB: Check version: 2 === 2 ✓
    DB->>DB: Update transaction (version → 3)
    DB-->>U2: 200 OK {version: 3, amount: '150.00'}
```

## Balance Adjustment Logic Flow

```mermaid
graph TD
    Start[Start Balance Adjustment] --> GetTypes{Determine Old & New<br/>Transaction Types}

    GetTypes --> TT_TT{TRANSFER → TRANSFER?}
    GetTypes --> TE_TE{INCOME/EXPENSE → INCOME/EXPENSE?}
    GetTypes --> T_TE{TRANSFER → INCOME/EXPENSE?}
    GetTypes --> TE_T{INCOME/EXPENSE → TRANSFER?}

    TT_TT --> CheckDest{Destination<br/>Changed?}
    CheckDest -->|Yes| ReverseDest[Reverse Old Destination<br/>Apply New Destination]
    CheckDest -->|No| CheckAmount{Amount<br/>Changed?}
    CheckAmount -->|Yes| AdjustDest[Adjust Destination Balance]
    CheckAmount -->|No| AdjustSource[Adjust Source Balance<br/>for Amount/Fee Delta]

    ReverseDest --> ApplyAdj[Apply All Adjustments]
    AdjustDest --> ApplyAdj
    AdjustSource --> ApplyAdj

    TE_TE --> CalcOldImpact[Calculate Old Impact<br/>INCOME: +amount - fee<br/>EXPENSE: -(amount + fee)]
    CalcOldImpact --> CalcNewImpact[Calculate New Impact]
    CalcNewImpact --> CalcDelta[Delta = New - Old]
    CalcDelta --> ApplyAdj

    T_TE --> ReverseTransfer[Reverse Transfer<br/>+source, -destination]
    ReverseTransfer --> ApplyNewType[Apply New INCOME/EXPENSE]
    ApplyNewType --> ApplyAdj

    TE_T --> ReverseOldType[Reverse Old INCOME/EXPENSE]
    ReverseOldType --> ApplyTransfer[Apply Transfer<br/>-source, +destination]
    ApplyTransfer --> ApplyAdj

    ApplyAdj --> End[End]

    style TT_TT fill:#ff9,stroke:#333,stroke-width:2px
    style TE_TE fill:#9f9,stroke:#333,stroke-width:2px
    style T_TE fill:#f9f,stroke:#333,stroke-width:2px
    style TE_T fill:#9ff,stroke:#333,stroke-width:2px
    style ApplyAdj fill:#9cf,stroke:#333,stroke-width:3px
```

## Change Detection Process

```mermaid
graph LR
    Start[Existing Transaction] --> Compare{Compare Fields}

    Compare --> Memo{memo<br/>changed?}
    Compare --> Amount{amount<br/>changed?}
    Compare --> Type{transactionType<br/>changed?}
    Compare --> Date{date<br/>changed?}
    Compare --> Vendor{vendorId<br/>changed?}
    Compare --> Destination{destinationAccountId<br/>changed?}
    Compare --> Fee{feeAmount<br/>changed?}
    Compare --> Splits{splits<br/>changed?}

    Memo -->|Yes| AddChange1[Add to changes:<br/>{field: 'memo', oldValue, newValue}]
    Amount -->|Yes| AddChange2[Add to changes:<br/>{field: 'amount', oldValue, newValue}]
    Type -->|Yes| AddChange3[Add to changes:<br/>{field: 'transactionType', oldValue, newValue}]
    Date -->|Yes| AddChange4[Add to changes:<br/>{field: 'date', oldValue, newValue}]
    Vendor -->|Yes| AddChange5[Add to changes:<br/>{field: 'vendorId', oldValue, newValue}]
    Destination -->|Yes| AddChange6[Add to changes:<br/>{field: 'destinationAccountId', oldValue, newValue}]
    Fee -->|Yes| AddChange7[Add to changes:<br/>{field: 'feeAmount', oldValue, newValue}]
    Splits -->|Yes| AddChange8[Add to changes:<br/>{field: 'splits', oldValue[], newValue[]}]

    Memo -->|No| Skip1[Skip]
    Amount -->|No| Skip2[Skip]
    Type -->|No| Skip3[Skip]
    Date -->|No| Skip4[Skip]
    Vendor -->|No| Skip5[Skip]
    Destination -->|No| Skip6[Skip]
    Fee -->|No| Skip7[Skip]
    Splits -->|No| Skip8[Skip]

    AddChange1 --> Aggregate[Aggregate All Changes]
    AddChange2 --> Aggregate
    AddChange3 --> Aggregate
    AddChange4 --> Aggregate
    AddChange5 --> Aggregate
    AddChange6 --> Aggregate
    AddChange7 --> Aggregate
    AddChange8 --> Aggregate

    Skip1 --> End
    Skip2 --> End
    Skip3 --> End
    Skip4 --> End
    Skip5 --> End
    Skip6 --> End
    Skip7 --> End
    Skip8 --> End

    Aggregate --> CreateAudit[Create Audit Trail Entry<br/>with changes array]
    CreateAudit --> End[End]

    style Compare fill:#ff9,stroke:#333,stroke-width:2px
    style Aggregate fill:#9cf,stroke:#333,stroke-width:3px
    style CreateAudit fill:#9f9,stroke:#333,stroke-width:3px
```

## Database Transaction Isolation

```mermaid
graph TB
    Start[Start Database Transaction] --> IsolationLevel[Isolation Level: READ COMMITTED]

    IsolationLevel --> Op1[1. Verify version<br/>Optimistic Lock Check]
    Op1 --> Op2[2. Delete Old Splits<br/>if splits updated]
    Op2 --> Op3[3. Update Transaction<br/>Increment version]
    Op3 --> Op4[4. Create New Splits<br/>if splits updated]
    Op4 --> Op5[5. Update Source Account Balance]
    Op5 --> Op6[6. Update Destination Account Balance<br/>if TRANSFER]
    Op6 --> Op7[7. Create Audit Trail Entry]
    Op7 --> Op8[8. Update Audit Fields<br/>lastModifiedById, updatedAt]

    Op8 --> Commit{All Operations<br/>Successful?}

    Commit -->|Yes| CommitTx[COMMIT TRANSACTION]
    Commit -->|No| RollbackTx[ROLLBACK TRANSACTION]

    CommitTx --> Success[Return Success]
    RollbackTx --> Error[Throw Error]

    Success --> End[End]
    Error --> End

    style IsolationLevel fill:#ff9,stroke:#333,stroke-width:2px
    style Commit fill:#9f9,stroke:#333,stroke-width:3px
    style CommitTx fill:#9cf,stroke:#333,stroke-width:3px
    style RollbackTx fill:#f99,stroke:#333,stroke-width:3px
```

## Error Handling Flow

```mermaid
graph TD
    Request[Incoming Request] --> Auth{JWT Valid?}

    Auth -->|No| Err401[401 Unauthorized<br/>Invalid/missing token]
    Auth -->|Yes| OrgRole{User has<br/>OWNER/ADMIN role?}

    OrgRole -->|No| Err403[403 Forbidden<br/>Insufficient permissions]
    OrgRole -->|Yes| Schema{Zod Schema<br/>Valid?}

    Schema -->|No| Err400V[400 Bad Request<br/>Validation errors]
    Schema -->|Yes| Reconciled{Transaction<br/>Reconciled?}

    Reconciled -->|Yes| Err400R[400 Bad Request<br/>Cannot modify reconciled]
    Reconciled -->|No| TxExists{Transaction<br/>Exists?}

    TxExists -->|No| Err404[404 Not Found<br/>Transaction not found]
    TxExists -->|Yes| VersionCheck{Version<br/>Matches?}

    VersionCheck -->|No| Err409[409 Conflict<br/>Concurrent modification]
    VersionCheck -->|Yes| BusinessRules{Business Rules<br/>Valid?}

    BusinessRules -->|No| Err400B[400 Bad Request<br/>Business rule violation<br/>splits sum, transfer validation]
    BusinessRules -->|Yes| Process[Process Update]

    Process --> DBError{Database<br/>Error?}

    DBError -->|Yes| Err500[500 Internal Server Error<br/>Unexpected error]
    DBError -->|No| Success[200 OK<br/>Transaction updated]

    Err401 --> Client[Return to Client]
    Err403 --> Client
    Err400V --> Client
    Err400R --> Client
    Err404 --> Client
    Err409 --> Client
    Err400B --> Client
    Err500 --> Client
    Success --> Client

    style Err401 fill:#f99,stroke:#333,stroke-width:2px
    style Err403 fill:#f99,stroke:#333,stroke-width:2px
    style Err400V fill:#f99,stroke:#333,stroke-width:2px
    style Err400R fill:#f99,stroke:#333,stroke-width:2px
    style Err404 fill:#f99,stroke:#333,stroke-width:2px
    style Err409 fill:#f90,stroke:#333,stroke-width:3px
    style Err400B fill:#f99,stroke:#333,stroke-width:2px
    style Err500 fill:#f66,stroke:#333,stroke-width:3px
    style Success fill:#9f9,stroke:#333,stroke-width:3px
```

## Audit Trail Query Performance

```mermaid
graph LR
    Client[Client Request] --> Controller[History Controller]
    Controller --> Service[History Service]

    Service --> Verify{Verify Access}
    Verify -->|Fail| Error[404/403 Error]
    Verify -->|Pass| Query[Query History]

    Query --> Index1[Use Index:<br/>transactionId]
    Index1 --> Join[Join with User Table<br/>Get editor info]
    Join --> Order[Order by editedAt DESC]
    Order --> Paginate[Apply LIMIT/OFFSET]

    Paginate --> Count[Count Total Entries<br/>Separate Query]

    Paginate --> Format[Format Results]
    Count --> Format

    Format --> Response[Return Response<br/>with Pagination]

    Response --> Client

    style Index1 fill:#9cf,stroke:#333,stroke-width:2px
    style Paginate fill:#9f9,stroke:#333,stroke-width:2px
```

## Component Integration

```mermaid
graph TB
    subgraph "Frontend (React + Redux)"
        UI[Transaction Edit Form]
        Store[Redux Store<br/>Transaction State]
        API[API Client]
    end

    subgraph "Backend API (Express)"
        Router[Express Router]
        Middleware[Middleware Stack<br/>Auth, Validation, Protection]
        Controller[Transaction Controller]
        Service[Transaction Service]
    end

    subgraph "Data Layer"
        Prisma[Prisma ORM]
        Postgres[(PostgreSQL Database)]
    end

    UI -->|User Edit Action| Store
    Store -->|Dispatch Update| API
    API -->|PATCH with version| Router

    Router --> Middleware
    Middleware --> Controller
    Controller --> Service

    Service --> Prisma
    Prisma --> Postgres

    Postgres -->|Transaction Updated| Prisma
    Prisma -->|Formatted Data| Service
    Service -->|Transaction + Audit| Controller
    Controller -->|JSON Response| API

    API -->|Update Success| Store
    Store -->|Re-render| UI

    API -.->|409 Conflict| Store
    Store -.->|Show Conflict Dialog| UI

    style UI fill:#9cf,stroke:#333,stroke-width:2px
    style Service fill:#9f9,stroke:#333,stroke-width:3px
    style Postgres fill:#ff9,stroke:#333,stroke-width:2px
```

## Middleware Stack

```mermaid
graph LR
    Request[Incoming Request] --> M1[authenticate<br/>JWT Validation]
    M1 --> M2[requireOrgRole<br/>OWNER/ADMIN Check]
    M2 --> M3[validate<br/>Zod Schema Validation]
    M3 --> M4[preventReconciledModification<br/>Business Rule Check]
    M4 --> Controller[Controller Handler]

    Controller --> Service[Service Layer]

    M1 -.->|401| ErrorHandler[Error Handler]
    M2 -.->|403| ErrorHandler
    M3 -.->|400| ErrorHandler
    M4 -.->|400| ErrorHandler
    Service -.->|Various Errors| ErrorHandler

    ErrorHandler --> Response[Error Response]

    style M1 fill:#9cf,stroke:#333,stroke-width:2px
    style M2 fill:#9cf,stroke:#333,stroke-width:2px
    style M3 fill:#9cf,stroke:#333,stroke-width:2px
    style M4 fill:#9cf,stroke:#333,stroke-width:2px
    style ErrorHandler fill:#f99,stroke:#333,stroke-width:3px
```

## Key Design Decisions

### 1. Optimistic Locking Strategy

**Decision**: Use version field incremented on every update

**Rationale**:
- Prevents lost updates without database-level locking
- Scales well with concurrent users
- Provides clear feedback to users about conflicts
- Simple to implement with Prisma

**Trade-offs**:
- Requires client to track version field
- May increase user friction on high-concurrency edits
- Client must handle 409 conflicts gracefully

### 2. Audit Trail Storage

**Decision**: Separate `TransactionEditHistory` table with JSONB changes field

**Rationale**:
- Flexible schema for storing different types of changes
- Efficient storage of sparse change sets
- Easy to query full history for a transaction
- PostgreSQL JSONB provides indexing and query capabilities

**Trade-offs**:
- More complex queries for field-specific history
- Requires careful formatting of change data
- Storage overhead for each edit

### 3. Balance Adjustment Approach

**Decision**: Calculate delta and apply in single transaction

**Rationale**:
- Maintains account balance accuracy
- ACID guarantees prevent inconsistencies
- Handles all transaction type transitions
- Rollback protection on failures

**Trade-offs**:
- Complex logic for type transitions (TRANSFER ↔ INCOME/EXPENSE)
- Requires careful testing of all scenarios
- Performance impact on large transactions (mitigated by Prisma)

### 4. Authorization Model

**Decision**: OWNER/ADMIN for edits, any member for viewing history

**Rationale**:
- Protects financial data from unauthorized changes
- Aligns with organization role hierarchy
- Transparency: all members can view audit trail
- Compliance: maintains accountability

**Trade-offs**:
- May be too restrictive for some organizations
- No per-transaction permissions
- Could add MEMBER edit permission with approval workflow

### 5. Error Response Structure

**Decision**: Structured error responses with field-level errors and conflict metadata

**Rationale**:
- Enables rich client-side error handling
- Provides context for conflict resolution
- Consistent format across all endpoints
- Supports internationalization

**Trade-offs**:
- More verbose response payloads
- Requires client-side parsing logic
- May expose internal state (mitigated by selective exposure)

## Performance Considerations

### Database Indexes

Required indexes for efficient queries:

1. **Transaction.version**: Optimistic lock checks
2. **Transaction.accountId + status**: List queries
3. **TransactionEditHistory.transactionId**: History queries
4. **TransactionEditHistory.editedAt**: Chronological ordering
5. **TransactionEditHistory.editedById**: User-specific history

### Query Optimization

1. **Lazy Loading**: Only fetch audit history when explicitly requested
2. **Pagination**: Limit history queries with OFFSET/LIMIT
3. **Index Usage**: All history queries use indexed fields
4. **Connection Pooling**: Reuse database connections (Prisma default)
5. **Transaction Batching**: Single DB transaction for all updates

### Caching Strategy

Potential caching opportunities:

1. **Transaction List**: Cache with invalidation on updates
2. **User Info**: Cache user name/email lookups (rarely change)
3. **Category Info**: Cache category data (infrequent changes)
4. **Read Replicas**: Route GET requests to replicas (future)

Not recommended to cache:
- Individual transaction data (frequently updated)
- Audit history (integrity critical)

## Security Considerations

### Input Validation

1. **Zod Schema**: Type safety and format validation
2. **Business Rules**: Middleware enforcement
3. **SQL Injection**: Parameterized queries via Prisma
4. **XSS**: Output encoding (handled by JSON responses)

### Authorization

1. **JWT Verification**: Every request authenticated
2. **Role Checks**: Middleware-enforced RBAC
3. **Resource Ownership**: Service layer verifies org membership
4. **Audit Logging**: All changes tracked with user ID

### Data Integrity

1. **Optimistic Locking**: Prevents concurrent modification issues
2. **Database Transactions**: ACID guarantees
3. **Foreign Key Constraints**: Referential integrity
4. **Version Incrementing**: Monotonic version numbers

### Privacy & Compliance

1. **Audit Trail**: Immutable change log for compliance
2. **User Tracking**: Record who made changes and when
3. **IP/User Agent**: Optional metadata for security analysis
4. **Data Retention**: History retained indefinitely (configurable)

## Testing Strategy

### Unit Tests

1. **Change Detection**: Test diff generation for all field types
2. **Balance Calculation**: Test all transaction type transitions
3. **Validation Rules**: Test business rule enforcement
4. **Error Handling**: Test error response formatting

### Integration Tests

1. **Optimistic Locking**: Concurrent update scenarios
2. **Balance Accuracy**: Verify account balances after edits
3. **Audit Trail**: Verify history entries created correctly
4. **Authorization**: Test role-based access control

### End-to-End Tests

1. **Happy Path**: Simple update flow
2. **Conflict Resolution**: User handles 409 error
3. **Reconciled Protection**: Cannot edit reconciled transactions
4. **History Viewing**: Full audit trail retrieval

### Load Tests

1. **Concurrent Edits**: Multiple users editing different transactions
2. **Conflict Rate**: Measure optimistic lock failures under load
3. **Database Performance**: Query response times with large history
4. **API Throughput**: Requests per second capacity
