/**
 * Compares AI Gateway models on the EC8A reader: figures right (of 7), and whether each crop lands on the figure's own row.
 * Usage: node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/bench-ec8a.mts <runs> <model...>
 * Env: PROMPT=v2 uses the production prompt; IMG=<path> tests another image (the truth below is for public/dev/ec8a-sample.png).
 * Used to choose google/gemini-2.5-flash-lite: the free tier allows it, 7/7 figures in every run, ~3 s.
 */
import { readFileSync } from "node:fs";
import { generateText, Output } from "ai";
import { z } from "zod";
const schema = z.object({
  isResultSheet: z.boolean(),
  votes: z.array(z.object({ party: z.string(), votes: z.number().int().min(0) })),
  accredited: z.number().int().min(0).nullable(),
  registered: z.number().int().min(0).nullable(),
  rejected: z.number().int().min(0).nullable(),
  totalValid: z.number().int().min(0).nullable().describe("Total valid votes as WRITTEN on the sheet, not computed"),
  uncertainFields: z.array(z.string()),
  boxes: z.array(z.object({ field: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })).describe("Where each figure is written: a party acronym, 'totalValid', 'rejected' or 'accredited', with a box around the handwritten number as fractions of the image width and height (x, y = top-left corner, 0 to 1)."),
});
const system = `You transcribe Nigerian INEC polling-unit result sheets (Form EC8A or its poster copy EC60E).
Rules:
- Transcribe only what is written. Prefer the figures written in words when digits are ambiguous; if both are unclear, list the field in uncertainFields.
- Never compute or "fix" totals. totalValid is the figure written on the sheet.
- Include every party row that has a figure written (including 0).
- For every figure you transcribe, also give its box in "boxes", tight around the handwritten number itself, so a person can compare it with your reading. Omit a box rather than guess.
- If the image is not a result sheet, set isResultSheet to false and leave figures empty/null.`;
const v2 = system + `
- Box coordinates are fractions of the WHOLE image: x and w of its width, y and h of its height, origin at the top-left corner (a point at the exact centre of the image is x=0.5, y=0.5).
- Each box covers ONLY the handwritten digits of that figure, not the printed label and not the cell border. The row a figure is written in must match its label: do not shift boxes up or down.
- Look at where the printed label of the row ends and the handwriting starts to place x; keep h close to the height of the digits.`;
const SYS = process.env.PROMPT === "v2" ? v2 : system;
const truth = { APC: 112, LP: 12, PDP: 65, NNPP: 1, accredited: 191, rejected: 1, totalValid: 190 } as Record<string, number>;
const top: Record<string, number> = { APC: 230, LP: 320, PDP: 410, NNPP: 500, totalValid: 640, rejected: 730, accredited: 820 };
const tbox = (k: string) => ({ x: 0.405, y: (top[k]! + 8) / 1000, w: 0.2, h: 0.075 });
const iou = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const i = ix * iy; return i / (a.w * a.h + b.w * b.h - i);
};
const img = readFileSync(process.env.IMG ?? "public/dev/ec8a-sample.png");
const [runs, ...models] = process.argv.slice(2);
for (const model of models) {
  const rows: string[] = [];
  for (let r = 0; r < Number(runs); r++) {
    const t0 = Date.now();
    try {
      const { output } = await generateText({ model, output: Output.object({ schema, name: "EC8AResult" }), abortSignal: AbortSignal.timeout(60000), system: SYS, messages: [{ role: "user", content: [{ type: "image", image: img, mediaType: (process.env.IMG ?? "").endsWith(".jpg") ? "image/jpeg" : "image/png" }, { type: "text", text: "Transcribe this result sheet." }] }] });
      if (!output) throw new Error("no output");
      const got: Record<string, number | null> = { ...Object.fromEntries(output.votes.map((v) => [v.party.toUpperCase(), v.votes])), accredited: output.accredited, rejected: output.rejected, totalValid: output.totalValid };
      if (process.env.RAW) console.log("RAW", model, JSON.stringify(output.boxes.slice(0,3)));
      const wrong = Object.keys(truth).filter((k) => got[k] !== truth[k]);
      const ious = Object.keys(top).map((k) => { const b = output.boxes.find((x) => x.field.toLowerCase().replace(/[^a-z]/g, "") === k.toLowerCase()); return b ? iou(b, tbox(k)) : 0; });
      // What the officer sees: a crop centred on the box. It is useful if its centre is in the figure's own row and over the handwriting column.
      const rowHit = Object.keys(top).map((k) => { const b = output.boxes.find((x) => x.field.toLowerCase().replace(/[^a-z]/g, "") === k.toLowerCase()); if (!b) return 0; const cy = b.y + b.h / 2, cx = b.x + b.w / 2; return cy >= top[k]! / 1000 && cy <= (top[k]! + 90) / 1000 && cx >= 0.33 && cx <= 0.58 ? 1 : 0; });
      const mean = ious.reduce((a, b) => a + b, 0) / ious.length;
      rows.push(`${wrong.length === 0 ? "ALL 7 RIGHT" : `wrong: ${wrong.join(",")}`} | box IoU ${mean.toFixed(2)} | right row ${rowHit.reduce((a: number, b: number) => a + b, 0)}/7 | ${Date.now() - t0} ms`);
    } catch (e) {
      rows.push(`FAIL ${(e instanceof Error ? e.message : String(e)).slice(0, 90).replace(/\n/g, " ")}`);
    }
  }
  console.log(`${model}\n  ${rows.join("\n  ")}`);
}
