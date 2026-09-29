import { expect, it } from "vitest";
import { name } from "../src/index.js";

it("smoke", () => {
  expect(name()).toBe("prd2mcp");
});
