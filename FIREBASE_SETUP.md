# PowerGYM Firebase Setup Guide

This guide explains how to manually set up user roles and permissions in your Firebase project.

## 1. Initial Setup: Super Admin Account
The Super Admin has access to cross-gym management and request approvals.

1.  **Create Auth User:**
    *   Go to **Authentication** > **Users** > **Add user**.
    *   Email: `admin@gymmaster.com` (or your choice).
    *   Password: `SuperAdmin123!` (or your choice).
    *   **Copy the User UID** created (e.g., `7j9K...`).

2.  **Create Firestore Document:**
    *   Go to **Firestore Database** > **Data**.
    *   Click **+ Start collection**.
    *   **Collection ID:** `users`
    *   **Document ID:** Paste the User UID.
    *   **Fields:**
        ```json
        {
          "email": "admin@gymmaster.com",
          "role": "superadmin"
        }
        ```

---

## 2. Setting Up a Gym Owner Account
A Gym Owner account handles both "Owner" and "Manager" access. They log in with the same account but choose their role context.

1.  **Create Auth User:**
    *   Go to **Authentication** > **Users** > **Add user**.
    *   Email: `owner@gymtest.com`.
    *   Password: `GymOwner123!`.
    *   **Copy the User UID**.

2.  **Create Firestore Document:**
    *   Go to **Firestore Database** > **Data** > **users** collection.
    *   Click **+ Add document**.
    *   **Document ID:** Paste the Gym Owner UID.
    *   **Fields:**
        ```json
        {
          "email": "owner@gymtest.com",
          "role": "gymclient",
          "gymId": "gym_001",
          "gymName": "Power Fit Gym",
          "ownerPasswordHash": "" // Leave empty initially
        }
        ```
        *Note: `gymId` serves as the link to their gym's data.*

3.  **Owner Password:**
    *   The `ownerPasswordHash` is generated automatically when the owner sets it up in the app for the first time.
    *   To reset it manually: Clear the string value in Firestore.

---

## 3. Creating Gym Data
Once the owner user is created, create their gym's data container.

1.  **Create Gym Collection:**
    *   Go to **Firestore Database** > **Data**.
    *   Click **+ Start collection**.
    *   **Collection ID:** `gyms`
    *   **Document ID:** `gym_001` (Must match the `gymId` in the user doc).
    *   **Fields:**
        ```json
        {
          "name": "Power Fit Gym",
          "address": "123 Fitness St",
          "phone": "+1234567890",
          "createdAt": "2024-01-01"
        }
        ```

---

## 4. Manager Access
There is no separate "Manager" account in the database.
*   **The Concept:** The Gym Owner account *is* the Manager account.
*   **How it works:**
    *   When logging in, the user chooses "Owner" or "Manager".
    *   **Manager Mode:** Restricted access (Day-to-day tasks).
    *   **Owner Mode:** Full access (Financials, Settings) - Protected by an additional PIN/Password.

## 5. Firestore Rules
Ensure your rules allow these roles to function:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /sessions/{userId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    match /gymRequests/{requestId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    match /gyms/{gymId} {
      allow read, write: if request.auth != null;
    }
    match /gyms/{gymId}/members/{memberId} {
      allow read, write: if request.auth != null;
    }
    match /gyms/{gymId}/plans/{planId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
