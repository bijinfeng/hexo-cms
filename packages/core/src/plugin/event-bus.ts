import type {
  PluginEvent,
  PluginEventAPI,
  PluginEventDispatchResult,
  PluginEventHandler,
  PluginEventName,
  PluginEventSubscription,
  PluginPermission,
} from "./types";

interface EventSubscriptionRecord {
  id: string;
  pluginId: string;
  eventName: PluginEventName;
  handler: PluginEventHandler;
}

export class EventBus {
  private readonly subscriptions = new Map<string, EventSubscriptionRecord>();
  private nextSubscriptionId = 0;

  subscribe(pluginId: string, eventName: PluginEventName, handler: PluginEventHandler): PluginEventSubscription {
    const id = `${pluginId}:${eventName}:${this.nextSubscriptionId++}`;
    this.subscriptions.set(id, {
      id,
      pluginId,
      eventName,
      handler,
    });

    return {
      dispose: () => {
        this.subscriptions.delete(id);
      },
    };
  }

  unregisterPlugin(pluginId: string): void {
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.pluginId === pluginId) this.subscriptions.delete(id);
    }
  }

  async emit<TPayload = unknown>(
    eventName: PluginEventName,
    payload: TPayload,
    at = new Date().toISOString(),
  ): Promise<PluginEventDispatchResult[]> {
    const event: PluginEvent<TPayload> = {
      name: eventName,
      payload,
      at,
    };
    const subscriptions = [...this.subscriptions.values()].filter((subscription) => subscription.eventName === eventName);

    return Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await subscription.handler(event);
          return {
            ok: true,
            pluginId: subscription.pluginId,
            eventName,
          };
        } catch (error) {
          return {
            ok: false,
            pluginId: subscription.pluginId,
            eventName,
            error: {
              code: "PLUGIN_EVENT_HANDLER_FAILED",
              message: error instanceof Error ? error.message : `Event handler failed for ${eventName}`,
              stack: error instanceof Error ? error.stack : undefined,
            },
          };
        }
      }),
    );
  }
}

export function createPluginEventAPI(
  pluginId: string,
  eventBus: EventBus,
  permissionBroker: { assert(pluginId: string, permission: PluginPermission, operation: string): void },
): PluginEventAPI {
  return {
    on<TPayload = unknown>(
      eventName: PluginEventName,
      handler: PluginEventHandler<TPayload>,
    ): PluginEventSubscription {
      assertEventName(eventName);
      permissionBroker.assert(pluginId, "event.subscribe", "plugin.events.on");
      return eventBus.subscribe(pluginId, eventName, handler as PluginEventHandler);
    },
  };
}

function assertEventName(eventName: string): void {
  if (typeof eventName !== "string" || eventName.trim() === "") {
    throw new Error("Plugin event name must be a non-empty string");
  }
}
