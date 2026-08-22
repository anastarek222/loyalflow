import "server-only";

import { QueueClient } from "@vercel/queue";

export const integrationQueueClient = new QueueClient({ region: "iad1" });

export const { handleCallback, send } = integrationQueueClient;
