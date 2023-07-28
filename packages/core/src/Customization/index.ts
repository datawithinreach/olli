import { OlliDataset, OlliValue } from '../Types';
import { OlliSpec } from '../Types';
import { ElaboratedOlliNode, OlliNodeType } from '../Structure/Types';
import { getBins } from '../util/bin';
import { getDomain, getFieldDef } from '../util/data';
import { selectionTest } from '../util/selection';
import { fmtValue } from '../util/values';
import { FieldPredicate } from 'vega-lite/src/predicate';
import { LogicalComposition } from 'vega-lite/src/logical';

export function getCustomizedDescription(node: ElaboratedOlliNode) {
  function capitalizeFirst(s: string) {
    return s.slice(0, 1).toUpperCase() + s.slice(1);
  }

  function removeFinalPeriod(s: string) {
    if (s.endsWith('.')) {
      return s.slice(0, -1);
    }
    return s;
  }

  return (
    Array.from(node.description.values())
      .filter((s) => s.length > 0)
      .map(capitalizeFirst)
      .map(removeFinalPeriod)
      .join('. ') + '.'
  );
}

export function nodeToDescription(
  node: ElaboratedOlliNode,
  dataset: OlliDataset,
  olliSpec: OlliSpec
): Map<string, string> {
  const indexStr = `${(node.parent?.children.indexOf(node) || 0) + 1} of ${(node.parent?.children || []).length}`;
  const description = olliSpec.description || '';
  const chartType = () => {
    if (olliSpec.mark) {
      if (olliSpec.mark === 'point' && olliSpec.axes?.length === 2) {
        if (olliSpec.axes.every((a) => getFieldDef(a.field, olliSpec.fields).type === 'quantitative')) {
          return 'scatterplot';
        } else if (
          olliSpec.axes.find((a) => getFieldDef(a.field, olliSpec.fields).type === 'quantitative') &&
          !olliSpec.axes.find((a) => getFieldDef(a.field, olliSpec.fields).type === 'temporal')
        ) {
          return 'dotplot';
        }
      }
      if (olliSpec.mark === 'geoshape') {
          return 'geographic map'
      }
      return `${olliSpec.mark} chart`;
    } else {
      return 'dataset';
    }
  };
  const chartTypePrefix = (node: ElaboratedOlliNode): string => {
    if (node && 'groupby' in node && node.nodeType === 'root') {
      if (olliSpec.mark === 'line') {
        return 'multi-series ';
      } else {
        return 'multi-view ';
      }
    }
    return '';
  };
  const axes = olliSpec.axes.map((a) => a.title || a.field).join(' and ');
  const pluralize = (count: number, noun: string, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;

  function name(node: ElaboratedOlliNode): string {
    switch (node.nodeType) {
      case 'root':
        if ('groupby' in node) {
          return description;
        }
        if (olliSpec.mark) {
          return olliSpec.description || '';
        }
        return '';
      case 'facet':
        if ('predicate' in node && 'equal' in node.predicate) {
          return `titled ${node.predicate.equal}`;
        }
        return '';
      case 'xAxis':
      case 'yAxis':
      case 'legend':
      case 'detail':
        const guideType = node.nodeType === 'xAxis' ? 'x-axis' : node.nodeType === 'yAxis' ? 'y-axis' : node.nodeType ;
        return `${guideType} titled ${node.groupby}`;
      default:
        throw `Node type ${node.nodeType} does not have the 'name' token.`;
    }
  }

  function index(node: ElaboratedOlliNode): string {
    switch (node.nodeType) {
      case 'facet':
      case 'filteredData':
      case 'other':
        return indexStr;
      default:
        throw `Node type ${node.nodeType} does not have the 'index' token.`;
    }
  }

  function type(node: ElaboratedOlliNode): string {
    switch (node.nodeType) {
      case 'root':
        if ('groupby' in node) {
          return `a ${chartTypePrefix(node)}${chartType()}`;
        }
        if (olliSpec.mark) {
          return `a ${chartType()}`;
        }
        return 'a dataset';
      case 'facet':
        const facetName = olliSpec.mark === 'line' ? 'line' : olliSpec.mark ? chartType() : 'facet';
        return `a ${facetName}`;
      case 'xAxis':
      case 'yAxis':
      case 'legend':
      case 'detail':
        // const guideType = node.nodeType === 'xAxis' ? 'X-axis' : node.nodeType === 'yAxis' ? 'Y-axis' : 'Legend';
        if ('groupby' in node) {
          const fieldDef = getFieldDef(node.groupby, olliSpec.fields);
          if (fieldDef.type === 'quantitative' || fieldDef.type === 'temporal') {
            const guide =
              olliSpec.axes?.find((axis) => axis.field === node.groupby) ||
              olliSpec.legends?.find((legend) => legend.field === node.groupby) ||
              olliSpec.details?.find((detail) => detail.field === node.groupby);
            const bins = getBins(node.groupby, dataset, olliSpec.fields);
            if (bins.length) {
              return `for a ${'scaleType' in guide ? guide.scaleType || fieldDef.type : fieldDef.type} scale`;
            }
          } else {
            return `for a ${fieldDef.type} scale`;
          }
        }
        return '';
      default:
        throw `Node type ${node.nodeType} does not have the 'type' token.`;
    }
  }

  function children(node: ElaboratedOlliNode): string {
    switch (node.nodeType) {
      case 'root':
        if ('groupby' in node || (olliSpec.mark && olliSpec.axes?.length)) {
          return `with axes ${axes}`;
        }
        const fields = olliSpec.fields.map((f) => f.field);
        if (fields.length <= 3) {
          return ' ' + [...fields].join(', ');
        }
        return '';
      case 'facet':
        return `with axes ${axes}`;
      default:
        throw `Node type ${node.nodeType} does not have the 'children' token.`;
    }
  }

  function data(node: ElaboratedOlliNode): string {
    switch (node.nodeType) {
      case 'xAxis':
      case 'yAxis':
      case 'legend':
      case 'detail':
        // const guideType = node.nodeType === 'xAxis' ? 'X-axis' : node.nodeType === 'yAxis' ? 'Y-axis' : 'Legend';
        if ('groupby' in node) {
          const fieldDef = getFieldDef(node.groupby, olliSpec.fields);
          let first, last;
          if (fieldDef.type === 'quantitative' || fieldDef.type === 'temporal') {
            // const guide =
            //   olliSpec.axes?.find((axis) => axis.field === node.groupby) ||
            //   olliSpec.legends?.find((legend) => legend.field === node.groupby) ||
            //   olliSpec.details?.find((detail) => detail.field === node.groupby);
            const bins = getBins(node.groupby, dataset, olliSpec.fields);
            if (bins.length) {
              first = fmtValue(bins[0][0]);
              last = fmtValue(bins[bins.length - 1][1]);
              return `with values from ${first} to ${last}`;
            }
          } else {
            const domain = getDomain(node.groupby, dataset);
            console.log('node, domain, dataset', node, domain, dataset);
            if (domain.length) {
              first = fmtValue(domain[0]);
              last = fmtValue(domain[domain.length - 1]);
              return `with ${pluralize(domain.length, 'value')} from ${first} to ${last}`;
            }
          }
        }
        return '';
      case 'filteredData':
        if ('predicate' in node) {
          return predicateToDescription(node.predicate);
        }
        return '';
      case 'other':
        if ('groupby' in node) {
          return `grouped by ${node.groupby}`;
        } else if ('predicate' in node) {
          return predicateToDescription(node.predicate);
        }
      default:
        throw `Node type ${node.nodeType} does not have the 'data' token.`;
    }
  }

  function size(node: ElaboratedOlliNode): string {
    switch (node.nodeType) {
      case 'root':
        if ('groupby' in node) {
          return `with ${node.children.length} views for ${node.groupby}`;
        }
        if ((olliSpec.mark && olliSpec.axes?.length) || olliSpec.mark) {
          return '';
        }
        const fields = olliSpec.fields.map((f) => f.field);
        return `with ${fields.length} fields`;
      case 'filteredData':
        if ('predicate' in node) {
          const instructions = node.children.length ? '' : ' Press t to open table';
          const selection = selectionTest(dataset, node.fullPredicate);
          return `${pluralize(selection.length, 'value')}.${instructions}`;
        }
        return '';
      case 'annotations':
        return `${node.children.length} annotations`;
      case 'other':
        if ('groupby' in node) {
          return `${node.children.length} groups`;
        } else if ('predicate' in node) {
          const instructions = node.children.length ? '' : ' Press t to open table';
          const selection = selectionTest(dataset, node.fullPredicate);
          return `${pluralize(selection.length, 'value')}.${instructions}`;
        }
        return '';
      default:
        throw `Node type ${node.nodeType} does not have the 'size' token.`;
    }
  }

  const nodeTypeToTokens = new Map<OlliNodeType, string[]>([
    ['root', ['name', 'type', 'size', 'children']],
    ['facet', ['index', 'type', 'name', 'children']],
    ['xAxis', ['name', 'type', 'data']],
    ['yAxis', ['name', 'type', 'data']],
    ['legend', ['name', 'type', 'data']],
    ['detail', ['name', 'type', 'data']],
    ['filteredData', ['index', 'data', 'size']],
    ['annotations', ['size']],
    ['other', ['index', 'data', 'size']],
  ]);

  const tokenFunctions = new Map<string, Function>([
    ['name', name],
    ['index', index],
    ['type', type],
    ['children', children],
    ['data', data],
    ['size', size],
  ]);

  const resultDescription = new Map<string, string>();
  const tokens = nodeTypeToTokens.get(node.nodeType);
  if (tokens !== undefined) {
    for (const token of tokens) {
      const tokenFunc = tokenFunctions.get(token);
      if (tokenFunc !== undefined) {
        resultDescription.set(token, tokenFunc(node));
      }
    }
  }

  return resultDescription;
}

export function predicateToDescription(predicate: LogicalComposition<FieldPredicate>) {
  if ('and' in predicate) {
    return predicate.and.map(predicateToDescription).join(' and ');
  }
  if ('or' in predicate) {
    return predicate.or.map(predicateToDescription).join(' or ');
  }
  if ('not' in predicate) {
    return `not ${predicateToDescription(predicate.not)}`;
  }
  return fieldPredicateToDescription(predicate);
}

function fieldPredicateToDescription(predicate: FieldPredicate) {
  if ('equal' in predicate) {
    return `${predicate.field} equals ${fmtValue(predicate.equal as OlliValue)}`;
  }
  if ('range' in predicate) {
    return `${predicate.field} is between ${fmtValue(predicate.range[0])} and ${fmtValue(predicate.range[1])}`;
  }
  if ('lt' in predicate) {
    return `${predicate.field} is less than ${fmtValue(predicate.lt as OlliValue)}`;
  }
  if ('lte' in predicate) {
    return `${predicate.field} is less than or equal to ${fmtValue(predicate.lte as OlliValue)}`;
  }
  if ('gt' in predicate) {
    return `${predicate.field} is greater than ${fmtValue(predicate.gt as OlliValue)}`;
  }
  if ('gte' in predicate) {
    return `${predicate.field} is greater than or equal to ${fmtValue(predicate.gte as OlliValue)}`;
  }

  return '';
}
