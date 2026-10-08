import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080";

test("analyst tutorials page loads, adds, edits and deletes", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(`${BASE}/analyst-tutorials`, { waitUntil: "domcontentloaded" });

  // Page renders without the "Failed to load tutorials" toast.
  await expect(page.getByRole("heading", { name: /Manage Tutorial Videos/i })).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await expect(page.getByText(/Failed to load tutorials/i)).toHaveCount(0);

  // Add a tutorial.
  await page.getByRole("button", { name: /Add Tutorial/i }).first().click();
  await page.getByPlaceholder(/How to Increase Sales/i).fill("E2E Tutorial");
  await page.getByPlaceholder(/youtube\.com\/watch/i).fill("qp0HIF3SfI4");
  await page.getByRole("button", { name: /^Add Tutorial$/i }).click();

  // It appears in the list.
  await expect(page.getByText("E2E Tutorial")).toBeVisible({ timeout: 10000 });

  // Edit it.
  await page.getByRole("button", { name: /^Edit$/i }).first().click();
  const titleInput = page.getByPlaceholder(/How to Increase Sales/i);
  await expect(titleInput).toHaveValue("E2E Tutorial");
  await titleInput.fill("E2E Tutorial (edited)");
  await page.getByRole("button", { name: /Save Changes/i }).click();
  await expect(page.getByText("E2E Tutorial (edited)")).toBeVisible({ timeout: 10000 });

  // Delete it.
  await page.getByRole("button", { name: /^Remove$/i }).first().click();
  await expect(page.getByText("E2E Tutorial (edited)")).toHaveCount(0, { timeout: 10000 });

  expect(errors.join("\n")).not.toMatch(/Failed to load tutorials/i);
});
