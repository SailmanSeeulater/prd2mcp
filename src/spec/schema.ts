import { z } from "zod";

/*
- The spec is the contract between the fuzzy PRD and the code
- Everything is strict; unknown keys are errors, so an LLM can't smuggle in
- Requirements the codegen doesn't understand.

- Two layers of checking:
  1. Shape + invariants (this file duh) -> failure = SPEC_INVALID
  2. Policy (spec-gate.ts, step 2.3) -> REJECT / NEEDS_INPUT

You know, whenever you see "too many tools" or "nesting too deep" are POLICY
They are representable here and rejected by the gate with a reason
*/

const Constraints = z.strictObject({
    min: z.number().optional(), // Number or Int only
    max: z.number().optional(), // Number or Int only
    minLength: z.int().nonnegative().optional(), // String only
    maxLength: z.int().positive().optional(), // String only
    pattern: z.string().optional(), // String only and it has to be a valid RegExp (Regular Expression, get it? xd)
});

export const FieldSpec = z.strictObject({
    name: z
        .string()
        .regex(/^[a-z][a-zA-Z0-9_]*$/, "must start with a lowercase letter; letters, digits and _ only"),
    description: z.string().min(5),
    type: z.enum(["string", "number", "integer", 
        "boolean", "enum", "array", "object"]),
    required: z.boolean(),
    // type "enum"
    enumValues: z.array(z.string().min(1)).min(1).optional(),
    // type "array"
    items: z.enum(["string", "number", 
        "integer", "boolean", "object"]).optional(),
    // Type: array, object, or Type: array with items "object"
    get properties() {
        return z.array(FieldSpec).min(1).optional();
    },
    constraints: Constraints.optional(),
});

export type FieldSpec = z.infer<typeof FieldSpec>;

const Example = z.strictObject({
    input: z.record(z.string(), z.unknown()),
    expect: z.discriminatedUnion("ok", [
        z.strictObject({
            ok: z.literal(true),
            contains: z.record(z.string(), z.unknown()).optional(),
        }),
        z.strictObject({ ok: z.literal(false), errorIncludes: z.string().min(1) }),
    ]),
});

const Output = z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("text") }),
    z.strictObject({ kind: z.literal("structured"), fields: z.array(FieldSpec).min(1) }),
]);

export const ToolSpec = z.strictObject({
    name: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/, "must be snake_case, 3-41 chars"),
    title: z.string().min(1),
    description: z.string().min(20),
    inputs: z.array(FieldSpec),
    output: Output,
    sideEffects: z.enum(["none", "read", "write", "network"]),
    errors: z.array(z.strictObject({ when: z.string().min(1), message: z.string().min(1) })),
    examples: z.array(Example).min(1),
    sourceRefs: z.array(z.string().min(1)).min(1), // PRD section ids, for traceability
});

export type ToolSpec = z.infer<typeof ToolSpec>;

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const ServerShape = z.strictObject({
    name: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/, 
        "must be kebab-case, 3-41 chars"),
    description: z.string().min(10),
    env: z.array(
        z.strictObject({
            name: z.string().regex(/^[A-Z][A-Z0-9_]*$/,
                 "must be UPPER_SNAKE_CASE"),
            description: z.string().min(5),
            required: z.boolean(),
        }),
    ),
    allowedHosts: z.array(
        z.string().regex(HOST, 
            "must be a bare lowercase hostname like api.example.com"),
    ), // empty = no network
    storage: z.enum(["none", "memory", "sqlite-file"]),
    tools: z.array(ToolSpec), // count limits are policy (spec gate), not shape
    openQuestions: z.array(z.string().min(1)),
});

export const ServerSpec = ServerShape.superRefine((spec, ctx) => checkServer(spec, ctx));
export type ServerSpec = z.infer<typeof ServerSpec>;

// Invariants: Things a JSON shape can't express but codegen depends on

type Path = (string | number)[];

