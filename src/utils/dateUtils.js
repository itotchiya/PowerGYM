/**
 * Date Utilities for PowerGYM
 * Provides French date formatting and subscription calculation helpers
 */

/**
 * Format a date in French format (dd/mm/yyyy)
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatDateFR(date) {
    if (!date) return 'N/A';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return 'N/A';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Calculate subscription end date based on plan duration
 * Uses proper month addition for monthly plans
 * @param {Date} startDate - The subscription start date
 * @param {number} months - Number of months in the plan (can be 0)
 * @param {number} extraDays - Additional days in the plan (can be 0)
 * @returns {Date} - The calculated end date
 */
export function calculateEndDate(startDate, months = 0, extraDays = 0) {
    const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);

    // Create a copy of the start date
    const endDate = new Date(start);

    // Add months (this properly handles month boundaries)
    if (months > 0) {
        endDate.setMonth(endDate.getMonth() + months);
    }

    // Add extra days
    if (extraDays > 0) {
        endDate.setDate(endDate.getDate() + extraDays);
    }

    return endDate;
}

/**
 * Legacy: Calculate end date from duration in days only
 * @param {Date} startDate - The subscription start date
 * @param {number} durationDays - Total duration in days
 * @returns {Date} - The calculated end date
 */
export function calculateEndDateFromDays(startDate, durationDays) {
    const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
    return new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
}
