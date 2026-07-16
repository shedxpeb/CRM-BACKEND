export interface ModuleCapabilityMetadata {
  /**
   * Stable client-facing capability identifier. It is declared by the Nest
   * feature module that owns the HTTP API, preventing a separate registry from
   * drifting from the modules actually loaded by the application.
   */
  readonly capability: string;
}

export interface CapabilityModuleConstructor {
  new (...args: never[]): unknown;
  moduleCapability?: ModuleCapabilityMetadata;
}
