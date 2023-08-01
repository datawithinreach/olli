import { isDate, toNumber, isArray, inrange } from 'vega';
import { LogicalAnd, LogicalComposition } from 'vega-lite/src/logical';
import { FieldPredicate, FieldEqualPredicate } from 'vega-lite/src/predicate';
import { OlliFieldDef, OlliDataset, OlliDatum, OlliValue, OlliSpec } from '../Types';
import { serializeValue } from './values';
import { getDomain, getFieldDef } from './data';
import { getBinPredicates } from './bin';

const TYPE_ENUM = 'E',
  TYPE_RANGE_INC = 'R',
  TYPE_RANGE_EXC = 'R-E',
  TYPE_RANGE_LE = 'R-LE',
  TYPE_RANGE_RE = 'R-RE',
  TYPE_PRED_LT = 'LT',
  TYPE_PRED_LTE = 'LTE',
  TYPE_PRED_GT = 'GT',
  TYPE_PRED_GTE = 'GTE',
  TYPE_PRED_VALID = 'VALID',
  TYPE_PRED_ONE_OF = 'ONE';

export const predicateToTupleType = (predicate: FieldPredicate) => {
  if ('equal' in predicate) {
    return TYPE_ENUM;
  } else if ('lt' in predicate) {
    return TYPE_PRED_LT;
  } else if ('gt' in predicate) {
    return TYPE_PRED_GT;
  } else if ('lte' in predicate) {
    return TYPE_PRED_LTE;
  } else if ('gte' in predicate) {
    return TYPE_PRED_GTE;
  } else if ('range' in predicate) {
    if ((predicate as any).inclusive) {
      return TYPE_RANGE_INC;
    }
    return TYPE_RANGE_RE;
  } else if ('oneOf' in predicate) {
    return TYPE_PRED_ONE_OF;
  } else if ('valid' in predicate) {
    return TYPE_PRED_VALID;
  }
  return 'E';
};

export interface SelectionStore {
  unit: string;
  fields: { type: string; field: string }[];
  values: (OlliValue | [number, number])[];
}

export function predicateToSelectionStore(predicate: LogicalComposition<FieldPredicate>): SelectionStore {
  if (predicate) {
    const getPredValue = (p: FieldPredicate): OlliValue | [number, number] => {
      const key = Object.keys(p).find((k) => k !== 'field')!; // find the value key e.g. 'eq', 'lte'
      const value = p[key];
      return value;
    };
    if ('and' in predicate) {
      const and = predicate.and;
      const stores = and.map((p) => predicateToSelectionStore(p));
      const tuple_fields = stores.flatMap((store) => {
        return store?.fields || [];
      });
      const tuple_values = stores.flatMap((store) => {
        return store?.values || [];
      });
      return {
        unit: '',
        fields: tuple_fields,
        values: tuple_values,
      };
    } else if ('or' in predicate) {
      const or = predicate.or;
      // TODO this would likely require changes to vega.
    } else if ('not' in predicate) {
      const not = predicate.not;
      // TODO same as above
    } else {
      // predicate is FieldPredicate
      const tuple_fields = [
        {
          type: predicateToTupleType(predicate),
          field: predicate.field,
        },
      ];
      const tuple_values = [getPredValue(predicate)];
      if (!tuple_fields.length && !tuple_values.length) {
        return null;
      }
      return {
        unit: '',
        fields: tuple_fields,
        values: tuple_values,
      };
    }
    // if (!tuple_fields.length && !tuple_values.length) {
    //   return null;
    // }
  }
}

export function selectionTest(data: OlliDataset, predicate: LogicalComposition<FieldPredicate>): OlliDataset {
  try {
    const store = predicateToSelectionStore(predicate);
    if (!store) return data;
    return data.filter((datum) => {
      return testPoint(datum, store);
    });
  } catch (e) {
    console.error(e);
    return data;
  }
}

function testPoint(datum: OlliDatum, entry: { unit?: string; fields: any; values: any }) {
  var fields = entry.fields,
    values = entry.values,
    dval;

  return fields.every((f: { field: string | number; type: any }, i: string | number) => {
    dval = datum[f.field];

    if (isDate(dval)) dval = toNumber(dval);
    if (isDate(values[i])) values[i] = toNumber(values[i]);
    if (isDate(values[i][0])) values[i] = values[i].map(toNumber);

    switch (f.type) {
      case TYPE_ENUM:
        // Enumerated fields can either specify individual values (single/multi selections)
        // or an array of values (interval selections).
        return !(isArray(values[i]) ? values[i].indexOf(dval) < 0 : dval != values[i]);
      case TYPE_RANGE_INC:
        return inrange(dval as number, values[i], true, true);
      case TYPE_RANGE_RE:
        // Discrete selection of bins test within the range [bin_start, bin_end).
        return inrange(dval as number, values[i], true, false);
      case TYPE_RANGE_EXC: // 'R-E'/'R-LE' included for completeness.
        return inrange(dval as number, values[i], false, false);
      case TYPE_RANGE_LE:
        return inrange(dval as number, values[i], false, true);
      case TYPE_PRED_LT:
        return dval < values[i];
      case TYPE_PRED_GT:
        return dval > values[i];
      case TYPE_PRED_LTE:
        return dval <= values[i];
      case TYPE_PRED_GTE:
        return dval >= values[i];
      case TYPE_PRED_VALID:
        return !(dval === null || isNaN(dval as number));
      default:
        return true;
    }
  });
}

export function datumToPredicate(datum: OlliDatum, fieldDefs: OlliFieldDef[]): LogicalAnd<FieldEqualPredicate> {
  return {
    and: fieldDefs.map((fieldDef) => {
      return {
        field: fieldDef.field,
        equal: serializeValue(datum[fieldDef.field], fieldDef),
      };
    }),
  };
}

export function fieldToPredicates(field: string, data: OlliDataset, fields: OlliFieldDef[]): FieldPredicate[] {
  const fieldDef = getFieldDef(field, fields);
  if (fieldDef.type === 'nominal' || fieldDef.type === 'ordinal') {
    const domain = getDomain(field, data);
    return domain.map((value) => {
      return {
        field: field,
        equal: serializeValue(value, fieldDef),
      };
    });
  } else {
    const bins = getBinPredicates(field, data, fields);
    return bins;
  }
}
