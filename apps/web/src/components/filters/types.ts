// Types partagés pour le système de filtres missions
export type Logic = 'AND' | 'OR';

export type FilterRowState = {
  id: string;
  field: string;
  op: string;
  value: any;
};

export type QueryFilter = {
  field: string;
  op: string;
  value: any;
};

export type QueryPayload = {
  logic: Logic;
  filters: QueryFilter[];
};