function checkServer(spec: z.infer<typeof ServerShape>, ctx: z.RefinementCtx): void {
    const add = (path: Path, message: string) => ctx.addIssue({ code: "custom", message, path });

    if (spec.tools.length === 0 && spec.openQuestions.length === 0) {
        add(["tools"], "at least one tool is required unless openQuestions is non-empty");
    }
    const seenTools = new Set<string>();
    spec.tools.forEach((tool, ti) => {
        const tp: Path = ["tools", ti];
        if (seenTools.has(tool.name)) add([...tp, "name"], `duplicate tool name '${tool.name}'`);
        seenTools.add(tool.name);

        checkFieldList(tool.inputs, [...tp, "inputs"], add);
        const outputNames = new Set<string>();
        if (tool.output.kind === "structured") {
            checkFieldList(tool.output.fields, [...tp, "output", "fields"], add);
            tool.output.fields.forEach((f) => outputNames.add(f.name));
        }

        const inputNames = new Set(tool.inputs.map((f) => f.name));
        tool.examples.forEach((ex, ei) => {
            const ep: Path = [...tp, "examples", ei];
            for (const key of Object.keys(ex.input)) {
                if (!inputNames.has(key)) {
                    add([...ep, "input", key], `example input '${key}' is not a declared input of ${tool.name}`);
                }
            }
            if (ex.expect.ok && ex.expect.contains) {
                if (tool.output.kind !== "structured") {
                    add([...ep, "expect", "contains"], "contains is only allowed when output.kind is 'structured'");
                } else {
                    for (const key of Object.keys(ex.expect.contains)) {
                        if (!outputNames.has(key)) {
                            add([...ep, "expect", "contains", key], `'${key}' is not an output field of ${tool.name}`);
                        }
                    }
                }
            }
        });
    });
}

function checkFieldList(fields: FieldSpec[], path: Path, add: (p: Path, m: string) => void): void {
    const seen = new Set<string>();
    fields.forEach((f, i) => {
        if (seen.has(f.name)) add([...path, i, "name"], `duplicate field name '${f.name}'`);
        seen.add(f.name);
        checkField(f, [...path, i], add);
    });
}

function checkField(f: FieldSpec, path: Path, add: (p: Path, m: string) => void): void {
    if (f.type === "enum") {
        if (!f.enumValues) add([...path, "enumValues"], "enumValues is required when type is 'enum'");
        else if (new Set(f.enumValues).size !== f.enumValues.length) {
            add([...path, "enumValues"], "enumValues must not contain duplicates");
        }
    } else if (f.enumValues) {
        add([...path, "enumValues"], "enumValues is only allowed when type is 'enum'");
    }

    if (f.type === "array") {
        if (!f.items) add([...path, "items"], "items is required when type is 'array'");
    } else if (f.items) {
        add([...path, "items"], "items is only allowed when type is 'array'");
    }

    const hasProps = f.type === "object" || (f.type === "array" && f.items === "object");
    if (hasProps && !f.properties) {
        add([...path, "properties"], "properties is required for objects and arrays of objects");
    } else if (!hasProps && f.properties) {
        add([...path, "properties"], "properties is only allowed for objects and arrays of objects");
    }

    const c = f.constraints;
    if (c) {
        const numeric = f.type === "number" || f.type === "integer";
        const isString = f.type === "string";
        if (!numeric && (c.min !== undefined || c.max !== undefined)) {
            add([...path, "constraints"], "min/max are only allowed on number and integer fields");
        }
        if (!isString && (c.minLength !== undefined || c.maxLength !== undefined || c.pattern !== undefined)) {
            add([...path, "constraints"], "minLength/maxLength/pattern are only allowed on string fields");
        }
        if (c.min !== undefined && c.max !== undefined && c.min > c.max) {
            add([...path, "constraints"], `min (${c.min}) is greater than max (${c.max})`);
        }
        if (c.minLength !== undefined && c.maxLength !== undefined && c.minLength > c.maxLength) {
            add([...path, "constraints"], `minLength (${c.minLength}) is greater than maxLength (${c.maxLength})`);
        }
        if (c.pattern !== undefined) {
            try {
                new RegExp(c.pattern);
            } catch {
                add([...path, "constraints", "pattern"], `pattern is not a valid regular expression: ${c.pattern}`);
            }
        }
    }

    if (f.properties) checkFieldList(f.properties, [...path, "properties"], add);
}

// Parsing with readable errors

export function formatPath(path: PropertyKey[]): string {
    return (
        path
            .map((p, i) => (typeof p === "number" ? `[${p}]` : i === 0 ? String(p) : `.${String(p)}`))
            .join("") || "(root)"
    );
}

export type ParseResult = { ok: true; spec: ServerSpec } | { ok: false; errors: string[] };

export function parseSpec(json: unknown): ParseResult {
    const result = ServerSpec.safeParse(json);
    if (result.success) return { ok: true, spec: result.data };
    return {
        ok: false,
        errors: result.error.issues.map((i) => `${formatPath(i.path)}: ${i.message}`),
    };
}