export type LogoutEverywhereInput = {
  userId: string;
  expectedAuthVersion: number;
};

export type LogoutEverywhereResult =
  | { status: "success" }
  | { status: "stale" };

export type LogoutEverywhereStore = {
  incrementAuthVersionIfCurrent(input: LogoutEverywhereInput): Promise<number>;
};

export async function logoutEverywhereWithStore(
  input: LogoutEverywhereInput,
  store: LogoutEverywhereStore,
): Promise<LogoutEverywhereResult> {
  const updatedCount = await store.incrementAuthVersionIfCurrent(input);

  return updatedCount === 1 ? { status: "success" } : { status: "stale" };
}
