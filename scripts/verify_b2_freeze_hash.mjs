import crypto from 'crypto';
import { LAYOUT_B2, LAYOUT_B2_COORDS, RECOMMENDED_LAYOUT_KEY } from '../frontend/src/components/map-v2/utilityDemoLayout.ts';

const b2Data = JSON.stringify({
  coords: LAYOUT_B2_COORDS,
  nodes: LAYOUT_B2.nodes.map(n => ({ id: n.id, x: n.displayX, y: n.displayY, role: n.nodeRole, meter: n.meterCode })),
  edges: LAYOUT_B2.edges.map(e => ({ id: e.id, src: e.sourceNodeId, tgt: e.targetNodeId, path: e.displayPath, tier: e.routeTier }))
});
const hash = crypto.createHash('sha256').update(b2Data).digest('hex');
console.log('RECOMMENDED_LAYOUT_KEY:', RECOMMENDED_LAYOUT_KEY);
console.log('FROZEN B2 CONFIG SHA256:', hash);
console.log('B2 NODES COUNT:', LAYOUT_B2.nodes.length);
console.log('B2 EDGES COUNT:', LAYOUT_B2.edges.length);
