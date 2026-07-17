import { describe, it, expect } from "vitest";
import {
  INQUIRY_RATE_MAX,
  isLooselyValidEmail,
  pickInquiryRateLimitKeys,
  type InquiryRateLimitKey,
} from "../lib/inquiries";

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

describe("pickInquiryRateLimitKeys", () => {
  it("ログイン済み（user_id あり）は user キーのみ返す", () => {
    expect(pickInquiryRateLimitKeys("u1", "a@b.co", "1.2.3.4")).toEqual([
      { type: "user", value: "u1" },
    ]);
  });
  it("匿名 + email + IP は両方のキーを返す（max 判定用）", () => {
    expect(pickInquiryRateLimitKeys(null, "a@b.co", "1.2.3.4")).toEqual([
      { type: "email", value: "a@b.co" },
      { type: "ip", value: "1.2.3.4" },
    ]);
  });
  it("匿名 + email のみ（IP unknown）は email キーのみ", () => {
    expect(pickInquiryRateLimitKeys(null, "a@b.co", "unknown")).toEqual([
      { type: "email", value: "a@b.co" },
    ]);
  });
  it("匿名 + IP のみ（email なし）は IP キーのみ（#129）", () => {
    expect(pickInquiryRateLimitKeys(null, null, "1.2.3.4")).toEqual([
      { type: "ip", value: "1.2.3.4" },
    ]);
    expect(pickInquiryRateLimitKeys(undefined, undefined, "1.2.3.4")).toEqual([
      { type: "ip", value: "1.2.3.4" },
    ]);
  });
  it("IP が unknown（ヘッダ欠落）かつ email 無しなら空（制限なし）", () => {
    expect(pickInquiryRateLimitKeys(null, null, "unknown")).toEqual([]);
  });
  it("何も無ければ空", () => {
    expect(pickInquiryRateLimitKeys(null, null, null)).toEqual([]);
  });

  it("匿名 + email 毎回変更 + 同一 IP で 5 件超え → IP キーのカウントが 429 を導く（#129 主要ケース）", () => {
    // countRecent 相当のロジックをシミュレート：DB の直近1時間分の行。
    // 攻撃者は email を毎回ローテートし、IP は同一。
    const recentRows: { email: string; ip: string }[] = [];
    const countBy = (keys: InquiryRateLimitKey[]): number => {
      if (keys.length === 0) return 0;
      const counts = keys.map((k) => {
        if (k.type === "email") return recentRows.filter((r) => r.email === k.value).length;
        if (k.type === "ip") return recentRows.filter((r) => r.ip === k.value).length;
        return 0;
      });
      return Math.max(...counts);
    };

    const ip = "203.0.113.9";
    let blockedAt: number | null = null;
    for (let i = 0; i < INQUIRY_RATE_MAX + 1; i++) {
      const email = `attacker+${i}@evil.example`; // 毎回違う email
      const keys = pickInquiryRateLimitKeys(null, email, ip);
      // email キーは常にカウント0（新バケット）だが、IP キーが蓄積分を数える
      if (countBy(keys) >= INQUIRY_RATE_MAX) {
        blockedAt = i;
        break;
      }
      recentRows.push({ email, ip });
    }
    // 5件（INQUIRY_RATE_MAX）投稿された後、6件目でブロックされる
    expect(blockedAt).toBe(INQUIRY_RATE_MAX);
    expect(recentRows.length).toBe(INQUIRY_RATE_MAX);
  });
});
