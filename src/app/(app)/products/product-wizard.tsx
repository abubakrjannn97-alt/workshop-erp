"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Plus, Trash2 } from "lucide-react";
import { AppSelect } from "@/components/app-select";
import { FormField } from "@/components/form-field";
import { ICON_STROKE } from "@/components/nav-icons";
import { createProduct } from "@/app/actions/products";
import { saveProductPhoto } from "@/app/actions/product-photo";
import { finishProductSetup } from "@/app/actions/product-setup";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { D, moneyDisplay } from "@core/shared/decimal";
import catalogStyles from "@/components/catalog-form.module.css";
import styles from "./product-wizard.module.css";

type UnitOpt = { id: string; name: string; symbol: string };
type MaterialOpt = {
  id: string;
  name: string;
  unitCost: string | null;
  storageUnitId: string;
  storageSymbol: string;
};

type RecipeRow = { key: number; materialId: string; quantity: string; unitId: string };

export function ProductCreateWizard({
  locale,
  units,
  materials,
  defaults,
}: {
  locale: Locale;
  units: UnitOpt[];
  materials: MaterialOpt[];
  defaults: {
    category: string;
    saleUnitId: string;
    outputUnitId: string;
    recipeBaseQty: string;
    outputPerBase: string;
  };
}) {
  const t = createT(locale);
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [productId, setProductId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nextKey, setNextKey] = useState(1);
  const [rows, setRows] = useState<RecipeRow[]>([
    { key: 0, materialId: "", quantity: "", unitId: units[0]?.id ?? "" },
  ]);
  const [price, setPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const unitOptions = units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }));
  const materialOptions = [
    { value: "", label: t("products.pickMaterial") },
    ...materials.map((m) => ({ value: m.id, label: m.name })),
  ];

  const expense = useMemo(() => {
    let total = D(0);
    let ok = false;
    for (const row of rows) {
      const mat = materialMap.get(row.materialId);
      if (!mat?.unitCost || !row.quantity) continue;
      try {
        const line = D(mat.unitCost).mul(row.quantity || "0");
        if (line.gt(0)) {
          total = total.add(line);
          ok = true;
        }
      } catch {
        /* skip */
      }
    }
    return ok ? total : null;
  }, [rows, materialMap]);

  function onPickFile(file: File | null) {
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  function submitStep1(formData: FormData) {
    setError(null);
    formData.set("price", "0");
    formData.set("minPrice", "0");
    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.error || !result.id) {
        setError(result.error ?? t("common.error"));
        return;
      }
      if (photoFile) {
        const fd = new FormData();
        fd.set("productId", result.id);
        fd.set("photo", photoFile);
        const photo = await saveProductPhoto(fd);
        if (photo.error) {
          setError(photo.error);
          setProductId(result.id);
          setStep(2);
          return;
        }
      }
      setProductId(result.id);
      setStep(2);
    });
  }

  function submitStep2() {
    if (!productId) return;
    setError(null);
    const expenseStr = expense ? moneyDisplay(expense) : "0";
    if (expense && minPrice && D(minPrice || "0").lt(expense)) {
      setError(t("products.minBelowCost", { n: expenseStr }));
      return;
    }
    if (price && minPrice && D(price || "0").lt(minPrice || "0")) {
      setError(t("products.priceBelowMin"));
      return;
    }

    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("price", price || "0");
    fd.set("minPrice", minPrice || expenseStr || "0");
    for (const row of rows) {
      if (!row.materialId || !row.quantity) continue;
      fd.append("materialId", row.materialId);
      fd.append("quantity", row.quantity);
      fd.append("unitId", row.unitId || materialMap.get(row.materialId)?.storageUnitId || "");
    }

    startTransition(async () => {
      const result = await finishProductSetup(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/products/${productId}`);
      router.refresh();
    });
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.steps}>
        <span className={step === 1 ? styles.stepOn : styles.stepDone}>1. {t("products.stepBasics")}</span>
        <span className={styles.stepSep}>→</span>
        <span className={step === 2 ? styles.stepOn : styles.stepIdle}>2. {t("products.stepRecipe")}</span>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {step === 1 ? (
        <form
          className={catalogStyles.formGrid}
          onSubmit={(e) => {
            e.preventDefault();
            submitStep1(new FormData(e.currentTarget));
          }}
        >
          <div className={`${catalogStyles.formFull} ${styles.photoBlock}`}>
            <p className={styles.photoLabel}>{t("products.photo")}</p>
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className={styles.photoPreview} />
            ) : (
              <div className={styles.photoEmpty}>{t("products.photoHint")}</div>
            )}
            <div className={styles.photoActions}>
              <button type="button" className={styles.photoBtn} onClick={() => cameraRef.current?.click()}>
                <Camera size={18} strokeWidth={ICON_STROKE} aria-hidden />
                {t("products.photoCamera")}
              </button>
              <button type="button" className={styles.photoBtn} onClick={() => galleryRef.current?.click()}>
                <ImagePlus size={18} strokeWidth={ICON_STROKE} aria-hidden />
                {t("products.photoGallery")}
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className={styles.hiddenFile}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className={styles.hiddenFile}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <FormField label={t("common.name")} required>
            <input name="name" required className="ui-input" />
          </FormField>
          <FormField label={t("common.category")}>
            <input name="category" defaultValue={defaults.category} className="ui-input" />
          </FormField>
          <FormField label={t("products.saleUnit")} required>
            <AppSelect name="saleUnitId" defaultValue={defaults.saleUnitId} required options={unitOptions} />
          </FormField>
          <FormField label={t("products.fgUnit")} required>
            <AppSelect name="outputUnitId" defaultValue={defaults.outputUnitId} required options={unitOptions} />
          </FormField>
          <FormField label={t("products.recipeBaseShort")}>
            <input name="recipeBaseQty" defaultValue={defaults.recipeBaseQty} className="ui-input" />
          </FormField>
          <FormField label={t("products.outputBaseShort")}>
            <input name="outputPerBase" defaultValue={defaults.outputPerBase} className="ui-input" />
          </FormField>

          <button
            type="submit"
            className={`${catalogStyles.formFull} ui-btn-primary min-h-[44px]`}
            disabled={pending}
          >
            {pending ? t("common.saving") : t("products.toStep2")}
          </button>
        </form>
      ) : (
        <div className={styles.step2}>
          <p className={styles.step2Lead}>{t("products.stepRecipeLead")}</p>

          <ul className={styles.recipeList}>
            {rows.map((row, index) => {
              const mat = materialMap.get(row.materialId);
              let line: string | null = null;
              try {
                if (mat?.unitCost && row.quantity) {
                  line = moneyDisplay(D(mat.unitCost).mul(row.quantity));
                }
              } catch {
                line = null;
              }
              return (
                <li key={row.key} className={styles.recipeRow}>
                  <AppSelect
                    value={row.materialId}
                    onChange={(value) => {
                      const m = materialMap.get(value);
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, materialId: value, unitId: m?.storageUnitId ?? r.unitId }
                            : r,
                        ),
                      );
                    }}
                    options={materialOptions}
                    placeholder={t("products.pickMaterial")}
                  />
                  <div className={styles.qtyCost}>
                    <input
                      className="ui-input"
                      inputMode="decimal"
                      placeholder={t("common.qty")}
                      value={row.quantity}
                      onChange={(e) => {
                        const q = e.target.value;
                        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, quantity: q } : r)));
                      }}
                    />
                    <span className={styles.costCell}>
                      {line ? `${line} с` : mat ? t("products.noMatPrice") : "—"}
                      {mat ? (
                        <small>
                          / {mat.storageSymbol}
                        </small>
                      ) : null}
                    </span>
                  </div>
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      aria-label={t("common.remove")}
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={16} strokeWidth={ICON_STROKE} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className={styles.addRow}
            onClick={() => {
              setRows((prev) => [
                ...prev,
                { key: nextKey, materialId: "", quantity: "", unitId: units[0]?.id ?? "" },
              ]);
              setNextKey((k) => k + 1);
            }}
          >
            <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden />
            {t("products.addMaterial")}
          </button>

          <div className={styles.expenseBox}>
            <span>{t("products.expenseTotal")}</span>
            <strong>{expense ? `${moneyDisplay(expense)} с` : "—"}</strong>
          </div>

          <div className={catalogStyles.formGrid}>
            <FormField label={t("products.salePrice")} required>
              <input
                className="ui-input"
                inputMode="decimal"
                value={price}
                placeholder={expense ? moneyDisplay(expense) : t("products.phSalePrice")}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </FormField>
            <FormField label={t("products.minPrice")} required>
              <input
                className="ui-input"
                inputMode="decimal"
                value={minPrice}
                placeholder={expense ? moneyDisplay(expense) : t("products.phMinPrice")}
                onChange={(e) => setMinPrice(e.target.value)}
                required
              />
            </FormField>
          </div>
          <p className={styles.priceHint}>{t("products.priceAfterCostHint")}</p>

          <button
            type="button"
            className="ui-btn-primary min-h-[44px] w-full"
            disabled={pending}
            onClick={submitStep2}
          >
            {pending ? t("common.saving") : t("products.finishCreate")}
          </button>
        </div>
      )}
    </div>
  );
}
