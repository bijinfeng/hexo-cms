import { PluginPermissionError } from "./errors";
import type {
  PluginCommandExecutionResult,
  PluginCommandHandler,
  PluginManifest,
  RegisteredCommand,
} from "./types";
import type { PermissionBroker } from "./permissions";

function commandKey(pluginId: string, commandId: string): string {
  return `${pluginId}:${commandId}`;
}

function commandError(code: string, message: string, command?: RegisteredCommand): PluginCommandExecutionResult {
  return {
    ok: false,
    command,
    error: {
      code,
      message,
    },
  };
}

export class CommandRegistry {
  private readonly commands = new Map<string, RegisteredCommand>();
  private readonly handlers = new Map<string, PluginCommandHandler>();

  constructor(
    private readonly permissionBroker: PermissionBroker,
    handlers: Record<string, PluginCommandHandler> = {},
  ) {
    Object.entries(handlers).forEach(([key, handler]) => this.handlers.set(key, handler));
  }

  registerPlugin(manifest: PluginManifest): void {
    this.unregisterPlugin(manifest.id);
    const commands = manifest.contributes?.commands;
    if (!commands?.length) return;

    commands.forEach((command) => {
      this.commands.set(commandKey(manifest.id, command.id), {
        ...command,
        pluginId: manifest.id,
        pluginName: manifest.name,
      });
    });
  }

  unregisterPlugin(pluginId: string): void {
    for (const key of this.commands.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.commands.delete(key);
    }
  }

  registerHandler(pluginId: string, commandId: string, handler: PluginCommandHandler): void {
    this.handlers.set(commandKey(pluginId, commandId), handler);
  }

  async execute(pluginId: string, commandId: string, args: unknown[] = []): Promise<PluginCommandExecutionResult> {
    const key = commandKey(pluginId, commandId);
    const command = this.commands.get(key);
    if (!command) {
      return commandError(
        "PLUGIN_COMMAND_NOT_FOUND",
        `Command ${commandId} for plugin ${pluginId} is not registered or the plugin is disabled.`,
      );
    }

    try {
      this.permissionBroker.assert(pluginId, "command.register", "command.execute");
    } catch (error) {
      if (error instanceof PluginPermissionError) {
        return commandError(error.code, error.message, command);
      }
      throw error;
    }

    const handler = this.handlers.get(key);
    if (!handler) {
      return commandError(
        "PLUGIN_COMMAND_HANDLER_MISSING",
        `Command ${commandId} for plugin ${pluginId} does not have a host handler.`,
        command,
      );
    }

    try {
      const value = await handler({ pluginId, commandId, command, args });
      return { ok: true, command, value };
    } catch (error) {
      return commandError(
        "PLUGIN_COMMAND_FAILED",
        error instanceof Error ? error.message : `Command ${commandId} failed.`,
        command,
      );
    }
  }
}
