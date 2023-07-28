import { FieldPredicate } from 'vega-lite/src/predicate';
import { LogicalAnd } from 'vega-lite/src/logical';

/**
 * Node types describing an Olli tree structure
 */
export interface OlliGroupNode {
  groupby: string;
  children?: OlliNode[];
}

export interface OlliPredicateNode {
  predicate: FieldPredicate;
  children?: OlliNode[];
}

export interface OlliAnnotationNode {
  annotations: OlliNode[];
}

export type OlliNode = OlliGroupNode | OlliPredicateNode | OlliAnnotationNode;

export type OlliNodeType = 'root' | 'facet' | 'xAxis' | 'yAxis' | 'legend' | 'detail' | 'filteredData' | 'annotations' | 'other';

export interface ElaboratedOlliNode {
  id: string;
  nodeType: OlliNodeType;
  fullPredicate: LogicalAnd<FieldPredicate>;
  parent?: ElaboratedOlliNode;
  children: ElaboratedOlliNode[];
  groupby?: string;
  predicate?: FieldPredicate;
  description: Map<string, string>;
}

export type OlliNodeLookup = { [id: string]: ElaboratedOlliNode };
