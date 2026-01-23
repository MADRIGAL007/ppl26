# API Reference

## Global Headers
*   **Content-Type**: `application/json`
*   **Authorization**: `Bearer <token>` (Required for all `/api/admin/*` and `/api/system/*` endpoints)
*   **X-CSRF-Token**: Required for state-changing operations (POST/PUT/DELETE) on admin routes.

---

## 1. Authentication (`/api/admin`)

### Gatekeeper
**POST** `/gate`
*   **Payload**: `{ "username": "gate_user", "password": "gate_password" }`
*   **Response**: `{ "status": "ok" }`

### Get CSRF Token
**GET** `/csrf-token`
*   **Response**: `{ "csrfToken": "..." }`

### Login
**POST** `/login`
*   **Payload**: `{ "username": "admin", "password": "password", "code": "666666" }` (Code required if MFA enabled)
*   **Response**: `{ "token": "jwt...", "user": { ... } }`

### MFA Setup
**POST** `/mfa/setup`
*   **Headers**: Auth required.
*   **Response**: `{ "secret": "...", "qr": "data:image/png..." }`

**POST** `/mfa/verify`
*   **Payload**: `{ "token": "123456", "secret": "..." }`

---

## 2. Session Management (`/api/sessions`)

### Get Sessions
**GET** `/`
*   **Query**: `?adminId=123`
*   **Response**: `[ { "id": "...", "status": "Active", ... } ]`

### Sync (Client-Side)
**POST** `/api/sync`
*   **Payload**: `{ "sessionId": "...", "data": { ... } }`
*   **Response**: `{ "command": { "action": "NAVIGATE", ... } }`

### Revoke Session
**POST** `/:id/revoke`
*   **Response**: `{ "status": "revoked" }`

---

## 3. Link Management (`/api/links`)

### Create Link
**POST** `/`
*   **Payload**: `{ "adminId": "...", "flowConfig": { ... } }`
*   **Response**: `{ "code": "xyz123" }`

### Update Link
**PUT** `/:code`
*   **Payload**: `{ "flowConfig": { ... }, "themeConfig": { ... } }`

---

## 4. System & Health (`/api/system`)

### Health Check
**GET** `/health`
*   **Response**:
    ```json
    {
      "status": "healthy",
      "services": { "db": "connected", "redis": "connected" }
    }
    ```

### Metrics
**GET** `/dashboard`
*   **Response**: CPU, RAM, Uptime, Cache Hit Rate.

### Logs
**GET** `/logs`
*   **Query**: `?level=error&limit=50`

### Backups
**POST** `/backups/create`
*   **Response**: `{ "filename": "backup_2024..." }`

---

## 5. Billing (`/api/billing`)

### Get Wallets
**GET** `/wallets`

### Update Wallet
**POST** `/wallets`
*   **Payload**: `{ "currency": "BTC", "address": "..." }`

### Approve Payment
**POST** `/transactions/:id/approve`
*   **Note**: Irreversible action. Flags session as 'Paid'.
