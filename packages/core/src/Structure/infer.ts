import { olli } from '..';
import { OlliAxis, OlliDetail, OlliLegend, OlliSpec } from '../Types';
import { getFieldDef } from '../util/data';
import { OlliNode } from './Types';

export function inferStructure(olliSpec: OlliSpec): OlliNode | OlliNode[] {
  function nodesFromGuides(axes: OlliAxis[], legends: OlliLegend[], details: OlliDetail[]): OlliNode[] {
    let nodes: OlliNode[] = [];
    if (axes) {
      nodes = nodes.concat(
        axes.map((axis) => {
          return { groupby: axis.field, children: [] };
        })
      );
    }
    if (legends) {
      nodes = nodes.concat(
        legends.map((legend) => {
          return { groupby: legend.field, children: [] };
        })
      );
    }
    if (details) {
      nodes = nodes.concat(
        details.map((detail) => {
          return { groupby: detail.field, children: [] };
        })
      );
    }
    return nodes;
  }

  if (olliSpec.facet) {
    if (olliSpec.axes?.length || olliSpec.legends?.length || olliSpec.details?.length) {
      return {
        groupby: olliSpec.facet,
        children: nodesFromGuides(olliSpec.axes, olliSpec.legends, olliSpec.details),
      };
    } else {
      return {
        groupby: olliSpec.facet,
        children: olliSpec.fields
          .filter((f) => f.field !== olliSpec.facet)
          .map((f) => {
            return {
              groupby: f.field,
            };
          }),
      };
    }
  } else if (olliSpec.mark === 'line' && olliSpec.legends?.length) {
    const colorLegend = olliSpec.legends.find((legend) => legend.channel === 'color');
    if (colorLegend) {
      // multi-series line
      return {
        groupby: colorLegend.field,
        children: nodesFromGuides(
          olliSpec.axes,
          olliSpec.legends.filter((legend) => legend !== colorLegend),
          olliSpec.details
        ),
      };
    }
  } else if (olliSpec.mark === 'bar') {
    if (olliSpec.axes?.length) {
      const quantAxis = olliSpec.axes?.find((axis) => getFieldDef(axis.field, olliSpec.fields).type === 'quantitative');
      return nodesFromGuides(
        olliSpec.axes.filter((axis) => axis !== quantAxis),
        olliSpec.legends,
        olliSpec.details
      );
    } else {
      const quantField = olliSpec.fields.find((field) => field.type === 'quantitative');
      return olliSpec.fields
        .filter((field) => field !== quantField)
        .map((fieldDef) => {
          return {
            groupby: fieldDef.field,
            children: [],
          };
        });
    }
  } else if (olliSpec.axes?.length || olliSpec.legends?.length || olliSpec.details?.length) {
    return nodesFromGuides(olliSpec.axes, olliSpec.legends, olliSpec.details);
  } else {
    // TODO can try inferences with data mtypes
    // otherwise, just give all fields flat
    return olliSpec.fields.map((fieldDef) => {
      return {
        groupby: fieldDef.field,
        children: [],
      };
    });
  }
}
