import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));
import { devAuthRole } from "../../src/server/auth";

afterEach(() => vi.unstubAllEnvs());

it("disables the legacy role override whenever cookie login is configured", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("ZIGGY_DEV_AUTH_ROLE", "ADMIN");
  vi.stubEnv("ZIGGY_DEV_LOGIN", "1");
  vi.stubEnv("ZIGGY_DEV_SESSION_SECRET", "test-session-secret-0123456789");
  expect(devAuthRole()).toBeNull();
  vi.stubEnv("ZIGGY_DEV_SESSION_SECRET", "short");
  expect(devAuthRole()).toBeNull();
  vi.stubEnv("ZIGGY_DEV_LOGIN", "0");
  expect(devAuthRole()).toBe("ADMIN");
  vi.stubEnv("NODE_ENV", "production");
  expect(devAuthRole()).toBeNull();
});
