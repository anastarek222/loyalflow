type CustomerCreatedAt = {
  id: string;
  createdAt: Date;
};

type FirstRewardEvent = {
  customerId: string;
  firstRewardAt: Date | null;
};

type CustomerActivityEvent = {
  customerId: string;
  createdAt: Date;
};

type CustomerReference = {
  customerId: string | null;
};

export function calculateAverageDaysToFirstReward(
  customers: readonly CustomerCreatedAt[],
  rewards: readonly FirstRewardEvent[]
) {
  const customerCreatedAt = new Map(
    customers.map((customer) => [
      customer.id,
      customer.createdAt,
    ])
  );

  const durations = rewards.flatMap((reward) => {
    const createdAt = customerCreatedAt.get(
      reward.customerId
    );

    if (!createdAt || !reward.firstRewardAt) {
      return [];
    }

    const durationMs =
      reward.firstRewardAt.getTime() -
      createdAt.getTime();

    return durationMs >= 0
      ? [durationMs / (24 * 60 * 60 * 1000)]
      : [];
  });

  if (durations.length === 0) {
    return null;
  }

  return (
    durations.reduce((total, days) => total + days, 0) /
    durations.length
  );
}

export function calculateAverageDaysBetweenVisits(
  visits: readonly CustomerActivityEvent[]
) {
  const visitsByCustomer = new Map<string, Date[]>();

  for (const visit of visits) {
    const existing = visitsByCustomer.get(visit.customerId) ?? [];
    existing.push(visit.createdAt);
    visitsByCustomer.set(visit.customerId, existing);
  }

  const intervals = Array.from(visitsByCustomer.values()).flatMap(
    (customerVisits) => {
      const orderedVisits = [...customerVisits].sort(
        (left, right) => left.getTime() - right.getTime()
      );

      return orderedVisits.slice(1).flatMap((visit, index) => {
        const priorVisit = orderedVisits[index]!;
        const intervalMs = visit.getTime() - priorVisit.getTime();

        return intervalMs >= 0
          ? [intervalMs / (24 * 60 * 60 * 1000)]
          : [];
      });
    }
  );

  if (intervals.length === 0) {
    return null;
  }

  return intervals.reduce((total, days) => total + days, 0) /
    intervals.length;
}

export function calculateRepeatCustomerRate(
  returningCustomers: number,
  customersWithEarnActivity: number
) {
  if (customersWithEarnActivity <= 0) {
    return 0;
  }

  return (returningCustomers / customersWithEarnActivity) * 100;
}

export function countDistinctCustomers(
  records: readonly CustomerReference[]
) {
  return new Set(
    records.flatMap((record) =>
      record.customerId ? [record.customerId] : []
    )
  ).size;
}
