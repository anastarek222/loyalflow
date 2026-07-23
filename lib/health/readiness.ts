export type ReadinessResult =
  | {
      body: {
        ok: true;
        service: "loyalflow";
        status: "ready";
      };
      status: 200;
    }
  | {
      body: {
        ok: false;
        service: "loyalflow";
        status: "unavailable";
      };
      status: 503;
    };

export async function checkReadiness(
  probe: () => Promise<unknown>
): Promise<ReadinessResult> {
  try {
    await probe();

    return {
      body: {
        ok: true,
        service: "loyalflow",
        status: "ready",
      },
      status: 200,
    };
  } catch {
    return {
      body: {
        ok: false,
        service: "loyalflow",
        status: "unavailable",
      },
      status: 503,
    };
  }
}
