import type { FilterRowState, QueryPayload, Logic } from './types';

/**
 * Convertit les lignes de filtre UI en payload pour l'API.
 * Ignore les filtres sans valeur (sauf opérateurs isNull/isNotNull).
 */
export function serializeToPayload(
  rows: FilterRowState[],
  logic: Logic
): QueryPayload {
  const filters = rows
    .filter((r) => {
      if (r.op === 'isNull' || r.op === 'isNotNull') return true;
      if (r.value === undefined || r.value === null || r.value === '') return false;
      if (Array.isArray(r.value) && r.value.length === 0) return false;
      return true;
    })
    .map((r) => {
      let value = r.value;

      // Date between → tableau [start, end]
      if (r.op === 'between' && Array.isArray(value)) {
        value = value.filter((v: any) => v !== '' && v != null);
        if (value.length < 2) return null;
      }

      return { field: r.field, op: r.op, value };
    })
    .filter(Boolean) as QueryPayload['filters'];

  return { logic, filters };
}
