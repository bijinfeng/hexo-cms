import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger, LogLevel } from "../logger";

describe("Logger", () => {
  let consoleDebug: ReturnType<typeof vi.spyOn>;
  let consoleInfo: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log levels", () => {
    it("should log info by default", () => {
      const logger = new Logger("test", LogLevel.INFO);
      logger.info("test message");
      expect(consoleInfo).toHaveBeenCalledOnce();
    });

    it("should not log debug when min level is info", () => {
      const logger = new Logger("test", LogLevel.INFO);
      logger.debug("debug message");
      expect(consoleDebug).not.toHaveBeenCalled();
    });

    it("should log error regardless of min level", () => {
      const logger = new Logger("test", LogLevel.ERROR);
      logger.error("error message");
      expect(consoleError).toHaveBeenCalledOnce();
    });

    it("should not log warn when min level is error", () => {
      const logger = new Logger("test", LogLevel.ERROR);
      logger.warn("warn message");
      expect(consoleWarn).not.toHaveBeenCalled();
    });
  });

  describe("output format", () => {
    it("should output valid JSON", () => {
      const logger = new Logger("test-module");
      logger.info("hello");
      const call = consoleInfo.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("hello");
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.context?.module).toBe("test-module");
    });

    it("should include error details in error log", () => {
      const logger = new Logger("test");
      const err = new Error("something broke");
      logger.error("failed", {}, err);
      const call = consoleError.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.error?.name).toBe("Error");
      expect(parsed.error?.message).toBe("something broke");
      expect(parsed.error?.stack).toBeDefined();
    });

    it("should include context when provided", () => {
      const logger = new Logger("test");
      logger.info("with context", { postId: "123", userId: "abc" });
      const call = consoleInfo.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.context?.postId).toBe("123");
      expect(parsed.context?.userId).toBe("abc");
    });
  });

  describe("level filtering", () => {
    it("should respect custom min level", () => {
      const logger = new Logger("test", LogLevel.WARN);
      logger.info("should not appear");
      logger.warn("should appear");
      expect(consoleInfo).not.toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledOnce();
    });
  });
});
