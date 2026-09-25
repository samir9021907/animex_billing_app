/**
 * Centralized Validation Utilities for ANIMEX Billing App
 * Strict validations for Phone Numbers (10 digits), Names, GSTIN, Pincodes, and Numeric amounts.
 */

// ─── Phone Number Helpers ─────────────────────────────────────────────────────

/**
 * Strips all non-digit characters and truncates to maximum 10 digits.
 * Ideal for use inside onChange handlers: e.g. onChange={(e) => setPhone(cleanPhoneNumber(e.target.value))}
 */
export const cleanPhoneNumber = (value: string | undefined | null): string => {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 10);
};

/**
 * Returns true if the phone number is strictly 10 digits and starts with 6, 7, 8, or 9.
 */
export const isValidPhoneNumber = (phone: string | undefined | null): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(digits);
};

/**
 * Validates a phone number and returns a user-friendly error message if invalid.
 */
export const validatePhone = (
  phone: string | undefined | null,
  fieldName: string = 'Phone Number',
  required: boolean = true
): string | null => {
  if (!phone || !phone.trim()) {
    return required ? `${fieldName} is required` : null;
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return `${fieldName} must be 10 digits (${digits.length}/10 entered)`;
  }
  if (!/^[6-9]/.test(digits)) {
    return 'Enter a valid 10-digit mobile number (starts with 6, 7, 8, or 9)';
  }
  return null;
};

// ─── Name and Text Field Helpers ──────────────────────────────────────────────

/**
 * Validates names (Firm Name, Contact Person Name, Product Name, Supplier Name).
 * Checks that it is not empty and has at least `minLength` characters.
 */
export const validateName = (
  name: string | undefined | null,
  fieldLabel: string = 'Name',
  minLength: number = 2,
  required: boolean = true
): string | null => {
  if (!name || !name.trim()) {
    return required ? `Please enter ${fieldLabel}` : null;
  }
  const trimmed = name.trim();
  if (trimmed.length < minLength) {
    return `${fieldLabel} must be at least ${minLength} characters`;
  }
  return null;
};

// ─── Numeric & Code Field Helpers ─────────────────────────────────────────────

/**
 * Cleans pincode to only digits, max 6.
 */
export const cleanPincode = (value: string | undefined | null): string => {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 6);
};

/**
 * Validates 6-digit Indian PIN code.
 */
export const isValidPincode = (pincode: string | undefined | null): boolean => {
  if (!pincode) return false;
  return /^\d{6}$/.test(pincode.trim());
};

/**
 * Cleans GSTIN: uppercase alphanumeric, max 15.
 */
export const cleanGstin = (value: string | undefined | null): string => {
  if (!value) return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
};

/**
 * Validates standard 15-character GSTIN format.
 */
export const isValidGstin = (gstin: string | undefined | null): boolean => {
  if (!gstin || !gstin.trim()) return true; // Optional if empty
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim());
};
