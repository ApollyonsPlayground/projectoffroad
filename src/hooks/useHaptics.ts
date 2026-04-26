'use client';

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptic Hierarchy - Mobile Native Feel
 * 
 * Light: Navigation taps, scrolling, small UI interactions
 * Medium: Button presses, likes, selections, form inputs  
 * Heavy: Errors, important actions, destructive actions, successes
 */

// Check if haptics available (web/desktop fallback)
let hapticAvailable = true;

async function checkHaptics() {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    hapticAvailable = false;
  }
}

// Initialize check
if (typeof window !== 'undefined') {
  checkHaptics();
}

/**
 * Light haptic - Navigation, scrolling, small taps
 * Used for: Tab switches, small button taps, scroll stops
 */
export async function hapticLight() {
  if (!hapticAvailable) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Fail silently - haptics not critical
  }
}

/**
 * Medium haptic - Actions, selections
 * Used for: Like buttons, form submissions, card taps, FAB
 */
export async function hapticMedium() {
  if (!hapticAvailable) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    // Fail silently
  }
}

/**
 * Heavy haptic - Important actions
 * Used for: Submit forms, delete actions, errors, successes
 */
export async function hapticHeavy() {
  if (!hapticAvailable) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {
    // Fail silently
  }
}

/**
 * Success notification haptic
 */
export async function hapticSuccess() {
  if (!hapticAvailable) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {
    // Fail silently
  }
}

/**
 * Warning notification haptic
 */
export async function hapticWarning() {
  if (!hapticAvailable) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (e) {
    // Fail silently
  }
}

/**
 * Error notification haptic
 */
export async function hapticError() {
  if (!hapticAvailable) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (e) {
    // Fail silently
  }
}

/**
 * Selection changed haptic - for pickers, sliders
 */
export async function hapticSelection() {
  if (!hapticAvailable) return;
  try {
    await Haptics.selection();
  } catch (e) {
    // Fail silently
  }
}

/**
 * React hook for easy use in components
 */
export function useHaptics() {
  return {
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    success: hapticSuccess,
    warning: hapticWarning,
    error: hapticError,
    selection: hapticSelection,
  };
}