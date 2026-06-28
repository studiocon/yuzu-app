import { describe, it, expect } from "vitest";
import { isLooselyValidEmail } from "../lib/inquiries";

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
