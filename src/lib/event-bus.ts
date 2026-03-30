import { EventEmitter } from "events";

const key = Symbol.for("wildfire-cs.eventBus");
const g = globalThis as Record<symbol, EventEmitter | undefined>;

if (!g[key]) {
  g[key] = new EventEmitter();
  g[key]!.setMaxListeners(0);
}

export const eventBus: EventEmitter = g[key]!;
