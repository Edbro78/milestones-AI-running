import { describe, expect, it } from "vitest";
import {
  formatGarminUserError,
  isNotFoundError,
  isRateLimitError,
} from "@/lib/garmin/errors";

describe("isNotFoundError", () => {
  it("matches Garmin HTML 404 dumps", () => {
    const err = new Error(
      'ERROR: (404), Not Found, "<html><head><title>Not Found</title></head><body>The page you\'re looking for does not exist.</body></html>"',
    );
    expect(isNotFoundError(err)).toBe(true);
    expect(isRateLimitError(err)).toBe(false);
  });
});

describe("formatGarminUserError", () => {
  it("does not leak the HTML dump", () => {
    const msg = formatGarminUserError(
      new Error('ERROR: (404), Not Found, "<html>page you\'re looking for</html>"'),
    );
    expect(msg).not.toMatch(/<html/i);
    expect(msg).toMatch(/endepunkt/i);
  });
});
