# Reward Regression Matrix

Status: `CLOSED — FOCUSED TESTED`. Browser and exact-head Staging verification remain separate gates.

| Case                              | Final contract                                                                                 | Evidence                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Fallback only                     | Fallback is authoritative when no active catalog reward exists                                 | `reward-availability.test.ts`                                       |
| Catalog only                      | Active catalog suppresses fallback                                                             | `reward-availability.test.ts`                                       |
| Multiple active rewards           | All affordable rewards remain available; cheapest deterministic reward drives progress/default | `reward-availability.test.ts`                                       |
| Non-expiring                      | Balance is sufficient; no unlock row required                                                  | `reward-availability.test.ts`                                       |
| Expiring active                   | A live matching unlock is required                                                             | `reward-entitlement-snapshot.test.ts`                               |
| Expired                           | Exact expiry, past expiry, or `expiredAt` is not actionable                                    | `reward-expiration.test.ts`, Phase G matrix                         |
| Redeemed                          | `redeemedAt` entitlement is not actionable                                                     | Phase G matrix                                                      |
| Cost/name/type/code/expiry change | Blocked while a live earned entitlement exists                                                 | `reward-earned-entitlement-mutation-policy.test.ts`, Phase G matrix |
| Status/deactivation               | Deactivation blocked with live entitlement; later activation remains allowed                   | `reward-earned-entitlement-mutation-policy.test.ts`                 |
| Last active reward                | Deactivation returns authority to fallback                                                     | Phase G matrix                                                      |
| Balance below/equal/above         | Not ready below; ready and redeemable at or above cost                                         | Phase G matrix                                                      |
| Historical entitlement snapshot   | Redemption and customer event consume the same canonical snapshot                              | `reward-entitlement-snapshot.test.ts`                               |

No new Reward product logic was required in this phase. The final matrix names and locks previously distributed coverage and adds explicit last-reward, exact boundary, and redeemed-entitlement cases.
