import { FileText, FileQuestion, FileBadge, Presentation, BookOpen, Image as ImageIcon, AlertTriangle, type LucideIcon } from "lucide-react";

export type DocKind = "markdown" | "pdf" | "pptx" | "docx" | "yaml" | "png";

export interface DocEntry {
  id: string;
  title: string;
  description: string;
  kind: DocKind;
  badge: string;
  size: string;
  updated: string;
  icon: LucideIcon;
  /** In-app route — when set, card opens this route. */
  route?: string;
  /** Static file under /public — when set, card downloads this file. */
  file?: string;
}

export const DOCS: DocEntry[] = [
  {
    id: "prd",
    title: "Product Requirements",
    description: "The PRD: problem, vision, capabilities, architecture, and roadmap for the AiGovOps Review Framework.",
    kind: "markdown",
    badge: "MD",
    size: "3.4 KB",
    updated: "2026-04-19",
    icon: FileText,
    route: "/docs/prd",
  },
  {
    id: "prd-faq",
    title: "PRD-FAQ",
    description: "Working-backwards FAQ — written for non-technical stakeholders evaluating the framework.",
    kind: "markdown",
    badge: "MD",
    size: "3.1 KB",
    updated: "2026-04-19",
    icon: FileQuestion,
    route: "/docs/prd-faq",
  },
  {
    id: "exec-summary",
    title: "Executive Summary",
    description: "One-page cartographic-trust PDF for sharing with non-technical stakeholders.",
    kind: "pdf",
    badge: "PDF",
    size: "65 KB",
    updated: "2026-04-19",
    icon: FileBadge,
    file: "/docs/AiGovOps_Exec_Summary.pdf",
  },
  {
    id: "pitch-deck",
    title: "Pitch Deck",
    description: "10-slide pitch deck in the cartographic-trust visual language.",
    kind: "pptx",
    badge: "PPTX",
    size: "381 KB",
    updated: "2026-04-19",
    icon: Presentation,
    file: "/docs/AiGovOps_Pitch_Deck.pptx",
  },
  {
    id: "aos-spec",
    title: "AOS v0.1 Spec",
    description: "Machine-readable AiGovOps Operational Standard. 18 controls across 7 domains, mapped to EU AI Act / NIST / ISO 42001.",
    kind: "yaml",
    badge: "YAML",
    size: "8 KB",
    updated: "2026-04-19",
    icon: BookOpen,
    route: "/docs/aos-spec",
  },
  {
    id: "hero-poster",
    title: "Hero Poster",
    description: "16:9 social-card hero poster. The whole framework, one image.",
    kind: "png",
    badge: "PNG",
    size: "93 KB",
    updated: "2026-04-19",
    icon: ImageIcon,
    file: "/docs/AiGovOps_Hero_Poster.png",
  },
  {
    id: "risk-scenarios",
    title: "Risk Scenarios & AI-Fails",
    description:
      "Industry-by-industry scenarios (healthcare, legal, HR, media, real estate, manufacturing) plus a verified AI-fail register — every dollar figure cited to a public source.",
    kind: "markdown",
    badge: "REF",
    size: "live",
    updated: "2026-04-19",
    icon: AlertTriangle,
    route: "/docs/risk-scenarios",
  },
];

export const PRD_DOC = DOCS.find((d) => d.id === "prd")!;
export const FAQ_DOC = DOCS.find((d) => d.id === "prd-faq")!;
