"use client";

import { FRUIT_CODES } from "@/lib/userClient";

type Props = {
  emoji: string;
  size: "lg" | "sm";
};

export default function AvatarMark({ emoji, size }: Props) {
  const code = FRUIT_CODES[emoji] ?? "YZ";
  return (
    <div className={`avatar-mark avatar-mark--${size}`} aria-hidden>
      {code}
    </div>
  );
}
