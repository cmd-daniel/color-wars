class TargetLocator {
  private targets: Map<string, any> = new Map();

  public register(id: string, object: any) {
    if (this.targets.has(id)) {
      console.warn(`TargetLocator: Overwriting existing target ID: ${id}`);
    }
    this.targets.set(id, object);
  }

  public get<T>(id: string): T | undefined {
    return this.targets.get(id);
  }

  public unregister(id: string) {
    this.targets.delete(id);
  }

  public clear() {
    this.targets.clear();
  }
}

export const pixiTargetLocator = new TargetLocator();
