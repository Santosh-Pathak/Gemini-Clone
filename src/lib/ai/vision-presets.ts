export const VISION_PRESET_IDS = ["describe", "ocr", "diagram"] as const;

export type VisionPresetId = (typeof VISION_PRESET_IDS)[number];

export type VisionPreset = {
  id: VisionPresetId;
  label: string;
  description: string;
  instruction: string;
};

export const VISION_PRESETS: VisionPreset[] = [
  {
    id: "describe",
    label: "Describe",
    description: "Detailed visual description",
    instruction:
      "Describe this image in rich detail. Cover subjects, setting, colors, composition, and any notable elements. Be thorough but organized.",
  },
  {
    id: "ocr",
    label: "Extract text",
    description: "OCR-style text extraction",
    instruction:
      "Extract all visible text from this image exactly as written. Preserve line breaks and reading order. If no text is present, say so clearly.",
  },
  {
    id: "diagram",
    label: "Explain diagram",
    description: "Charts, diagrams, and schematics",
    instruction:
      "Explain this diagram, chart, or schematic. Describe what it represents, key components, relationships, and the main takeaway in plain language.",
  },
];

export function isVisionPresetId(value: unknown): value is VisionPresetId {
  return (
    typeof value === "string" &&
    (VISION_PRESET_IDS as readonly string[]).includes(value)
  );
}

export function resolveVisionPreset(
  presetId?: string | null
): VisionPreset | null {
  if (!presetId || !isVisionPresetId(presetId)) return null;
  return VISION_PRESETS.find((p) => p.id === presetId) ?? null;
}

export function buildVisionUserPrompt(
  userPrompt: string,
  preset: VisionPreset | null
): string {
  const trimmed = userPrompt.trim();
  if (!preset) return trimmed;
  if (!trimmed) return preset.instruction;
  return `${preset.instruction}\n\nAdditional context from the user: ${trimmed}`;
}
