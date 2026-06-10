import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, EdgeChange, MiniMap, NodeChange, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import { ChevronDown, ChevronRight, Copy, Download, FileUp, Plus, RotateCcw, Trash2, Wand2 } from "lucide-react";
import BusinessNode from "./BusinessNode";
import {
  FlowDefinition,
  FlowEdge,
  Lane,
  ManualSection,
  StepNode,
  edgeId,
  generateMermaid,
  initialFlow,
  normalizeFlow,
  validateFlow,
} from "./flow";
import { autoLayout, toReactFlowEdges, toReactFlowNodes } from "./reactFlowAdapter";
import {
  copyText,
  generateManualSection,
  safeFileName,
} from "./exportGenerators";

const storageKey = "business-flow-definition";
const nodeTypes = { businessNode: BusinessNode };
const stepTypes: Array<NonNullable<StepNode["type"]>> = ["system", "app", "process", "screen", "data"];
const flowTypes: Array<NonNullable<FlowEdge["flowType"]>> = ["process", "document", "status", "reference"];
const laneColorPalette = [
  "#CBD5E1",
  "#93C5FD",
  "#60A5FA",
  "#86EFAC",
  "#4ADE80",
  "#5EEAD4",
  "#FDE047",
  "#FACC15",
  "#FDBA74",
  "#FB923C",
  "#C4B5FD",
  "#A78BFA",
  "#F9A8D4",
  "#F472B6",
  "#7DD3FC",
  "#38BDF8",
];

type Selection =
  | { type: "lane"; id: string }
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | { type: "section"; id: string }
  | null;
type ViewMode = "full" | "step";

function cloneInitialFlow(): FlowDefinition {
  return autoLayout(normalizeFlow(JSON.parse(JSON.stringify(initialFlow)) as FlowDefinition));
}

function ensurePositions(flow: FlowDefinition): FlowDefinition {
  return autoLayout(flow);
}

function loadFlow(): FlowDefinition {
  const saved = localStorage.getItem(storageKey) ?? localStorage.getItem("mermaid-flow-definition");
  if (!saved) return cloneInitialFlow();

  try {
    return ensurePositions(normalizeFlow(JSON.parse(saved) as FlowDefinition));
  } catch {
    return cloneInitialFlow();
  }
}

function App() {
  return (
    <ReactFlowProvider>
      <FlowModeler />
    </ReactFlowProvider>
  );
}

