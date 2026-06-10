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

function laneLabel(flow: FlowDefinition, laneId: string): string {
  return flow.lanes.find((lane) => lane.id === laneId)?.label ?? laneId;
}

function stepLine(flow: FlowDefinition, step: StepNode): string {
  const desc = step.description?.trim();
  const suffix = desc ? ` — ${desc}` : "";
  return `- ${step.id} - ${cleanLabel(step.label)} (Lane: ${laneLabel(flow, step.laneId)}, Type: ${step.type ?? "process"})${suffix}`;
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
  const sectionText = sections.length
    ? `この簡易手順書は、${sections.map((section) => section.title).join("、")} のセクション単位で構成されています。`
    : "各ステップは担当領域ごとに整理されています。";

  return [
    `${flow.title} の主要な業務フローをまとめた説明です。`,
    firstLane ? `${firstLane.label} から処理が始まり、関連する担当領域へ引き継がれます。` : sectionText,
    sectionText,
  ].join("\n");
}

export function generateEnglishDescription(flow: FlowDefinition): string {
  const lanes = sortedLanes(flow);
  const sections = sortedSections(flow);
  const firstLane = lanes[0];
  const sectionText = sections.length
    ? `This manual explains the process by sections: ${sections.map((section) => section.title).join(", ")}.`
    : "The steps are organized by responsible area.";

  return [
    `This diagram shows the main business flow for ${flow.title}.`,
    firstLane ? `The process starts from ${firstLane.label} and is handed off to the related responsible areas.` : sectionText,
    sectionText,
    "The diagram and responsibility table help users understand ownership, sequence, and each step's role.",
  ].join("\n");
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
    "Purpose:",
    section.purpose?.trim() || "No description provided.",
    "",
    "Included Steps:",
  ];

  if (steps.length === 0) {
    lines.push("- No steps selected.");
  } else {
    steps.forEach((step) => lines.push(stepLine(flow, step)));
  }

  return lines.join("\n");
}

export function generateManualSection(flow: FlowDefinition): string {
  const sections = sortedSections(flow);
  const sectionBlocks = sections.length
    ? sections.map((section) => generateSectionMarkdown(flow, section)).join("\n\n")
    : [
        "### Main Flow",
        "",
        "Purpose:",
        "No description provided.",
        "",
        "Included Steps:",
        ...flow.nodes.map((node) => stepLine(flow, node)),
      ].join("\n");

  return [
    `# ${flow.title}`,
    "",
    "## Overview",
    "",
    "This document summarizes the main manufacturing flow based on the current flow diagram.",
    "",
    "## Manual Sections",
    "",
    sectionBlocks,
    "",
    "## Flow Image",
    "",
    "[Insert exported PNG or SVG here]",
  ].join("\n");
}
