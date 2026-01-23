# Admin Operational Guide

## Overview

This guide details the operational procedures for the PayPal Verification Platform. It covers session management, security protocols, system monitoring, and the new billing module.

## 1. Access & Security

### 1.1 First-Time Login
*   **Gatekeeper**: You must first pass the Gatekeeper authentication. Default credentials should be changed immediately in `Settings`.
*   **Admin Login**: Use your assigned username and password.
*   **MFA**: Multi-Factor Authentication is now enforced for all admin accounts. You will be prompted to scan a QR code on your first login.

### 1.2 Multi-Factor Authentication (MFA)
*   **Setup**: Use Google Authenticator or Authy to scan the QR code.
*   **Recovery**: If you lose your MFA device, contact a Hypervisor admin to reset your MFA status.

### 1.3 Session Security
*   **Timeouts**: Sessions automatically expire after 15 minutes of inactivity.
*   **Concurrent Logins**: The system detects and flags concurrent logins from different IPs.

## 2. Session Management

### 2.1 Live Monitoring
Navigate to the **Sessions** tab to see real-time activity.
*   **Status Indicators**:
    *   🟢 **Active**: User is currently on the page.
    *   🔴 **Offline**: User disconnected > 60s ago.
    *   ✅ **Verified**: User completed the flow.
*   **Live Data**: updates as the user types (keystroke-logging enabled).

### 2.2 Controlling User Flow
You can manually override the verification steps for any active session:
*   **Actions Menu**:
    *   `Force OTP`: Redirect user to SMS verification.
    *   `Force Bank App`: Redirect user to mobile app download.
    *   `Approve`: Auto-fill and advance user.
    *   `Reject`: Show error message.

### 2.3 Command Queue
Commands sent to offline users are queued and executed immediately when they reconnect.

## 3. Link Management & Logic

### 3.1 Creating Links
*   Go to **Links** > **New Link**.
*   This generates a unique `?id=XYZ` tracking code.

### 3.2 Logic Configuration
Customize how the flow behaves for victims visiting your link:
*   **Auto-Approve Login**: Bypasses password check.
*   **Smart Routing**:
    *   *Default*: Standard flow.
    *   *Bank App Mode*: Forces app download for mobile users.
    *   *Double OTP*: Requests SMS code twice.

### 3.3 A/B Testing
*   Enable **A/B Testing** in Link Settings.
*   Define **Variant B** logic (e.g., specific theme or smarter routing).
*   Set traffic weight (e.g., 50/50).

## 4. Billing & Crypto Payments

### 4.1 Payment Settings
*   Navigate to **Billing** tab.
*   **Wallet Addresses**: Configure BTC/ETH/USDT addresses for receiving payments.
*   **Thresholds**: Set minimum payment amounts for verification.

### 4.2 Manual Verification
*   Due to security hardening, all crypto payments require **Manual Approval** by an admin.
*   When a user claims to have sent payment, an alert will appear in the dashboard.
*   Verify the transaction on the blockchain explorer before clicking **Approve**.

## 5. System Health & Logs

### 5.1 Server Status
*   **Health Dashboard**: Shows CPU/RAM usage, Uptime, and Database connection status.
*   **Redis Status**: Indicates if the caching layer is operational.

### 5.2 Audit Logs
*   All admin actions are logged (Login, Settings Change, Session Revoke).
*   Hypervisors can view the full **Audit Trail** in the Users tab.

### 5.3 Logs Viewer
*   Access raw server logs via the **Logs** tab (Hypervisor only).
*   Logs are rotated daily.

## 6. Deployment & Maintenance

### 6.1 Backups
*   **Automated Backups**: Run daily at 00:00 UTC.
*   **Manual Backup**: Click **Create Backup** in Settings (downloads SQL dump).

### 6.2 Updates
*   The system uses Docker. To update:
    ```bash
    git pull
    docker compose up -d --build
    ```

### 6.3 Troubleshooting
*   **Red Database Status**: Check postgres container logs.
*   **WebSocket Issues**: Ensure Nginx is configured for WS upgrade headers.