function FlowModeler() {
  const [flow, setFlow] = useState<FlowDefinition>(() => loadFlow());
  const [selectedItem, setSelectedItem] = useState<Selection>(null);
  const [importError, setImportError] = useState("");
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [toast, setToast] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reactFlow = useReactFlow();

  const validation = useMemo(() => validateFlow(flow), [flow]);
  const sortedLanes = useMemo(() => [...flow.lanes].sort((a, b) => a.sortOrder - b.sortOrder), [flow.lanes]);
  const rfNodes = useMemo(
    () =>
      toReactFlowNodes(flow).map((node) => ({
        ...node,
        selected: selectedItem?.type === "node" && selectedItem.id === node.id,
      })),
    [flow, selectedItem],
  );
  const rfEdges = useMemo(
    () =>
      toReactFlowEdges(flow).map((edge) => ({
        ...edge,
        selected: selectedItem?.type === "edge" && selectedItem.id === edge.id,
      })),
    [flow, selectedItem],
  );
  const mermaidCode = useMemo(() => generateMermaid(flow), [flow]);
  const manualSection = useMemo(() => generateManualSection(flow), [flow]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(flow));
  }, [flow]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (viewMode === "full") {
        reactFlow.fitView({ duration: 350, padding: 0.16 });
        return;
      }

      if (viewMode === "step" && selectedItem?.type === "node") {
        const node = flow.nodes.find((item) => item.id === selectedItem.id);
        if (node?.position) {
          reactFlow.setCenter(node.position.x + 90, node.position.y + 41, { duration: 350, zoom: 1.15 });
        }
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [flow.nodes, reactFlow, selectedItem, viewMode]);

  function updateFlow(updater: (current: FlowDefinition) => FlowDefinition, relayout = false) {
    setFlow((current) => {
      const next = updater(current);
      return relayout ? autoLayout(next) : next;
    });
  }

  function addLane() {
    const nextNumber = flow.lanes.length + 1;
    const lane: Lane = {
      id: `LANE_${nextNumber}`,
      label: `New Lane ${nextNumber}`,
      sortOrder: nextNumber * 10,
      color: "#E5E7EB",
    };
    updateFlow((current) => ({ ...current, lanes: [...current.lanes, lane] }), true);
    setSelectedItem({ type: "lane", id: lane.id });
  }

  function addStep(laneId = sortedLanes[0]?.id ?? "") {
    const nextNumber = flow.nodes.length + 1;
    const step: StepNode = {
      id: `STEP_${nextNumber}`,
      label: `New Step ${nextNumber}`,
      laneId,
      type: "process",
    };
    updateFlow((current) => ({ ...current, nodes: [...current.nodes, step] }), true);
    setSelectedItem({ type: "node", id: step.id });
  }

  function addNextStep(from: string) {
    const existingTargets = new Set(flow.edges.filter((edge) => edge.from === from).map((edge) => edge.to));
    const target = flow.nodes.find((node) => node.id !== from && !existingTargets.has(node.id));
    if (!target) return;

    const edge: FlowEdge = {
      id: `edge-${Date.now()}`,
      from,
      to: target.id,
      flowType: "process",
    };
    updateFlow((current) => ({ ...current, edges: [...current.edges, edge] }), true);
    setSelectedItem({ type: "edge", id: edge.id! });
  }

  function addManualSection() {
    const nextNumber = (flow.manualSections?.length ?? 0) + 1;
    const section: ManualSection = {
      id: `SECTION_${nextNumber}`,
      title: `Section ${nextNumber}`,
      purpose: "",
      nodeIds: [],
      sortOrder: nextNumber * 10,
    };
    updateFlow((current) => ({ ...current, manualSections: [...(current.manualSections ?? []), section] }));
    setSelectedItem({ type: "section", id: section.id });
  }

  function updateLane(id: string, patch: Partial<Lane>) {
    updateFlow((current) => {
      const nextId = patch.id ?? id;
      return {
        ...current,
        lanes: current.lanes.map((lane) => (lane.id === id ? { ...lane, ...patch } : lane)),
        nodes: patch.id ? current.nodes.map((node) => (node.laneId === id ? { ...node, laneId: nextId } : node)) : current.nodes,
      };
    }, Boolean(patch.id || patch.sortOrder !== undefined));
    if (patch.id) setSelectedItem({ type: "lane", id: patch.id });
  }

  function updateStep(id: string, patch: Partial<StepNode>) {
    updateFlow((current) => {
      const nextId = patch.id ?? id;
      return {
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
        edges: patch.id
          ? current.edges.map((edge) => ({
              ...edge,
              from: edge.from === id ? nextId : edge.from,
              to: edge.to === id ? nextId : edge.to,
            }))
          : current.edges,
      };
    }, Boolean(patch.id || patch.laneId || patch.label));
    if (patch.id) setSelectedItem({ type: "node", id: patch.id });
  }

  function updateEdge(id: string, patch: Partial<FlowEdge>) {
    updateFlow(
      (current) => ({
        ...current,
        edges: current.edges.map((edge, index) => (edgeId(edge, index) === id ? { ...edge, ...patch } : edge)),
      }),
      Boolean(patch.from || patch.to || patch.flowType),
    );
  }

  function updateManualSection(id: string, patch: Partial<ManualSection>) {
    updateFlow((current) => {
      const nextId = patch.id ?? id;
      return {
        ...current,
        manualSections: (current.manualSections ?? []).map((section) =>
          section.id === id ? { ...section, ...patch } : section,
        ),
      };
    });
    if (patch.id) setSelectedItem({ type: "section", id: patch.id });
  }

  function deleteLane(id: string) {
    updateFlow((current) => {
      const deletedNodeIds = new Set(current.nodes.filter((node) => node.laneId === id).map((node) => node.id));
      return {
        ...current,
        lanes: current.lanes.filter((lane) => lane.id !== id),
        nodes: current.nodes.filter((node) => node.laneId !== id),
        edges: current.edges.filter((edge) => !deletedNodeIds.has(edge.from) && !deletedNodeIds.has(edge.to)),
      };
    }, true);
    setSelectedItem(null);
  }

  function deleteStep(id: string) {
    updateFlow(
      (current) => ({
        ...current,
        nodes: current.nodes.filter((node) => node.id !== id),
        edges: current.edges.filter((edge) => edge.from !== id && edge.to !== id),
      }),
      true,
    );
    setSelectedItem(null);
  }

  function deleteEdge(id: string) {
    updateFlow(
      (current) => ({
        ...current,
        edges: current.edges.filter((edge, index) => edgeId(edge, index) !== id),
      }),
      true,
    );
    setSelectedItem(null);
  }

  function deleteManualSection(id: string) {
    updateFlow((current) => ({
      ...current,
      manualSections: (current.manualSections ?? []).filter((section) => section.id !== id),
    }));
    setSelectedItem(null);
  }

  function onNodesChange(changes: NodeChange[]) {
    for (const change of changes) {
      if (change.type === "select" && change.selected) {
        setSelectedItem({ type: "node", id: change.id });
      }
    }
  }

  function onEdgesChange(changes: EdgeChange[]) {
    for (const change of changes) {
      if (change.type === "select" && change.selected) {
        setSelectedItem({ type: "edge", id: change.id });
      }
    }
  }

  function runAutoLayout() {
    updateFlow((current) => current, true);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${flow.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "flow-definition"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const nextFlow = autoLayout(normalizeFlow(JSON.parse(String(reader.result)) as FlowDefinition));
        const result = validateFlow(nextFlow);
        if (result.errors.length > 0) {
          setImportError(result.errors.join(" "));
          return;
        }
        setFlow(nextFlow);
        setSelectedItem(null);
        setImportError("");
      } catch (error) {
        setImportError(error instanceof Error ? error.message : String(error));
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function copyGeneratedText(text: string) {
    await copyText(text);
    showToast("Copied to clipboard.");
  }

  async function copyMermaid() {
    await copyGeneratedText(mermaidCode);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy"), 1400);
  }

  function exportMarkdown() {
    const blob = new Blob([manualSection], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeFileName(flow.title, "md");
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportImage(kind: "png" | "svg") {
    setExportMode(true);
    setSelectedItem(null);
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    reactFlow.fitView({ duration: 0, padding: 0.18 });
    await new Promise((resolve) => window.setTimeout(resolve, 260));

    const element = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!element) {
      setExportMode(false);
      return;
    }

    const nodes = reactFlow.getNodes();
    const padding = 40;
    const minX = Math.min(...nodes.map((n) => n.position.x)) - padding;
    const minY = Math.min(...nodes.map((n) => n.position.y)) - padding;
    const maxX = Math.max(...nodes.map((n) => n.position.x + (n.measured?.width ?? 200))) + padding;
    const maxY = Math.max(...nodes.map((n) => n.position.y + (n.measured?.height ?? 80))) + padding;
    const width = maxX - minX;
    const height = maxY - minY;

    const dataUrl =
      kind === "png"
        ? await toPng(element, { backgroundColor: "#ffffff", pixelRatio: 2, width, height, style: { transform: `translate(${-minX}px, ${-minY}px)` } })
        : await toSvg(element, { backgroundColor: "#ffffff", width, height, style: { transform: `translate(${-minX}px, ${-minY}px)` } });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = safeFileName(flow.title, kind);
    link.click();
    setExportMode(false);
  }

  function resetSample() {
    setFlow(cloneInitialFlow());
    setSelectedItem(null);
    setImportError("");
  }

  return (
    <main className="modeler-shell">
      <header className="admin-toolbar">
        <div className="view-mode-group" aria-label="Canvas view mode">
          <span>View</span>
          <button type="button" className={viewMode === "full" ? "active" : ""} onClick={() => setViewMode("full")}>
            Full
          </button>
          <button type="button" className={viewMode === "step" ? "active" : ""} onClick={() => setViewMode("step")}>
            Step Focus
          </button>
        </div>
        <div className="admin-actions">
          <div className="admin-toolbar-title">Flow Management</div>
          <button type="button" onClick={() => setExportOpen(true)}>
            <Download size={15} /> Export Manual
          </button>
          <button type="button" onClick={exportJson}>
            <Download size={15} /> Export JSON
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={15} /> Import JSON
          </button>
        </div>
        <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json" onChange={importJson} />
      </header>
      <aside className="left-panel">
        <div className="brand-block">
          <input
            className="title-input"
            value={flow.title}
            onChange={(event) => updateFlow((current) => ({ ...current, title: event.target.value }))}
            aria-label="Flow title"
          />
          <select
            value={flow.direction}
            onChange={(event) =>
              updateFlow(
                (current) => ({ ...current, direction: event.target.value as FlowDefinition["direction"] }),
                true,
              )
            }
          >
            <option value="LR">Left to Right</option>
            <option value="TD">Top Down</option>
          </select>
        </div>

        <div className="action-grid">
          <button type="button" onClick={addLane}>
            <Plus size={15} /> Add Lane
          </button>
          <button type="button" onClick={runAutoLayout}>
            <Wand2 size={15} /> Auto Layout
          </button>
        </div>

        {importError && <div className="inline-error">{importError}</div>}

        <LaneTree
          flow={flow}
          sortedLanes={sortedLanes}
          selectedItem={selectedItem}
          onSelect={setSelectedItem}
          onAddStep={addStep}
        />
        <ManualSectionList
          sections={flow.manualSections ?? []}
          selectedItem={selectedItem}
          onSelect={setSelectedItem}
          onAddSection={addManualSection}
        />
        <div className="left-panel-footer">
          <button className="reset-sample-btn" type="button" onClick={resetSample}>
            <RotateCcw size={13} /> Reset Sample
          </button>
        </div>
      </aside>

      <section className="canvas-panel">
        {exportMode && <div className="export-title">{flow.title}</div>}
        <ReactFlow
          className={exportMode ? "export-mode-flow" : ""}
          nodes={exportMode ? rfNodes.map((node) => ({ ...node, selected: false })) : rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedItem({ type: "node", id: node.id })}
          onEdgeClick={(_, edge) => setSelectedItem({ type: "edge", id: edge.id })}
          onPaneClick={() => setSelectedItem(null)}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable
          nodesFocusable
          deleteKeyCode={null}
        >
          {!exportMode && <Background />}
          {!exportMode && <MiniMap pannable zoomable />}
          {!exportMode && <Controls />}
        </ReactFlow>
      </section>

      <aside className="right-panel">
        <PropertyEditor
          flow={flow}
          validation={validation}
          selectedItem={selectedItem}
          onUpdateLane={updateLane}
          onUpdateStep={updateStep}
          onUpdateEdge={updateEdge}
          onDeleteLane={deleteLane}
          onDeleteStep={deleteStep}
          onDeleteEdge={deleteEdge}
          onAddNextStep={addNextStep}
          onAddStep={addStep}
          onSelect={setSelectedItem}
          onUpdateManualSection={updateManualSection}
          onDeleteManualSection={deleteManualSection}
        />
      </aside>

      {mermaidOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setMermaidOpen(false)}>
          <section className="export-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <h2>Mermaid Export</h2>
              <div className="modal-actions">
                <button type="button" onClick={copyMermaid}>
                  <Copy size={15} /> {copyLabel}
                </button>
                <button type="button" onClick={() => setMermaidOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <pre>{mermaidCode}</pre>
          </section>
        </div>
      )}
      {exportOpen && (
        <ExportPanel
          flow={flow}
          manualSection={manualSection}
          onClose={() => setExportOpen(false)}
          onCopy={copyGeneratedText}
          onExportMarkdown={exportMarkdown}
          onExportPng={() => exportImage("png")}
          onUpdateOverview={(overview) => updateFlow((current) => ({ ...current, overview }))}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function LaneTree({
  flow,
  sortedLanes,
  selectedItem,
  onSelect,
  onAddStep,
}: {
  flow: FlowDefinition;
  sortedLanes: Lane[];
  selectedItem: Selection;
  onSelect: (selection: Selection) => void;
  onAddStep: (laneId: string) => void;
}) {
  const [collapsedLaneIds, setCollapsedLaneIds] = useState<Set<string>>(
    () => new Set(sortedLanes.map((lane) => lane.id)),
  );

  function toggleLane(id: string) {
    setCollapsedLaneIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section className="lane-tree">
      <div className="section-heading">
        <h2>Lanes & Steps</h2>
        <span>{flow.nodes.length} steps</span>
      </div>
      {sortedLanes.map((lane) => {
        const laneSteps = flow.nodes.filter((node) => node.laneId === lane.id);
        const collapsed = collapsedLaneIds.has(lane.id);
        return (
          <div className={`lane-block ${collapsed ? "collapsed" : ""}`} key={lane.id}>
            <div className="lane-header">
              <button className="lane-toggle" type="button" onClick={() => toggleLane(lane.id)} aria-label={collapsed ? "Expand lane" : "Collapse lane"}>
                {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
            <button
              type="button"
              className={`lane-row ${selectedItem?.type === "lane" && selectedItem.id === lane.id ? "selected" : ""}`}
              onClick={() => onSelect({ type: "lane", id: lane.id })}
            >
              <span className="lane-swatch" style={{ background: lane.color ?? "#E5E7EB" }} />
              <span>
                <strong>{lane.label}</strong>
                <small>{lane.id} · {laneSteps.length} steps</small>
              </span>
            </button>
            </div>
            {!collapsed && <div className="lane-step-list">
              {laneSteps.map((step) => (
                <button
                  type="button"
                  className={`step-row ${selectedItem?.type === "node" && selectedItem.id === step.id ? "selected" : ""}`}
                  key={step.id}
                  onClick={() => onSelect({ type: "node", id: step.id })}
                >
                  <span>
                    <strong>{step.id}</strong>
                    <small>{step.label.replace(/\n/g, " / ")}</small>
                  </span>
                  <em>{step.type ?? "process"}</em>
                </button>
              ))}
              <button className="add-step-row" type="button" onClick={() => onAddStep(lane.id)}>
                <Plus size={14} /> Step in {lane.id}
              </button>
            </div>}
          </div>
        );
      })}
    </section>
  );
}

function ManualSectionList({
  sections,
  selectedItem,
  onSelect,
  onAddSection,
}: {
  sections: ManualSection[];
  selectedItem: Selection;
  onSelect: (selection: Selection) => void;
  onAddSection: () => void;
}) {
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <section className="manual-section-list">
      <div className="section-heading">
        <h2>Manual Sections</h2>
        <span>{sections.length}</span>
      </div>
      <div className="manual-section-items">
        {sortedSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`manual-section-row ${selectedItem?.type === "section" && selectedItem.id === section.id ? "selected" : ""}`}
            onClick={() => onSelect({ type: "section", id: section.id })}
          >
            <strong>{section.title}</strong>
            <small>{section.nodeIds.length} steps</small>
          </button>
        ))}
        <button className="add-step-row" type="button" onClick={onAddSection}>
          <Plus size={14} /> Manual Section
        </button>
      </div>
    </section>
  );
}

function StepIdInput({ nodeId, onUpdate }: { nodeId: string; onUpdate: (id: string) => void }) {
  const [draft, setDraft] = useState(nodeId);
  useEffect(() => { setDraft(nodeId); }, [nodeId]);
  return (
    <input
      value={draft}
      onChange={(event) => {
        const val = event.target.value;
        setDraft(val);
        if (val.trim()) onUpdate(val);
      }}
      onBlur={() => {
        if (!draft.trim()) setDraft(nodeId);
      }}
    />
  );
}

function PropertyEditor({
  flow,
  validation,
  selectedItem,
  onUpdateLane,
  onUpdateStep,
  onUpdateEdge,
  onDeleteLane,
  onDeleteStep,
  onDeleteEdge,
  onAddNextStep,
  onAddStep,
  onSelect,
  onUpdateManualSection,
  onDeleteManualSection,
}: {
  flow: FlowDefinition;
  validation: ReturnType<typeof validateFlow>;
  selectedItem: Selection;
  onUpdateLane: (id: string, patch: Partial<Lane>) => void;
  onUpdateStep: (id: string, patch: Partial<StepNode>) => void;
  onUpdateEdge: (id: string, patch: Partial<FlowEdge>) => void;
  onDeleteLane: (id: string) => void;
  onDeleteStep: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onAddNextStep: (from: string) => void;
  onAddStep: (laneId: string) => void;
  onSelect: (selection: Selection) => void;
  onUpdateManualSection: (id: string, patch: Partial<ManualSection>) => void;
  onDeleteManualSection: (id: string) => void;
}) {
  if (selectedItem?.type === "lane") {
    const lane = flow.lanes.find((item) => item.id === selectedItem.id);
    if (!lane) return <Summary flow={flow} validation={validation} />;
    return (
      <section className="editor-section">
        <EditorHeader title="Lane" onDelete={() => onDeleteLane(lane.id)} />
        <Field label="id">
          <input value={lane.id} onChange={(event) => onUpdateLane(lane.id, { id: event.target.value })} />
        </Field>
        <Field label="label">
          <input value={lane.label} onChange={(event) => onUpdateLane(lane.id, { label: event.target.value })} />
        </Field>
        <Field label="color">
          <div className="color-palette" role="list" aria-label="Lane color choices">
            {laneColorPalette.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-swatch ${lane.color === color ? "selected" : ""}`}
                style={{ background: color }}
                onClick={() => onUpdateLane(lane.id, { color })}
                aria-label={`Select ${color}`}
              />
            ))}
          </div>
        </Field>
        <Field label="sortOrder">
          <input type="number" value={lane.sortOrder} onChange={(event) => onUpdateLane(lane.id, { sortOrder: Number(event.target.value) })} />
        </Field>
        <button className="wide-action" type="button" onClick={() => onAddStep(lane.id)}>
          <Plus size={14} /> Add Step in {lane.id}
        </button>
      </section>
    );
  }

  if (selectedItem?.type === "node") {
    const node = flow.nodes.find((item) => item.id === selectedItem.id);
    if (!node) return <Summary flow={flow} validation={validation} />;
    const outgoing = flow.edges.map((edge, index) => ({ edge, id: edgeId(edge, index) })).filter(({ edge }) => edge.from === node.id);
    return (
      <section className="editor-section">
        <EditorHeader title="Step" onDelete={() => onDeleteStep(node.id)} />
        <Field label="id">
          <StepIdInput nodeId={node.id} onUpdate={(newId) => onUpdateStep(node.id, { id: newId })} />
        </Field>
        <Field label="label">
          <textarea value={node.label} onChange={(event) => onUpdateStep(node.id, { label: event.target.value })} />
        </Field>
        <Field label="lane">
          <select value={node.laneId} onChange={(event) => onUpdateStep(node.id, { laneId: event.target.value })}>
            {flow.lanes.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {lane.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="type">
          <select value={node.type ?? "process"} onChange={(event) => onUpdateStep(node.id, { type: event.target.value as StepNode["type"] })}>
            {stepTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="short description">
          <textarea value={node.description ?? ""} onChange={(event) => onUpdateStep(node.id, { description: event.target.value })} />
        </Field>
        <div className="nested-editor">
          <div className="section-heading">
            <h2>Next Steps</h2>
            <button type="button" onClick={() => onAddNextStep(node.id)}>
              <Plus size={13} /> Add
            </button>
          </div>
          {outgoing.map(({ edge, id }) => (
            <div className="next-editor-row" key={id}>
              <select value={edge.to} onChange={(event) => onUpdateEdge(id, { to: event.target.value })}>
                {flow.nodes
                  .filter((item) => item.id !== edge.from)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} - {item.label.replace(/\n/g, " / ")}
                    </option>
                  ))}
              </select>
              <input value={edge.documentName ?? edge.label ?? ""} placeholder="data / label" onChange={(event) => onUpdateEdge(id, { documentName: event.target.value })} />
              <button type="button" onClick={() => onSelect({ type: "edge", id })}>
                Select
              </button>
              <button className="icon-button danger" type="button" onClick={() => onDeleteEdge(id)} aria-label="Delete next step">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (selectedItem?.type === "edge") {
    const edgeIndex = flow.edges.findIndex((item, index) => edgeId(item, index) === selectedItem.id);
    const edge = flow.edges[edgeIndex];
    if (!edge) return <Summary flow={flow} validation={validation} />;
    return (
      <section className="editor-section">
        <EditorHeader title="Connection" onDelete={() => onDeleteEdge(selectedItem.id)} />
        <Field label="from">
          <select value={edge.from} onChange={(event) => onUpdateEdge(selectedItem.id, { from: event.target.value })}>
            {flow.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.id} - {node.label.replace(/\n/g, " / ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="to">
          <select value={edge.to} onChange={(event) => onUpdateEdge(selectedItem.id, { to: event.target.value })}>
            {flow.nodes
              .filter((node) => node.id !== edge.from)
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id} - {node.label.replace(/\n/g, " / ")}
                </option>
              ))}
          </select>
        </Field>
        <Field label="label">
          <input value={edge.label ?? ""} onChange={(event) => onUpdateEdge(selectedItem.id, { label: event.target.value })} />
        </Field>

        <Field label="document / data name">
          <input value={edge.documentName ?? ""} onChange={(event) => onUpdateEdge(selectedItem.id, { documentName: event.target.value })} />
        </Field>
        <Field label="description">
          <textarea value={edge.description ?? ""} onChange={(event) => onUpdateEdge(selectedItem.id, { description: event.target.value })} />
        </Field>
      </section>
    );
  }

  if (selectedItem?.type === "section") {
    const section = (flow.manualSections ?? []).find((item) => item.id === selectedItem.id);
    if (!section) return <Summary flow={flow} validation={validation} />;
    const selectedNodeIds = new Set(section.nodeIds);
    return (
      <section className="editor-section">
        <EditorHeader title="Manual Section" onDelete={() => onDeleteManualSection(section.id)} />
        <Field label="id">
          <input value={section.id} onChange={(event) => onUpdateManualSection(section.id, { id: event.target.value })} />
        </Field>
        <Field label="title">
          <input value={section.title} onChange={(event) => onUpdateManualSection(section.id, { title: event.target.value })} />
        </Field>
        <Field label="purpose">
          <textarea value={section.purpose ?? ""} onChange={(event) => onUpdateManualSection(section.id, { purpose: event.target.value })} />
        </Field>
        <Field label="sortOrder">
          <input
            type="number"
            value={section.sortOrder}
            onChange={(event) => onUpdateManualSection(section.id, { sortOrder: Number(event.target.value) })}
          />
        </Field>
        <div className="nested-editor">
          <div className="section-heading">
            <h2>Included Steps</h2>
          </div>
          <div className="section-step-picker">
            {flow.nodes.map((node) => {
              const checked = selectedNodeIds.has(node.id);
              return (
                <label key={node.id} className="section-step-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextIds = event.target.checked
                        ? [...section.nodeIds, node.id]
                        : section.nodeIds.filter((id) => id !== node.id);
                      onUpdateManualSection(section.id, { nodeIds: nextIds });
                    }}
                  />
                  <span>
                    <strong>{node.id}</strong>
                    <small>{node.label.replace(/\n/g, " / ")}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return <Summary flow={flow} validation={validation} />;
}

function Summary({ flow, validation }: { flow: FlowDefinition; validation: ReturnType<typeof validateFlow> }) {
  return (
    <section className="editor-section">
      <div className="section-heading">
        <h2>Flow Summary</h2>
      </div>
      <div className="summary-grid">
        <Stat label="Lanes" value={flow.lanes.length} />
        <Stat label="Steps" value={flow.nodes.length} />
        <Stat label="Edges" value={flow.edges.length} />
        <Stat label="Sections" value={flow.manualSections?.length ?? 0} />
      </div>
      <MessageList title="Validation Errors" items={validation.errors} tone="error" />
      <MessageList title="Warnings" items={validation.warnings} tone="warning" />
    </section>
  );
}

function EditorHeader({ title, onDelete }: { title: string; onDelete: () => void }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      <button className="icon-button danger" type="button" onClick={onDelete} aria-label={`Delete ${title}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MessageList({ title, items, tone }: { title: string; items: string[]; tone: "error" | "warning" }) {
  return (
    <div className={`message-list ${tone}`}>
      <h3>{title}</h3>
      {items.length === 0 ? <p>None</p> : items.map((item) => <p key={item}>{item}</p>)}
    </div>
  );
}

function ExportPanel({
  flow,
  manualSection,
  onClose,
  onCopy,
  onExportMarkdown,
  onExportPng,
  onUpdateOverview,
}: {
  flow: FlowDefinition;
  manualSection: string;
  onClose: () => void;
  onCopy: (text: string) => void;
  onExportMarkdown: () => void;
  onExportPng: () => void;
  onUpdateOverview: (overview: string) => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="export-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <div>
            <h2>Export Manual</h2>
            <p>Generate a simple manual from sections and included steps.</p>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div className="manual-export-actions">
          <button className="primary-action" type="button" onClick={() => onCopy(manualSection)}>
            <Copy size={16} /> Copy Manual
          </button>
          <button type="button" onClick={onExportMarkdown}>
            <Download size={16} /> Export Markdown
          </button>
          <button type="button" onClick={onExportPng}>
            <Download size={16} /> Export PNG
          </button>
        </div>
        <ManualDocumentPreview flow={flow} onUpdateOverview={onUpdateOverview} />
      </section>
    </div>
  );
}

function ManualDocumentPreview({ flow, onUpdateOverview }: { flow: FlowDefinition; onUpdateOverview: (overview: string) => void }) {
  const sections = [...(flow.manualSections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const sectionList = sections.length
    ? sections
    : [{ id: "MAIN_FLOW", title: "Main Flow", purpose: "", nodeIds: flow.nodes.map((node) => node.id), sortOrder: 10 }];
  const laneById = new Map(flow.lanes.map((lane) => [lane.id, lane.label]));

  return (
    <article className="manual-preview" aria-label="Manual Preview">
      <h1>{flow.title}</h1>
      <section>
        <h2>Overview</h2>
        <textarea
          className="overview-input"
          value={flow.overview ?? ""}
          placeholder="Describe the overall flow..."
          onChange={(event) => onUpdateOverview(event.target.value)}
        />
      </section>
      <section>
        <h2>Manual Sections</h2>
        {sectionList.map((section) => {
          const nodeIds = new Set(section.nodeIds);
          const steps = flow.nodes.filter((node) => nodeIds.has(node.id));
          return (
            <section className="manual-preview-section" key={section.id}>
              <h3>{section.title}</h3>
              <h4>Purpose:</h4>
              <p>{section.purpose?.trim() || "No description provided."}</p>
              <h4>Included Steps:</h4>
              {steps.length === 0 ? (
                <ul>
                  <li>No steps selected.</li>
                </ul>
              ) : (
                <ul>
                  {steps.map((step) => (
                    <li key={step.id}>
                      <strong>{step.id}</strong> - {step.label.replace(/\n/g, " / ")}
                      <span>Lane: {laneById.get(step.laneId) ?? step.laneId} / Type: {step.type ?? "process"}{step.description?.trim() ? ` — ${step.description.trim()}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </section>
      <section>
        <h2>Flow Image</h2>
        <p className="flow-image-placeholder">[Insert exported PNG or SVG here]</p>
      </section>
    </article>
  );
}

function PreviewBlock({ title, text }: { title: string; text: string }) {
  return (
    <section className="preview-block">
      <h3>{title}</h3>
      <pre>{text}</pre>
    </section>
  );
}

export default App;
