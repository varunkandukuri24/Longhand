import { describe, expect, it } from "vitest";
import { isBlockedHostname, isPrivateOrInternalIp } from "./private-ip";

describe("isPrivateOrInternalIp", () => {
  it("refuses loopback and localhost-range", () => {
    expect(isPrivateOrInternalIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIp("127.0.0.2")).toBe(true);
    expect(isPrivateOrInternalIp("::1")).toBe(true);
  });

  it("refuses private and link-local ranges", () => {
    expect(isPrivateOrInternalIp("10.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIp("10.255.255.255")).toBe(true);
    expect(isPrivateOrInternalIp("172.16.0.1")).toBe(true);
    expect(isPrivateOrInternalIp("172.31.255.1")).toBe(true);
    expect(isPrivateOrInternalIp("192.168.1.1")).toBe(true);
    expect(isPrivateOrInternalIp("169.254.1.1")).toBe(true);
    expect(isPrivateOrInternalIp("169.254.169.254")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isPrivateOrInternalIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrInternalIp("1.1.1.1")).toBe(false);
    expect(isPrivateOrInternalIp("93.184.216.34")).toBe(false);
  });
});

describe("isBlockedHostname", () => {
  it("blocks localhost variants", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("Foo.Localhost")).toBe(true);
  });

  it("allows normal hostnames", () => {
    expect(isBlockedHostname("example.com")).toBe(false);
  });
});
