import { generateText, Output } from "ai";
import { z } from "zod";
import { fieldKey, normaliseBox, type Box } from "@/lib/core/crop";
import { checkResultArithmetic } from "@/lib/core/results";
import { badRequest } from "@/lib/server/http";

export const maxDuration = 60;

const MODEL = process.env.TALLY_MODEL ?? "anthropic/claude-sonnet-5.5";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const extraction = z.object({
  isResultSheet: z.boolean().describe("true only if this is an INEC polling-unit result sheet (Form EC8A / EC60E)"),
  votes: z.array(z.object({ party: z.string().describe("Party acronym exactly as printed, e.g. APC"), votes: z.number().int().min(0) })),
  accredited: z.number().int().min(0).nullable(),
  registered: z.number().int().min(0).nullable(),
  rejected: z.number().int().min(0).nullable(),
  totalValid: z.number().int().min(0).nullable().describe("Total valid votes as WRITTEN on the sheet, not computed"),
  uncertainFields: z.array(z.string()).describe("Fields whose handwriting is unclear, e.g. 'PDP', 'accredited'"),
  boxes: z
    .array(z.object({ field: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() }))
    .describe("Where each figure is written: a party acronym, 'totalValid', 'rejected' or 'accredited', with a box around the handwritten number as fractions of the image width and height (x, y = top-left corner, 0 to 1)."),
});

/**
 * AI reads; the officer confirms; arithmetic rules decide.
 * The model only transcribes. It never decides validity, and its output is never signed
 * until a human has checked every figure against the paper.
 */
export async function POST(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0] ?? "";
  if (!ALLOWED.has(type)) return badRequest("Upload a JPEG, PNG or WebP image.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > 3 * 1024 * 1024) return badRequest("Image must be under 3 MB.");

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: extraction, name: "EC8AResult" }),
      abortSignal: AbortSignal.timeout(45_000),
      system: `You transcribe Nigerian INEC polling-unit result sheets (Form EC8A or its poster copy EC60E).
Rules:
- Transcribe only what is written. Prefer the figures written in words when digits are ambiguous; if both are unclear, list the field in uncertainFields.
- Never compute or "fix" totals. totalValid is the figure written on the sheet.
- Include every party row that has a figure written (including 0).
- For every figure you transcribe, also give its box in "boxes", tight around the handwritten number itself, so a person can compare it with your reading. Omit a box rather than guess.
- If the image is not a result sheet, set isResultSheet to false and leave figures empty/null.`,
      messages: [{ role: "user", content: [{ type: "image", image: bytes, mediaType: type }, { type: "text", text: "Transcribe this result sheet." }] }],
    });
    if (!output?.isResultSheet) return Response.json({ error: "This does not look like a result sheet." }, { status: 422 });
    if (output.accredited === null || output.rejected === null || output.totalValid === null || output.votes.length === 0) {
      return Response.json({ error: "Key figures were unreadable. Enter them from the sheet." }, { status: 422 });
    }
    const figures = {
      votes: Object.fromEntries(output.votes.map((v) => [v.party.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8), v.votes])),
      accredited: output.accredited,
      rejected: output.rejected,
      totalValid: output.totalValid,
      ...(output.registered !== null ? { registered: output.registered } : {}),
    };
    const boxes: Record<string, Box> = {};
    for (const b of output.boxes) {
      const box = normaliseBox(b);
      if (box) boxes[fieldKey(b.field)] = box;
    }
    return Response.json({ figures, boxes, uncertain: output.uncertainFields.map(fieldKey), issues: checkResultArithmetic(figures), model: MODEL });
  } catch (error) {
    console.error("EC8A read failed; officer will enter figures manually:", error instanceof Error ? error.message : error);
    return Response.json({ error: "AI reader unavailable" }, { status: 503 });
  }
}
