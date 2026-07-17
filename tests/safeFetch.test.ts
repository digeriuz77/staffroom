import { describe, expect, it } from "bun:test";
import { isBlockedHost, isUrlSafe } from "@/lib/net/safeFetch";

describe("safeFetch SSRF guard", () => {
  describe("isBlockedHost", () => {
    it("blocks loopback addresses", () => {
      expect(isBlockedHost("127.0.0.1")).toBe(true);
      expect(isBlockedHost("localhost")).toBe(true);
      expect(isBlockedHost("127.1.2.3")).toBe(true);
    });

    it("blocks private network ranges (RFC 1918)", () => {
      expect(isBlockedHost("10.0.0.1")).toBe(true);
      expect(isBlockedHost("192.168.1.1")).toBe(true);
      expect(isBlockedHost("172.16.0.1")).toBe(true);
      expect(isBlockedHost("172.31.255.255")).toBe(true);
    });

    it("blocks cloud metadata endpoints", () => {
      expect(isBlockedHost("169.254.169.254")).toBe(true);
      expect(isBlockedHost("metadata.google.internal")).toBe(true);
    });

    it("blocks IPv6 loopback and link-local", () => {
      expect(isBlockedHost("::1")).toBe(true);
      expect(isBlockedHost("fe80::1")).toBe(true);
      expect(isBlockedHost("fd00::1")).toBe(true);
    });

    it("does NOT block public domains", () => {
      expect(isBlockedHost("example.com")).toBe(false);
      expect(isBlockedHost("www.tes.com")).toBe(false);
      expect(isBlockedHost("some-school.org")).toBe(false);
      expect(isBlockedHost("8.8.8.8")).toBe(false);
    });

    it("strips IPv6 brackets before checking", () => {
      expect(isBlockedHost("[::1]")).toBe(true);
      expect(isBlockedHost("[fe80::1234]")).toBe(true);
    });
  });

  describe("isUrlSafe", () => {
    it("allows valid public https URLs", () => {
      expect(isUrlSafe("https://example.com")).toBe(true);
      expect(isUrlSafe("https://www.tes.com/jobs")).toBe(true);
      expect(isUrlSafe("http://example.org/page")).toBe(true);
    });

    it("rejects invalid URLs", () => {
      expect(isUrlSafe("not-a-url")).toBe(false);
      expect(isUrlSafe("")).toBe(false);
      expect(isUrlSafe("://missing-protocol")).toBe(false);
    });

    it("rejects non-http protocols", () => {
      expect(isUrlSafe("file:///etc/passwd")).toBe(false);
      expect(isUrlSafe("ftp://example.com")).toBe(false);
      expect(isUrlSafe("javascript:alert(1)")).toBe(false);
    });

    it("rejects SSRF targets (metadata/loopback/private)", () => {
      expect(isUrlSafe("http://169.254.169.254/latest/meta-data/")).toBe(false);
      expect(isUrlSafe("http://localhost:3000/admin")).toBe(false);
      expect(isUrlSafe("http://127.0.0.1:5432/")).toBe(false);
      expect(isUrlSafe("http://10.0.0.1/internal")).toBe(false);
      expect(isUrlSafe("http://192.168.1.1/")).toBe(false);
    });

    it("rejects IPv6 loopback URLs", () => {
      expect(isUrlSafe("http://[::1]/")).toBe(false);
      expect(isUrlSafe("http://[fe80::1]/")).toBe(false);
    });
  });
});
