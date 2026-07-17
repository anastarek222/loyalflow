import { Customer, Business } from '@prisma/client';

export function calculateProgress(customer: Customer, business: Business) {
  if (!business?.rewardThreshold) return { progress: 0, total: 1 };

  let progress: number;

  switch (business.loyaltyMode) {
    case 'VISITS':
    case 'POINTS':
      progress = parseFloat((customer.balance || 0).toFixed(2));
      break;
    case 'SALES_AMOUNT':
      progress = parseFloat((customer.lifetimeEarned || 0).toFixed(2));
      break;
    default:
      return { progress: 0, total: 1 };
  }

  const total = parseFloat(business.rewardThreshold?.toFixed(2)) || 1;

  return {
    progress: Math.min(100, Math.max(0, (progress / total) * 100))),
    total,
  };
}