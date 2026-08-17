"use server";

export * from "./actions-legacy";

export {
  adjustCustomerBalanceCommandAction as adjustCustomerBalanceAction,
} from "./balance-adjustment-action";
export {
  addLoyaltyCommandAction as addLoyaltyAction,
} from "./loyalty-earn-actions";
export {
  redeemRewardCommandAction as redeemRewardAction,
} from "./redemption-actions";
