import type { PermissionBroker } from "./permissions";
import type {
  ContentReadAPI,
  DiagnosticsHandler,
  DiagnosticsIssue,
  DiagnosticsReport,
  DiagnosticsTarget,
  PluginManifest,
  RegisteredDiagnostics,
} from "./types";

export interface DiagnosticsRegistryOptions {
  permissionBroker: PermissionBroker;
  contentFactory: (pluginId: string) => ContentReadAPI;
  handlers?: Record<string, DiagnosticsHandler>;
}

export class DiagnosticsRegistry {
  private readonly handlers = new Map<string, DiagnosticsHandler>();

  constructor(private readonly options: DiagnosticsRegistryOptions) {
    if (options.handlers) {
      for (const [key, handler] of Object.entries(options.handlers)) {
        this.handlers.set(key, handler);
      }
    }
  }

  registerHandler(pluginId: string, contributionId: string, handler: DiagnosticsHandler): void {
    this.handlers.set(`${pluginId}:${contributionId}`, handler);
  }

  unregisterPlugin(pluginId: string): void {
    for (const key of this.handlers.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.handlers.delete(key);
    }
  }

  async runDiagnostics(
    registered: RegisteredDiagnostics[],
    manifestsById: Map<string, PluginManifest>,
    target: DiagnosticsTarget,
  ): Promise<DiagnosticsReport[]> {
    const reports: DiagnosticsReport[] = [];

    for (const diagnostics of registered) {
      if (diagnostics.scope !== target.scope) continue;

      const manifest = manifestsById.get(diagnostics.pluginId);
      if (!manifest) continue;

      const handler = this.handlers.get(`${diagnostics.pluginId}:${diagnostics.id}`);

      let issues: DiagnosticsIssue[];

      if (!handler) {
        issues = [
          {
            id: `${diagnostics.id}.no-handler`,
            severity: "error",
            message: `Diagnostics handler not registered for ${diagnostics.id}`,
          },
        ];
      } else {
        try {
          this.options.permissionBroker.assert(diagnostics.pluginId, "content.read", "diagnostics.run");
          const content = this.options.contentFactory(diagnostics.pluginId);
          const result = await handler({
            pluginId: diagnostics.pluginId,
            contributionId: diagnostics.id,
            target,
            content,
          });
          issues = Array.isArray(result) ? result : [];
        } catch (error) {
          issues = [
            {
              id: `${diagnostics.id}.handler-error`,
              severity: "error",
              message: error instanceof Error ? error.message : String(error),
            },
          ];
        }
      }

      reports.push({
        pluginId: diagnostics.pluginId,
        contributionId: diagnostics.id,
        title: diagnostics.title,
        scope: diagnostics.scope,
        issues,
        generatedAt: new Date().toISOString(),
      });
    }

    return reports;
  }
}
