export class BrowserJsonStore<T> {
  constructor(private readonly key: string) {}

  load(): T {
    if (typeof window === "undefined") return {} as T;
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {} as T;
    } catch {
      return {} as T;
    }
  }

  save(value: T): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(value));
  }
}
