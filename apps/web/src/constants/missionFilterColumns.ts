// =====================================================
// Configuration des colonnes filtrables pour les missions
// =====================================================

export type ColumnType = 'string' | 'enum' | 'number' | 'date' | 'userSelect';

export type Operator = {
  op: string;
  label: string;
  needsValue?: boolean; // false ⇒ pas d'input de valeur
};

export const OPERATORS_BY_TYPE: Record<ColumnType, Operator[]> = {
  string: [
    { op: 'contains', label: 'Contient' },
    { op: 'eq', label: 'Égal à' },
    { op: 'startsWith', label: 'Commence par' },
    { op: 'endsWith', label: 'Finit par' },
    { op: 'isNull', label: 'Est vide', needsValue: false },
    { op: 'isNotNull', label: "N'est pas vide", needsValue: false },
  ],
  enum: [
    { op: 'eq', label: 'Égal à' },
    { op: 'neq', label: 'Différent de' },
    { op: 'in', label: 'Parmi' },
  ],
  number: [
    { op: 'eq', label: '=' },
    { op: 'neq', label: '≠' },
    { op: 'gt', label: '>' },
    { op: 'gte', label: '≥' },
    { op: 'lt', label: '<' },
    { op: 'lte', label: '≤' },
    { op: 'between', label: 'Entre' },
  ],
  date: [
    { op: 'eq', label: 'Égal à' },
    { op: 'gt', label: 'Après' },
    { op: 'lt', label: 'Avant' },
    { op: 'between', label: 'Entre' },
    { op: 'isNull', label: 'Est vide', needsValue: false },
    { op: 'isNotNull', label: "N'est pas vide", needsValue: false },
  ],
  userSelect: [
    { op: 'eq', label: 'Égal à' },
    { op: 'neq', label: 'Différent de' },
    { op: 'isNull', label: 'Non assigné', needsValue: false },
    { op: 'isNotNull', label: 'Assigné', needsValue: false },
  ],
};

export type FilterField = {
  field: string;
  label: string;
  type: ColumnType;
  enumValues?: { value: string; label: string }[];
};

// =====================================================
// Statuts mission (miroir de utils/status.ts)
// =====================================================
export const MISSION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'PLANNED', label: 'Planifiée' },
  { value: 'READY', label: 'Prête' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'UNDER_REVIEW', label: 'En revue' },
  { value: 'APPROVED', label: 'Approuvée' },
  { value: 'CLOSED', label: 'Clôturée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

export const getMissionStatusLabel = (val: string): string => {
  return MISSION_STATUS_OPTIONS.find((o) => o.value === val)?.label ?? val;
};

// =====================================================
// Colonnes filtrables
// =====================================================
export const MISSION_FILTER_COLUMNS: FilterField[] = [
  { field: 'title', label: 'Titre', type: 'string' },
  {
    field: 'status',
    label: 'Statut',
    type: 'enum',
    enumValues: MISSION_STATUS_OPTIONS,
  },
  { field: 'leader', label: 'Chef de mission', type: 'userSelect' },
  { field: 'planYear', label: 'Année du plan', type: 'number' },
  { field: 'auditType', label: "Type d'audit", type: 'string' },
  { field: 'startDate', label: 'Date début', type: 'date' },
  { field: 'endDate', label: 'Date fin', type: 'date' },
];
