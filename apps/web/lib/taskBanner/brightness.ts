// Task Banner Brightness Calculation Utilities

/**
 * Calculate task brightness level (1-5) based on time until due date
 * Higher brightness = more urgent
 *
 * @param dueDate - The task's due date
 * @returns Brightness level 1-5
 */
export function calculateTaskBrightness(dueDate: Date): number {
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue < 1) return 5; // BLAZING - due in < 1 hour
  if (hoursUntilDue < 3) return 4; // BRIGHT - due in 1-3 hours
  if (hoursUntilDue < 6) return 3; // MEDIUM - due in 3-6 hours
  if (hoursUntilDue < 24) return 2; // DIM - due in 6-24 hours
  return 1; // VERY DIM - due in 1+ days
}

/**
 * Format the time until due date as a human-readable string
 * e.g., "30 MINS", "2 HOURS", "TOMORROW", "3 DAYS"
 *
 * @param dueDate - The task's due date
 * @returns Formatted time string in UPPERCASE
 */
export function formatDueTime(dueDate: Date): string {
  const now = new Date();
  const msUntilDue = dueDate.getTime() - now.getTime();

  // Handle overdue tasks
  if (msUntilDue < 0) {
    const minutesOverdue = Math.abs(Math.floor(msUntilDue / (1000 * 60)));
    const hoursOverdue = Math.abs(Math.floor(msUntilDue / (1000 * 60 * 60)));

    if (minutesOverdue < 60) return 'OVERDUE';
    if (hoursOverdue < 24) return `${hoursOverdue}H OVERDUE`;
    return 'OVERDUE';
  }

  const minutesUntilDue = Math.floor(msUntilDue / (1000 * 60));
  const hoursUntilDue = Math.floor(msUntilDue / (1000 * 60 * 60));
  const daysUntilDue = Math.floor(msUntilDue / (1000 * 60 * 60 * 24));

  if (minutesUntilDue < 60) return `${minutesUntilDue} MINS`;
  if (hoursUntilDue < 24) return `${hoursUntilDue} HOURS`;
  if (daysUntilDue === 1) return 'TOMORROW';
  return `${daysUntilDue} DAYS`;
}

/**
 * Get CSS styles for task brightness level
 * Returns opacity, blur, and spread values for the glow effect
 *
 * @param brightness - Brightness level 1-5
 * @returns CSS style values
 */
export function getBrightnessStyles(brightness: number): {
  opacity: number;
  blur: number;
  spread: number;
} {
  const levels: Record<number, { opacity: number; blur: number; spread: number }> = {
    1: { opacity: 0.35, blur: 4, spread: 1 }, // Very dim, barely glowing
    2: { opacity: 0.55, blur: 8, spread: 2 }, // Dim but readable
    3: { opacity: 0.75, blur: 14, spread: 4 }, // Medium visibility
    4: { opacity: 0.9, blur: 24, spread: 8 }, // Bright and attention-grabbing
    5: { opacity: 1, blur: 40, spread: 15 } // BLAZING, impossible to miss
  };
  return levels[brightness] || levels[3];
}

/**
 * Determine if a task should pulse (levels 4-5 only)
 *
 * @param brightness - Brightness level 1-5
 * @returns true if task should have pulsing animation
 */
export function shouldPulse(brightness: number): boolean {
  return brightness >= 4;
}
