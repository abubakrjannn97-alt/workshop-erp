"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, ImagePlus, Plus, Trash2 } from "lucide-react";
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
  packageWeight: string;
  storageUnitId: string;
  storageSymbol: string;
};

type RecipeRow = {
  key: number;
  materialId: string;
  quantity: string;
  unitId: string;
};

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showMore, setShowMore] = useState(false);
  const [nextKey, setNextKey] = useState(1);
  const [rows, setRows] = useState<RecipeRow[]>([
    { key: 0, materialId: "", quantity: "", unitId: units[0]?.id ?? "" },
  ]);
  const [price, setPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
      if (!row.materialId || !row.quantity) continue;
      const unitPrice = materialMap.get(row.materialId)?.unitCost;
      if (!unitPrice) continue;
      try {
        const line = D(unitPrice).mul(row.quantity || "0");
        if (line.gte(0) && D(row.quantity || "0").gt(0)) {
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
    setPhotoPreview(URL.createObjectURL(file));
  }

  function submitAll(formData: FormData) {
    setError(null);
    const expenseStr = expense ? moneyDisplay(expense) : "0";
    const sale = price || "0";
    const floor = minPrice || expenseStr || "0";

    if (expense && D(floor).lt(expense)) {
      setError(t("products.minBelowCost", { n: expenseStr }));
      return;
    }
    if (sale && D(sale).lt(D(floor))) {
      setError(t("products.priceBelowMin"));
      return;
    }

    formData.set("price", "0");
    formData.set("minPrice", "0");

    startTransition(async () => {
      const created = await createProduct(formData);
      if (created.error || !created.id) {
        setError(created.error ?? t("common.error"));
        return;
      }

      if (photoFile) {
        const photoFd = new FormData();
        photoFd.set("productId", created.id);
        photoFd.set("photo", photoFile);
        const photo = await saveProductPhoto(photoFd);
        if (photo.error) {
          setError(photo.error);
          router.push(`/products/${created.id}`);
          return;
        }
      }

      const setupFd = new FormData();
      setupFd.set("productId", created.id);
      setupFd.set("price", sale);
      setupFd.set("minPrice", floor);
      for (const row of rows) {
        if (!row.materialId || !row.quantity) continue;
        setupFd.append("materialId", row.materialId);
        setupFd.append("quantity", row.quantity);
        setupFd.append("unitId", row.unitId || materialMap.get(row.materialId)?.storageUnitId || "");
      }

      const finished = await finishProductSetup(setupFd);
      if (finished.error) {
        setError(finished.error);
        router.push(`/products/${created.id}`);
        return;
      }

      router.push(`/products/${created.id}`);
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      className={styles.wizard}
      onSubmit={(e) => {
        e.preventDefault();
        submitAll(new FormData(e.currentTarget));
      }}
    >
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.photoRow}>
        <button
          type="button"
          className={styles.photoThumb}
          onClick={() => galleryRef.current?.click()}
          aria-label={t("products.photo")}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="" className={styles.photoThumbImg} />
          ) : (
            <ImagePlus size={22} strokeWidth={ICON_STROKE} aria-hidden />
          )}
        </button>
        <div className={styles.photoSide}>
          <p className={styles.photoLabel}>{t("products.photoOptional")}</p>
          <div className={styles.photoActions}>
            <button type="button" className={styles.photoBtn} onClick={() => cameraRef.current?.click()}>
              <Camera size={16} strokeWidth={ICON_STROKE} aria-hidden />
              {t("products.photoCamera")}
            </button>
            <button type="button" className={styles.photoBtn} onClick={() => galleryRef.current?.click()}>
              <ImagePlus size={16} strokeWidth={ICON_STROKE} aria-hidden />
              {t("products.photoGallery")}
            </button>
          </div>
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

      <div className={catalogStyles.formGrid}>
        <FormField label={t("common.name")} required className={catalogStyles.formFull}>
          <input name="name" required maxLength={200} className="ui-input" autoComplete="off" />
        </FormField>
        <FormField label={t("common.category")} className={catalogStyles.formFull}>
          <input name="category" defaultValue={defaults.category} className="ui-input" />
        </FormField>
      </div>

      {!showMore ? (
        <>
          <input type="hidden" name="saleUnitId" value={defaults.saleUnitId} />
          <input type="hidden" name="outputUnitId" value={defaults.outputUnitId} />
          <input type="hidden" name="recipeBaseQty" value={defaults.recipeBaseQty} />
          <input type="hidden" name="outputPerBase" value={defaults.outputPerBase} />
        </>
      ) : null}

      <button
        type="button"
        className={styles.moreToggle}
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
      >
        <ChevronDown
          size={16}
          strokeWidth={ICON_STROKE}
          className={showMore ? styles.moreChevronOpen : undefined}
          aria-hidden
        />
        {t("products.moreSettings")}
      </button>

      {showMore ? (
        <div className={`${catalogStyles.formGrid} ${styles.moreGrid}`}>
          <FormField label={t("products.saleUnitSimple")}>
            <AppSelect name="saleUnitId" defaultValue={defaults.saleUnitId} required options={unitOptions} />
          </FormField>
          <FormField label={t("products.fgUnitSimple")}>
            <AppSelect name="outputUnitId" defaultValue={defaults.outputUnitId} required options={unitOptions} />
          </FormField>
          <FormField label={t("products.recipeBaseSimple")} hint={t("products.tipRecipe")}>
            <input name="recipeBaseQty" defaultValue={defaults.recipeBaseQty} className="ui-input" inputMode="decimal" />
          </FormField>
          <FormField label={t("products.outputSimple")} hint={t("products.tipOutput")}>
            <input name="outputPerBase" defaultValue={defaults.outputPerBase} className="ui-input" inputMode="decimal" />
          </FormField>
        </div>
      ) : null}

      <div className={styles.block}>
        <p className={styles.blockTitle}>{t("products.recipeTitle")}</p>
        <p className={styles.blockHint}>{t("products.stepRecipeLead")}</p>

        <ul className={styles.recipeList}>
          {rows.map((row, index) => {
            const mat = materialMap.get(row.materialId);
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
                <div className={styles.qtyRow}>
                  <input
                    className="ui-input"
                    inputMode="decimal"
                    placeholder={mat ? `${t("common.qty")}, ${mat.storageSymbol}` : t("common.qty")}
                    value={row.quantity}
                    onChange={(e) => {
                      const q = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, quantity: q } : r)));
                    }}
                  />
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
                </div>
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
      </div>

      <div className={styles.priceBlock}>
        <p className={styles.blockTitle}>{t("products.groupStock")}</p>
        <div className={styles.priceGrid}>
          <FormField label={t("products.salePriceShort")} required className={styles.priceField}>
            <input
              className="ui-input"
              inputMode="decimal"
              value={price}
              placeholder={expense ? moneyDisplay(expense) : t("products.phSalePrice")}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t("products.minPriceShort")} required className={styles.priceField}>
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
        <p className={styles.priceNote}>{t("products.pricePairHint")}</p>
      </div>

      <button type="submit" className={`ui-btn-primary ${styles.saveBtn}`} disabled={pending}>
        {pending ? t("common.saving") : t("products.finishCreate")}
      </button>
    </form>
  );
}
