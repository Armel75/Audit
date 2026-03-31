import { MissionStatus } from '../utils/status';

// ================= CORE TYPES =================

export interface Mission {
  id: number;
  title: string;
  description: string;
  objective: string | null;
  scopeDescription: string | null;
  methodology: string | null;

  // 🔥 Typage strict basé sur ton status.ts
  status: MissionStatus;

  startDate: string | null;
  endDate: string | null;

  leader: {
    firstName: string;
    lastName: string;
  };

  plan: {
    year: number;
    title: string | null;
  };

  auditType: {
    name: string;
  } | null;

  findings: Finding[];
  members: MissionMember[];
  scopes: MissionScope[];
  statusHistory: MissionStatusHistory[];

  programs: MissionProgram[];
  documents: MissionDocument[];
  approvals: MissionApproval[];
}

// ================= SUB TYPES =================

export interface MissionProgram {
  id: number;
  title: string;
  status: string; // ⚠️ à typer plus tard si workflow program
  _count: {
    procedures: number;
  };
}

export interface MissionDocument {
  id: number;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MissionApproval {
  id: number;
  decision: string; // ⚠️ tu peux typer plus tard (PENDING, APPROVED...)
  comments: string | null;
  createdAt: string;
  approver: {
    firstName: string;
    lastName: string;
  };
}

// ================= PLACEHOLDERS (à typer si besoin) =================

// 👉 Tu peux remplacer ces any plus tard avec tes vrais types
export type Finding = any;
export type MissionMember = any;
export type MissionScope = any;
export type MissionStatusHistory = any;