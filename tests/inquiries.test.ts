import { describe, it, expect } from "vitest";
import { isLooselyValidEmail, pickInquiryRateLimitKey } from "../lib/inquiries";

describe("isLooselyValidEmail", () => {
  it("通常のアドレスを受け入れる", () => {
    expect(isLooselyValidEmail("a@b.co")).toBe(true);
    expect(isLooselyValidEmail("user.name+tag@example.co.jp")).toBe(true);
  });
  it("@ なし・ドメインなし・空白入りを弾く", () => {
    expect(isLooselyValidEmail("nope")).toBe(false);
    expect(isLooselyValidEmail("a@b")).toBe(false);
    expect(isLooselyValidEmail("a b@c.d")).toBe(false);
    expect(isLooselyValidEmail("")).toBe(false);
  });
});

describe("pickInquiryRateLimitKey", () => {
  it("user_id があれば user を最優先する", () => {
    expect(pickInquiryRateLimitKey("u1", "a@b.co", "1.2.3.4")).toEqual({
      type: "user",
      value: "u1",
    });
  });
  it("user_id が無ければ email を使う", () => {
    expect(pickInquiryRateLimitKey(null, "a@b.co", "1.2.3.4")).toEqual({
      type: "email",
      value: "a@b.co",
    });
  });
  it("user_id も email も無ければ IP にフォールバックする（#129）", () => {
    expect(pickInquiryRateLimitKey(null, null, "1.2.3.4")).toEqual({
      type: "ip",
      value: "1.2.3.4",
    });
    expect(pickInquiryRateLimitKey(undefined, undefined, "1.2.3.4")).toEqual({
      type: "ip",
      value: "1.2.3.4",
    });
  });
  it("IP が unknown（ヘッダ欠落）なら全部無しとして扱う", () => {
    expect(pickInquiryRateLimitKey(null, null, "unknown")).toEqual({ type: "none" });
  });
  it("何も無ければ none", () => {
    expect(pickInquiryRateLimitKey(null, null, null)).toEqual({ type: "none" });
  });
});
