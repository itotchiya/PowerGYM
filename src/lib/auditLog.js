/**
 * Audit Log Utility
 * Tracks all changes to members, plans, and gym settings
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Action types for audit logging
 */
export const AUDIT_ACTIONS = {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted',
    RESTORED: 'restored',
    PERMANENTLY_DELETED: 'permanently_deleted'
};

/**
 * Entity types for audit logging
 */
export const AUDIT_ENTITIES = {
    MEMBER: 'member',
    PLAN: 'plan',
    GYM_SETTINGS: 'gym_settings'
};

/**
 * Main function to create an audit log entry
 * @param {string} gymId - The gym ID
 * @param {Object} eventData - The audit event data
 * @returns {Promise<string>} - The ID of the created log entry
 */
export async function logAuditEvent(gymId, eventData) {
    if (!gymId) {
        console.error('[AuditLog] Missing gymId');
        return null;
    }

    try {
        const auditLogsRef = collection(db, `gyms/${gymId}/auditLogs`);
        const logEntry = {
            ...eventData,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString() // Backup timestamp for immediate use
        };

        const docRef = await addDoc(auditLogsRef, logEntry);
        console.log('[AuditLog] Created audit log:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[AuditLog] Error creating audit log:', error);
        return null;
    }
}

/**
 * Helper to calculate changes between old and new objects
 * @param {Object} oldData - The old data object
 * @param {Object} newData - The new data object
 * @param {string[]} fieldsToTrack - Fields to track changes for
 * @returns {Array} - Array of changes
 */
export function calculateChanges(oldData, newData, fieldsToTrack) {
    const changes = [];

    for (const field of fieldsToTrack) {
        const oldValue = oldData?.[field];
        const newValue = newData?.[field];

        // Only log if values are different
        if (oldValue !== newValue) {
            changes.push({
                field,
                oldValue: oldValue ?? null,
                newValue: newValue ?? null
            });
        }
    }

    return changes;
}

/**
 * Create an audit log for member operations
 * @param {string} gymId - The gym ID
 * @param {Object} user - The user making the change { uid, name, subrole }
 * @param {string} memberId - The member ID
 * @param {string} memberName - The member's display name
 * @param {string} action - The action being performed
 * @param {Array} changes - Array of changes (for updates)
 * @param {Object} snapshot - Optional snapshot of the entity data
 */
export async function createMemberAuditLog(gymId, user, memberId, memberName, action, changes = [], snapshot = null) {
    const eventData = {
        userId: user.uid,
        userName: user.name || 'Unknown User',
        userRole: user.subrole || 'unknown',
        action,
        entityType: AUDIT_ENTITIES.MEMBER,
        entityId: memberId,
        entityName: memberName,
        changes: changes.length > 0 ? changes : null,
        snapshot: snapshot || null
    };

    return logAuditEvent(gymId, eventData);
}

/**
 * Create an audit log for plan operations
 * @param {string} gymId - The gym ID
 * @param {Object} user - The user making the change { uid, name, subrole }
 * @param {string} planId - The plan ID
 * @param {string} planName - The plan's display name
 * @param {string} action - The action being performed
 * @param {Array} changes - Array of changes (for updates)
 * @param {Object} snapshot - Optional snapshot of the entity data
 */
export async function createPlanAuditLog(gymId, user, planId, planName, action, changes = [], snapshot = null) {
    const eventData = {
        userId: user.uid,
        userName: user.name || 'Unknown User',
        userRole: user.subrole || 'unknown',
        action,
        entityType: AUDIT_ENTITIES.PLAN,
        entityId: planId,
        entityName: planName,
        changes: changes.length > 0 ? changes : null,
        snapshot: snapshot || null
    };

    return logAuditEvent(gymId, eventData);
}

/**
 * Create an audit log for gym settings changes
 * @param {string} gymId - The gym ID
 * @param {Object} user - The user making the change { uid, name, subrole }
 * @param {string} action - The action being performed
 * @param {Array} changes - Array of changes
 */
export async function createGymSettingsAuditLog(gymId, user, action, changes = []) {
    const eventData = {
        userId: user.uid,
        userName: user.name || 'Unknown User',
        userRole: user.subrole || 'unknown',
        action,
        entityType: AUDIT_ENTITIES.GYM_SETTINGS,
        entityId: gymId,
        entityName: 'Gym Settings',
        changes: changes.length > 0 ? changes : null,
        snapshot: null
    };

    return logAuditEvent(gymId, eventData);
}

/**
 * Fields to track for each entity type
 */
export const TRACKED_FIELDS = {
    member: [
        'firstName',
        'lastName',
        'email',
        'phone',
        'planId',
        'planName',
        'startDate',
        'endDate',
        'amountPaid',
        'outstandingBalance',
        'hasInsurance',
        'description',
        'cniImageUrl'
    ],
    plan: [
        'name',
        'duration',
        'price',
        'description'
    ],
    gym_settings: [
        'name',
        'address',
        'phone',
        'insurancePrice'
    ]
};
