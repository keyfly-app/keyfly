"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Button, INPUT_CLASS, Notice, buttonClass } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { importProperties, undoImport } from "./actions";
import { IMPORT_FIELDS, MAX_ROWS, REQUIRED_FIELDS, checkRow, matchColumns, parseCsv, type CheckedRow, type ImportField, type Lookup } from "./import-rows";

type Sheet = { fileName: string; headers: string[]; rows: string[][] };
type Done = { batchId: string; created: number; updated: number };
const SHOWN = 60;

/**
 * "Ingatlanok importálása" (canvas "Import – fájl", "… – ellenőrzés", "… – kész"): template, file, column matching,
 * row checks with fixes in place, duplicates skipped or updated, the rows to fix downloadable; imported in one go and
 * undone as a whole. Desktop only.
 */
export function ImportFlow({
  accountId,
  listHref,
  names,
  lookup,
  kindOptions,
}: {
  accountId: string;
  listHref: string;
  names: Record<ImportField, string[]>;
  lookup: Lookup;
  kindOptions: { key: string; label: string }[];
}) {
  const t = useTranslations("properties.import");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<(ImportField | null)[]>([]);
  const [unknown, setUnknown] = useState<number[]>([]);
  const [edits, setEdits] = useState<Record<number, Partial<Record<ImportField, string>>>>({});
  const [dupAction, setDupAction] = useState<Record<number, "skip" | "update">>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [pending, start] = useTransition();
  const label = (f: ImportField) => t(`columns.${f}`);

  const read = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    setReading(true);
    try {
      let data: string[][];
      if (/\.csv$/i.test(file.name) || file.type === "text/csv") data = parseCsv(await file.text());
      else if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        data = (await readSheet(file)).map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))));
      } else throw new Error("type");
      const [head, ...rows] = data;
      const body = rows.filter((r) => r.some((c) => String(c).trim()));
      if (!head || !body.length) return setFileError(t("file.errors.empty"));
      if (body.length > MAX_ROWS) return setFileError(t("file.errors.tooMany", { max: MAX_ROWS }));
      const map = matchColumns(head.map(String), names);
      if (!map.some(Boolean)) return setFileError(t("file.errors.header"));
      setSheet({ fileName: file.name, headers: head.map(String), rows: body });
      setMapping(map);
      setUnknown(map.flatMap((m, i) => (m || !head[i]?.trim() ? [] : [i])));
      setEdits({});
      setDupAction({});
      setStep(1);
    } catch {
      setFileError(t("file.errors.type"));
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  };

  const checked: CheckedRow[] = useMemo(() => {
    if (!sheet) return [];
    const seen = new Map<string, number>();
    return sheet.rows.map((r, i) => {
      const values = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, ""])) as Record<ImportField, string>;
      mapping.forEach((f, c) => {
        if (f) values[f] = String(r[c] ?? "");
      });
      Object.assign(values, edits[i] ?? {});
      return checkRow(i, values, lookup, seen);
    });
  }, [sheet, mapping, edits, lookup]);

  const ok = checked.filter((r) => r.payload && !r.duplicateOf);
  const dups = checked.filter((r) => r.payload && r.duplicateOf);
  const bad = checked.filter((r) => !r.payload);
  const toImport = [...ok, ...dups.filter((r) => dupAction[r.index] === "update")];
  const ordered = [...bad, ...dups, ...ok];

  const downloadTemplate = async () => {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const header = IMPORT_FIELDS.map((f) => ({ value: label(f), fontWeight: "bold" as const }));
    const example = IMPORT_FIELDS.map((f) => ({ value: t(`example.${f}`) }));
    await writeXlsxFile([header, example], { columns: IMPORT_FIELDS.map(() => ({ width: 18 })) }).toFile(t("templateName"));
  };
  const downloadBad = async () => {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const header = [
      ...IMPORT_FIELDS.map((f) => ({ value: label(f), fontWeight: "bold" as const })),
      { value: t("problemColumn"), fontWeight: "bold" as const },
    ];
    const rows = bad.map((r) => [...IMPORT_FIELDS.map((f) => ({ value: r.values[f] })), { value: r.problems.map((p) => problemText(p)).join("; ") }]);
    await writeXlsxFile([header, ...rows], { columns: [...IMPORT_FIELDS.map(() => ({ width: 18 })), { width: 40 }] }).toFile(t("badRowsName"));
  };
  const problemText = (p: CheckedRow["problems"][number]) =>
    p.code === "required" || p.code === "number" ? t(`problems.${p.code}`, { field: label(p.field) }) : t(`problems.${p.code}`);

  const submit = () =>
    start(async () => {
      setError(null);
      const rows = toImport.map((r) => (r.duplicateOf ? { ...r.payload!, update_id: r.duplicateOf.id } : r.payload!));
      const res = await importProperties(accountId, sheet?.fileName ?? "import", rows);
      if (res.status === "error") return setError(t(`errors.${res.error}`));
      setDone(res);
      setStep(2);
      router.refresh();
    });
  const undo = () =>
    start(async () => {
      if (!done) return;
      const res = await undoImport(done.batchId);
      if (res.status === "error") return setError(t(`errors.${res.error}`));
      toast(t("done.undone"));
      router.push(listHref);
    });

  const cancel = () => router.push(listHref);
  const status = (r: CheckedRow) => (!r.payload ? "fix" : r.duplicateOf ? "dup" : "ok");
  const iconOf = { ok: "check", fix: "alert", dup: "info" } as const;
  const setEdit = (i: number, f: ImportField, value: string) => setEdits((e) => ({ ...e, [i]: { ...e[i], [f]: value } }));

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <FlowHeader
        title={t("title")}
        steps={[t("steps.file"), t("steps.review"), t("steps.done")]}
        current={step}
        homeHref={listHref}
        onBack={step === 1 ? () => setStep(0) : undefined}
        onCancel={cancel}
        labels={{
          progress: t("title"),
          stepOf: `${step + 1}/3`,
          done: t("steps.done"),
          current: t("steps.review"),
          back: t("back"),
          cancel: t("cancel"),
          home: t("home"),
        }}
      />
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 pt-6 pb-12 sm:px-8 lg:pt-8">
        <p className="rounded-xl border border-line bg-surface p-5 text-sm text-muted lg:hidden">{t("desktopOnly")}</p>
        <div className="hidden lg:block">
          {step === 0 && (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left hover:border-field"
                >
                  <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-lg bg-mist text-brand">
                    <Icon name="download" size={18} strokeWidth={1.9} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{t("file.template")}</span>
                    <span className="text-[12.5px] text-muted">{t("file.templateSub")}</span>
                  </span>
                </button>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void read(e.dataTransfer.files[0]);
                  }}
                  className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-field bg-surface p-6 text-center hover:border-ink has-focus-visible:outline-3 has-focus-visible:outline-brand"
                >
                  <input
                    ref={input}
                    type="file"
                    accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="sr-only"
                    onChange={(e) => void read(e.target.files?.[0])}
                  />
                  <Icon name="upload" size={22} strokeWidth={1.9} className="text-brand" />
                  <span className="text-[15px] font-semibold">{t(reading ? "file.reading" : "file.drop")}</span>
                  <span className="text-[13px] text-muted">{t("file.dropSub", { max: MAX_ROWS })}</span>
                  <span className={`${buttonClass("secondary", true)} mt-2 w-auto`}>{t("file.choose")}</span>
                </label>
                {fileError && <Notice kind="error">{fileError}</Notice>}
              </div>
              <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
                <h2 className="text-[15px] font-semibold">{t("file.columns")}</h2>
                {[
                  [t("file.required"), REQUIRED_FIELDS],
                  [t("file.optional"), IMPORT_FIELDS.filter((f) => !REQUIRED_FIELDS.includes(f))],
                ].map(([title, fields]) => (
                  <div key={title as string} className="flex flex-col gap-2">
                    <span className="text-[12.5px] font-medium text-muted">{title as string}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {(fields as ImportField[]).map((f) => (
                        <span key={f} className="inline-flex min-h-6 items-center rounded-md bg-paper px-2 py-0.5 text-[12.5px] font-medium">
                          {label(f)}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
                <p className="border-t border-paper pt-3 text-[12.5px] text-muted">{t("file.more")}</p>
              </aside>
            </div>
          )}

          {step === 1 && sheet && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-lg bg-mist text-brand">
                    <Icon name="document" size={18} strokeWidth={1.8} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{sheet.fileName}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Tag tone="neutral">{t("review.rows", { count: checked.length })}</Tag>
                      {ok.length > 0 && <Tag tone="ok">{t("review.ok", { count: ok.length })}</Tag>}
                      {bad.length > 0 && <Tag tone="warning">{t("review.fix", { count: bad.length })}</Tag>}
                      {dups.length > 0 && <Tag tone="info">{t("review.dup", { count: dups.length })}</Tag>}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="inline-flex min-h-10 items-center text-[13.5px] font-semibold text-brand hover:underline"
                >
                  {t("review.otherFile")}
                </button>
              </div>

              {unknown.length > 0 && (
                <section className="flex flex-col gap-3 rounded-xl border border-info-soft bg-info-soft/40 p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Icon name="info" size={16} strokeWidth={1.9} className="text-info-ink" />
                    {t("review.unknownTitle", { count: unknown.length })}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {unknown.map((c) => (
                      <label key={c} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3 text-sm">
                        <span className="[overflow-wrap:anywhere]">„{sheet.headers[c]}”</span>
                        <select
                          aria-label={t("review.mapLabel", { name: sheet.headers[c] ?? "" })}
                          value={mapping[c] ?? ""}
                          className={`${INPUT_CLASS} appearance-auto`}
                          onChange={(e) =>
                            setMapping((m) => m.map((x, i) => (i === c ? ((e.target.value || null) as ImportField | null) : x === e.target.value ? null : x)))
                          }
                        >
                          <option value="">{t("review.skip")}</option>
                          {IMPORT_FIELDS.map((f) => (
                            <option key={f} value={f}>
                              {label(f)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <div className="rounded-xl border border-line bg-surface px-2 pt-1 pb-2">
                <table className="w-full border-collapse text-left text-[13.5px]">
                  <caption className="sr-only">{sheet.fileName}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-10 border-b border-line px-3 py-3">
                        <span className="sr-only">{t("review.duplicateAction")}</span>
                      </th>
                      {(["address", "kind", "size", "name"] as const).map((c) => (
                        <th key={c} scope="col" className="border-b border-line px-3 py-3 text-xs font-semibold text-muted">
                          {t(`review.cols.${c}`)}
                        </th>
                      ))}
                      <th scope="col" className="border-b border-line px-3 py-3">
                        <span className="sr-only">{t("problemColumn")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.slice(0, SHOWN).map((r) => {
                      const s = status(r);
                      const has = (f: ImportField) => r.problems.some((p) => p.field === f);
                      const addrField = (["postalCode", "city", "streetName", "streetType", "houseNumber"] as ImportField[]).find(has);
                      return (
                        <tr key={r.index} className={s === "fix" ? "bg-warning-soft/30" : s === "dup" ? "bg-info-soft/30" : undefined}>
                          <td className="border-b border-paper px-3 py-2.5">
                            <span className={s === "ok" ? "text-ok-ink" : s === "fix" ? "text-warning-ink" : "text-info-ink"}>
                              <Icon name={iconOf[s]} size={16} strokeWidth={2} />
                              <span className="sr-only">{t(`review.row${s === "ok" ? "Ok" : s === "fix" ? "Fix" : "Dup"}`)}</span>
                            </span>
                          </td>
                          <td className="border-b border-paper px-3 py-2.5">
                            {addrField ? (
                              <input
                                aria-label={label(addrField)}
                                value={r.values[addrField]}
                                placeholder={label(addrField)}
                                onChange={(e) => setEdit(r.index, addrField, e.target.value)}
                                className={`${INPUT_CLASS} h-9 border-warning-ink sm:h-9`}
                              />
                            ) : (
                              <span className="[overflow-wrap:anywhere]">
                                {`${r.values.postalCode} ${r.values.city}, ${r.values.streetName} ${r.values.streetType} ${r.values.houseNumber}`}
                                {[r.values.building, r.values.staircase, r.values.floor, r.values.door].filter(Boolean).length > 0 &&
                                  ` ${[r.values.building, r.values.staircase, r.values.floor, r.values.door].filter(Boolean).join(" ")}`}
                              </span>
                            )}
                          </td>
                          <td className="border-b border-paper px-3 py-2.5">
                            {has("kind") ? (
                              <select
                                aria-label={label("kind")}
                                value=""
                                onChange={(e) => setEdit(r.index, "kind", e.target.value)}
                                className={`${INPUT_CLASS} h-9 appearance-auto border-warning-ink sm:h-9`}
                              >
                                <option value="">{r.values.kind || t("review.kindChoose")}</option>
                                {kindOptions.map((k) => (
                                  <option key={k.key} value={k.key}>
                                    {k.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              (kindOptions.find((k) => k.key === r.payload?.kind)?.label ?? r.values.kind)
                            )}
                          </td>
                          <td className="border-b border-paper px-3 py-2.5 whitespace-nowrap tabular-nums">{r.values.area ? `${r.values.area} m²` : "–"}</td>
                          <td className="border-b border-paper px-3 py-2.5 [overflow-wrap:anywhere]">{r.values.ownRef || r.values.label || "–"}</td>
                          <td className="border-b border-paper px-3 py-2.5">
                            {s === "fix" && <span className="text-[12.5px] font-medium text-warning-ink">{r.problems.map(problemText).join(" · ")}</span>}
                            {s === "dup" && (
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-[12.5px] font-medium text-info-ink">{t("review.existing", { name: r.duplicateOf!.name })}</span>
                                <select
                                  aria-label={t("review.duplicateAction")}
                                  value={dupAction[r.index] ?? "skip"}
                                  onChange={(e) => setDupAction((d) => ({ ...d, [r.index]: e.target.value as "skip" | "update" }))}
                                  className={`${INPUT_CLASS} h-9 w-auto appearance-auto sm:h-9`}
                                >
                                  <option value="skip">{t("review.skipDup")}</option>
                                  <option value="update">{t("review.updateDup")}</option>
                                </select>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {ordered.length > SHOWN && <p className="px-1 text-[13px] text-muted">{t("review.moreRows", { count: ordered.length - SHOWN })}</p>}
              {error && <Notice kind="error">{error}</Notice>}
              <div className="flex items-center justify-between gap-4">
                {bad.length > 0 ? (
                  <button
                    type="button"
                    onClick={downloadBad}
                    className="inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline"
                  >
                    <Icon name="download" size={15} strokeWidth={2} />
                    {t("review.badRows")}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={cancel} className={`${buttonClass("secondary", true)} w-auto`}>
                    {t("cancel")}
                  </button>
                  {toImport.length > 0 ? (
                    <form action={submit}>
                      <Button pending={pending} fit>
                        {t("review.submit", { count: toImport.length })}
                      </Button>
                    </form>
                  ) : (
                    <span className="self-center text-[13px] text-muted">{t("review.nothing")}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && done && (
            <div className="mx-auto flex max-w-[520px] flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-10 text-center">
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-ok-soft text-ok-ink">
                <Icon name="check" size={22} strokeWidth={2.25} />
              </span>
              <h1 className="font-display text-xl font-semibold">{t("done.title", { count: done.created })}</h1>
              {done.updated > 0 && <p className="text-sm">{t("done.updated", { count: done.updated })}</p>}
              <p className="text-sm text-muted">{t("done.lead")}</p>
              {error && <Notice kind="error">{error}</Notice>}
              <div className="mt-2 flex gap-2">
                <form action={undo}>
                  <Button variant="secondary" pending={pending} fit>
                    <Icon name="undo" size={15} strokeWidth={2} />
                    {t("done.undo")}
                  </Button>
                </form>
                <Link href={listHref} className={`${buttonClass("primary", true)} w-auto`}>
                  {t("done.toList")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
