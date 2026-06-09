import { FlowDefinition, ManualSection, StepNode } from "./flow";

function cleanLabel(label: string): string {
  return label.replace(/\n/g, " / ").replace(/\s+/g, " ").trim();
}

function sortedLanes(flow: FlowDefinition) {
  return [...flow.lanes].sort((a, b) => a.sortOrder - b.sortOrder);
}

function sortedSections(flow: FlowDefinition): ManualSection[] {
  return [...(flow.manualSections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

function laneSteps(flow: FlowDefinition, laneId: string): StepNode[] {
  return flow.nodes.filter((node) => node.laneId === laneId);
}

function sectionSteps(flow: FlowDefinition, section: ManualSection): StepNode[] {
  const ids = new Set(section.nodeIds);
  return flow.nodes.filter((node) => ids.has(node.id));
}

export function safeFileName(title: string, ext: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "business-flow"}.${ext}`;
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function generateJapaneseDescription(flow: FlowDefinition): string {
  const lanes = sortedLanes(flow);
  const sections = sortedSections(flow);
  const firstLane = lanes[0];
  const firstSection = sections[0];
  const sectionText = sections.length
    ? `本マニュアルでは、${sections.map((section) => section.title).join("、")}の章に分けて業務を説明します。`
    : "各業務ステップは責任部署ごとに整理されています。";

  const sentences = [
    `本図は、${flow.title}における主要業務フローを示しています。`,
    firstLane ? `${firstLane.label}から処理が始まり、関係部署へ順番に引き継がれます。` : sectionText,
    sectionText,
    firstSection?.purpose ? `${firstSection.title}の目的は、${firstSection.purpose}です。` : "",
    "各Stepには短い説明を付けることで、マニュアルや引継ぎ資料にそのまま利用しやすくなります。",
    "図と責務表を併用することで、担当部署、処理順、各Stepの役割を確認できます。",
  ].filter(Boolean);

  return sentences.slice(0, 6).join("\n");
}

export function generateEnglishDescription(flow: FlowDefinition): string {
  const lanes = sortedLanes(flow);
  const sections = sortedSections(flow);
  const firstLane = lanes[0];
  const firstSection = sections[0];
  const sectionText = sections.length
    ? `This manual explains the process by sections: ${sections.map((section) => section.title).join(", ")}.`
    : "The steps are organized by responsible area.";

  const sentences = [
    `This diagram shows the main business flow for ${flow.title}.`,
    firstLane ? `The process starts from ${firstLane.label} and is handed off to the related responsible areas.` : sectionText,
    sectionText,
    firstSection?.purpose ? `The purpose of ${firstSection.title} is ${firstSection.purpose}.` : "",
    "Short step descriptions help the content fit manuals and handover documents.",
    "The diagram and responsibility table help users understand ownership, sequence, and each step's role.",
  ].filter(Boolean);

  return sentences.slice(0, 6).join("\n");
}

export function generateResponsibilityTable(flow: FlowDefinition, _lang: "ja" | "en"): string {
  const laneById = new Map(flow.lanes.map((lane) => [lane.id, lane.label]));
  const lines = ["| Step | Responsible Area | Type | Short Description |", "|---|---|---|---|"];
  flow.nodes.forEach((node) => {
    lines.push(
      `| ${cleanLabel(node.label)} | ${laneById.get(node.laneId) ?? node.laneId} | ${node.type ?? "process"} | ${node.description ?? ""} |`,
    );
  });
  return lines.join("\n");
}

function generateSectionMarkdown(flow: FlowDefinition, section: ManualSection): string {
  const steps = sectionSteps(flow, section);
  const lines = [
    `### ${section.title}`,
    "",
    section.purpose ? `**Purpose / 目的:** ${section.purpose}` : "**Purpose / 目的:**",
    "",
    "| Step | Short Description |",
    "|---|---|",
  ];

  steps.forEach((step) => {
    lines.push(`| ${cleanLabel(step.label)} | ${step.description ?? ""} |`);
  });

  return lines.join("\n");
}

export function generateManualSection(flow: FlowDefinition): string {
  const sections = sortedSections(flow);
  const sectionBlocks = sections.length
    ? sections.map((section) => generateSectionMarkdown(flow, section)).join("\n\n")
    : [
        "### Main Flow",
        "",
        "| Step | Short Description |",
        "|---|---|",
        ...flow.nodes.map((node) => `| ${cleanLabel(node.label)} | ${node.description ?? ""} |`),
      ].join("\n");

  return [
    `## ${flow.title}`,
    "",
    "### Overview / 概要",
    "",
    generateJapaneseDescription(flow).split("\n")[0],
    "",
    generateEnglishDescription(flow).split("\n")[0],
    "",
    "### Flow Image / フロー図",
    "",
    "[Exported PNG or SVG should be inserted here.]",
    "",
    "### Manual Sections / マニュアル章",
    "",
    sectionBlocks,
    "",
    "### Responsibility / 責務",
    "",
    generateResponsibilityTable(flow, "en"),
    "",
    "### Notes / 補足",
    "",
    "- Step descriptions should be short and manual-friendly.",
    "- Section purposes should explain why the group of steps exists.",
    "- JSON is for saving and re-editing this flow definition.",
  ].join("\n");
}
