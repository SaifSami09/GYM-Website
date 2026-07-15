// utils/validateSignup.js
// Server-side validation for the join-form payload. Never trust the client —
// the frontend already validates, but the API must too.

const VALID_PLANS = [
  'Starter – $39/mo',
  'Performance – $79/mo',
  'Elite – $149/mo',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s+\-()]{7,20}$/;

function isNonEmptyString(v, maxLen = 255) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= maxLen;
}

function validateSignup(body) {
  const errors = {};
  const clean = {};

  // First / Last name
  if (!isNonEmptyString(body.firstName, 100)) {
    errors.firstName = 'First name is required.';
  } else {
    clean.firstName = body.firstName.trim();
  }

  if (!isNonEmptyString(body.lastName, 100)) {
    errors.lastName = 'Last name is required.';
  } else {
    clean.lastName = body.lastName.trim();
  }

  // Email
  if (!isNonEmptyString(body.email, 255) || !EMAIL_RE.test(body.email.trim())) {
    errors.email = 'A valid email address is required.';
  } else {
    clean.email = body.email.trim().toLowerCase();
  }

  // Phone (optional)
  if (body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== '') {
    const phone = String(body.phone).trim();
    if (!PHONE_RE.test(phone)) {
      errors.phone = 'Enter a valid phone number.';
    } else {
      clean.phone = phone;
    }
  } else {
    clean.phone = null;
  }

  // Plan
  if (!isNonEmptyString(body.plan) || !VALID_PLANS.includes(body.plan.trim())) {
    errors.plan = 'Please select a valid membership plan.';
  } else {
    clean.plan = body.plan.trim();
  }

  // Goal
  if (!isNonEmptyString(body.goal, 100)) {
    errors.goal = 'Please select a primary goal.';
  } else {
    clean.goal = body.goal.trim();
  }

  // Experience
  if (!isNonEmptyString(body.experience, 50)) {
    errors.experience = 'Please select your experience level.';
  } else {
    clean.experience = body.experience.trim();
  }

  // Message (optional, capped length)
  if (body.message !== undefined && body.message !== null && String(body.message).trim() !== '') {
    clean.message = String(body.message).trim().slice(0, 2000);
  } else {
    clean.message = null;
  }

  // Terms agreement
  if (body.agreeTerms !== true) {
    errors.agreeTerms = 'You must agree to the terms to continue.';
  } else {
    clean.agreeTerms = true;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    clean,
  };
}

module.exports = { validateSignup, VALID_PLANS };
