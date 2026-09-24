# Future Phase 2.8 Notes

These are observations only. They are not Phase 2.7 acceptance defects or implementation requests.

- Preserve the approved future architecture: Map as Operations Command Center; Reporting as Analytics Workbench. No redesign was started during this UAT.
- Current Reporting passed the 9D workload, usage-readiness, provenance, and assignment/executor checks. Revisit information architecture only in the explicitly approved later phase.
- Map network connectivity/topology and disconnected electric/water visualization remain deferred. The frozen B2 geometry was not changed.
- The local UAT needed `ACTIVE_SCENARIO=tan-thuan-demo-v2` because the current default remains V1. A future scenario-selection/configuration discussion may improve operator clarity; this UAT only records the local precondition.
- At 1024px, dense Operations roster/table content uses contained horizontal scrolling; at 1366px the tested meter columns fit. This was usable and did not create page-level horizontal overflow.
- Real OCR inference should be qualified on a camera-enabled field device with an authentic meter image. No synthetic photo, GPS, forecasting, or leak diagnosis was introduced.

Do not begin Phase 2.8 from these notes without separate authorization.
