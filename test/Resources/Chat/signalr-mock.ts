import { vi } from "vitest";

type Handler = (...args: unknown[]) => void;

export type FakeSignalRConnection = {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  invoke: ReturnType<typeof vi.fn>;
  handlers: Map<string, Handler[]>;
  emit: (event: string, ...args: unknown[]) => void;
};

export function createFakeSignalRConnection(): FakeSignalRConnection {
  const handlers = new Map<string, Handler[]>();
  const conn: FakeSignalRConnection = {
    handlers,
    on: vi.fn((event: string, handler: Handler) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    }),
    off: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue(undefined),
    emit(event: string, ...args: unknown[]) {
      for (const h of handlers.get(event) ?? []) {
        h(...args);
      }
    },
  };
  return conn;
}

export let fakeHubConnection: FakeSignalRConnection | null = null;

export function installSignalRMock() {
  fakeHubConnection = createFakeSignalRConnection();
  vi.mock("@microsoft/signalr", () => ({
    HubConnectionBuilder: vi.fn().mockImplementation(() => ({
      withUrl: vi.fn().mockReturnThis(),
      withAutomaticReconnect: vi.fn().mockReturnThis(),
      configureLogging: vi.fn().mockReturnThis(),
      build: () => fakeHubConnection,
    })),
    LogLevel: { Information: 3, Warning: 2 },
    HttpTransportType: { WebSockets: 1 },
  }));
}
