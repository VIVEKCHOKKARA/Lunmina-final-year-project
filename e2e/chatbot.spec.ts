import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080";

// A short Telugu prompt: "Say hello in Telugu in one word."
const TELUGU_PROMPT = "ఒక్క పదంలో తెలుగులో హలో అని చెప్పు";

test("chatbot replies in Telugu without mojibake", async ({ page }) => {
  await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });

  const input = page.getByPlaceholder(/Ask in any language/i);
  await expect(input).toBeVisible({ timeout: 15000 });

  await input.fill(TELUGU_PROMPT);
  await input.press("Enter");

  // Wait for an assistant bubble to appear with non-empty text.
  // Assistant messages render markdown inside a .prose container.
  const assistant = page.locator(".prose").last();
  await expect(assistant).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await assistant.innerText()).trim().length, { timeout: 30000 })
    .toBeGreaterThan(0);

  const reply = (await assistant.innerText()).trim();
  console.log("ASSISTANT REPLY (ascii):", JSON.stringify(reply));

  // 1) Must contain Telugu-script characters (U+0C00–U+0C7F).
  const teluguChars = [...reply].filter((c) => c >= "ఀ" && c <= "౿");
  expect(teluguChars.length, "expected Telugu characters in reply").toBeGreaterThan(0);

  // 2) Must NOT contain mojibake markers (UTF-8 read as Latin-1).
  expect(/[ÃÂ°]|à°|à¤/.test(reply), "reply contains mojibake").toBe(false);
});
