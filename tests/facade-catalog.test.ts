import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FACADE_MATERIALS,
  FACADE_OPENING_STOCK,
  FACADE_PRODUCTS,
} from "../src/domains/facade/catalog";

describe("facade production catalog", () => {
  it("defines materials referenced by every product recipe", () => {
    const materialNames = new Set(FACADE_MATERIALS.map((m) => m.name));
    for (const product of FACADE_PRODUCTS) {
      assert.ok(product.recipeItems.length > 0, `${product.name} must have a recipe`);
      assert.ok(product.photoUrl, `${product.name} must have a photoUrl`);
      for (const item of product.recipeItems) {
        assert.ok(
          materialNames.has(item.materialName),
          `${product.name}: unknown material ${item.materialName}`,
        );
      }
    }
  });

  it("includes slate tile and decorative stone with distinct recipes", () => {
    const tile = FACADE_PRODUCTS.find((p) => p.name.includes("Сланец"));
    const stone = FACADE_PRODUCTS.find((p) => p.name.includes("Скала"));
    assert.ok(tile);
    assert.ok(stone);
    assert.equal(tile!.outputPerBase, 10);
    assert.equal(stone!.outputPerBase, 1);
    assert.notDeepEqual(tile!.recipeItems, stone!.recipeItems);
  });

  it("keeps cement:sand style recipe (~8 kg white cement per 1 m² tile)", () => {
    const tile = FACADE_PRODUCTS.find((p) => p.name.includes("Сланец"))!;
    const white = tile.recipeItems.find((i) => i.materialName.includes("белый"));
    assert.ok(white);
    assert.equal(white!.quantity, "8");
    assert.equal(white!.unitCode, "KG");
  });

  it("opening stock covers catalog materials", () => {
    for (const name of Object.keys(FACADE_OPENING_STOCK)) {
      assert.ok(
        FACADE_MATERIALS.some((m) => m.name === name),
        `opening stock references unknown material: ${name}`,
      );
    }
  });

  it("facade seed module exports seedFacadeDomain", async () => {
    const mod = await import("../prisma/seeds/domains/facade.ts");
    assert.equal(typeof mod.seedFacadeDomain, "function");
  });
});
