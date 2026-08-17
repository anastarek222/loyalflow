"use server";

import * as legacy from "./actions-legacy";
import { adjustCustomerBalanceCommandAction } from "./balance-adjustment-action";
import { addLoyaltyCommandAction } from "./loyalty-earn-actions";
import { createCustomerReferralCodeCommandAction } from "./referral-actions";
import { redeemRewardCommandAction } from "./redemption-actions";
import {
  assignCustomerTagCommandAction,
  createAndAssignCustomerTagCommandAction,
  removeCustomerTagCommandAction,
} from "./tag-actions";

export async function updateCustomerAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  return legacy.updateCustomerAction(slug, customerId, formData);
}

export async function setCustomerStatusAction(
  slug: string,
  customerId: string,
  isActive: boolean,
) {
  return legacy.setCustomerStatusAction(slug, customerId, isActive);
}

export async function adjustCustomerBalanceAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  return adjustCustomerBalanceCommandAction(slug, customerId, formData);
}

export async function createCustomerReferralCodeAction(
  slug: string,
  customerId: string,
) {
  return createCustomerReferralCodeCommandAction(slug, customerId);
}

export async function createAndAssignCustomerTagAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  return createAndAssignCustomerTagCommandAction(slug, customerId, formData);
}

export async function assignCustomerTagAction(
  slug: string,
  customerId: string,
  tagId: string,
) {
  return assignCustomerTagCommandAction(slug, customerId, tagId);
}

export async function removeCustomerTagAction(
  slug: string,
  customerId: string,
  tagId: string,
) {
  return removeCustomerTagCommandAction(slug, customerId, tagId);
}

export async function createCustomerNoteAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  return legacy.createCustomerNoteAction(slug, customerId, formData);
}

export async function updateCustomerNoteAction(
  slug: string,
  customerId: string,
  noteId: string,
  formData: FormData,
) {
  return legacy.updateCustomerNoteAction(slug, customerId, noteId, formData);
}

export async function addLoyaltyAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  return addLoyaltyCommandAction(slug, customerId, formData);
}

export async function redeemRewardAction(
  slug: string,
  customerId: string,
  rewardId?: string,
  formData?: FormData,
) {
  return redeemRewardCommandAction(slug, customerId, rewardId, formData);
}
