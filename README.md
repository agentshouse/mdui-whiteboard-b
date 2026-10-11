# whiteboard-b

Separate House App using actual MIT Quickdraw core, UI, styles, selection and history at quickdrawjs/quickdraw@1eba78b46f19ac0fa71454494a7bda47d4df7e47. It does not replace whiteboard-a (Excalidraw). The eight existing Excalidraw documents remain unchanged, including the separately labeled original-App QA document.

## Scope

Real donor freehand/highlighter/eraser, line/arrow, geometric shapes, text/sticky notes, selection, duplicate, undo/redo, pan/zoom, theme/grid/style panels, shortcuts and local PNG export. Native House shell adds drawing selection, search, New, raw title and JSON source, reversible archive, and explicit Save. The donor watermark is disabled using its documented option. System clipboard and image import/drop/paste are removed: this bounded version has no media-storage bypass or implied attachment support. Existing drawing content is not reinterpreted in place.

All UI and code load eagerly. Query /title uses current JSONPointer syntax. Only connectHouseBridge().runtime supplies document/Draft storage. Meaningful edits, including incomplete JSON/title, stage in the drawing’s actual Room Draft. Save queues the exact observed revision; locally queued and provider accepted are distinct. Failed local input remains visible and retries with the next edit. Uncertain Save is not blindly retried. Same-browser CAS preserves first field bases and disjoint fields; drawing record merge preserves unrelated records, later input wins overlapping records. Returned metadata remains available. Provider hold permits native local Save; lost reach/storage blocks dependent writes. No browser-storage fallback, recovery documents or REST/page fetching.

## Shared Room, distinct format

Both Apps bind r_16.q. Quickdraw uses an additive quickdraw_drawing type in quickdraw/, because Excalidraw Scene and Quickdraw record maps are different formats. The existing drawing type/schema and all original documents are preserved. New sample documents are separately adapted copies of the same seven MIT Excalidraw library examples used by whiteboard-a, enabling comparable drawing tasks without inventing demo data.

All 41 original elements and their original metadata are retained. Rectangles/ellipses/diamonds become native geo records; polylines become native draw strokes with preserved vertices. Native palette/width/fill styling is approximated; group metadata is retained as sourceElement but not interpreted. This is not lossless visual rendering or bidirectional cross-editor editing. Full provenance, original source, deterministic seed payload and notices are in samples/ and licenses/.

## Comparison procedure

Open each App on Donor library example 1, then example 6. Compare fit-to-content, drawing/selection/move/style/undo, title edit, native Draft reload, explicit Save, and PNG export. Work on a separately created QA drawing when testing writes; do not alter original licensed examples solely for QA. Report actual hosted behavior separately from local engine tests. Root owns the first-page/browser check. No full browser acceptance is claimed by this source.

## Build and checks

Node >=24.21.0. npm ci --ignore-scripts --no-audit --no-fund; npm run typecheck; npm run lint; npm test; npm run build; npm run release:check. Final clean gates use ../../porting-heavy-build.lock. Source/main is complete source; release is a parentless built tree. First App publication uses a shallow transport preserving the exact source commit. Public GitHub repositories are Master-owned.

Upstream original and adapted core files are separately vendored. Source hashes and dependency notices are validated during build. Tests include actual donor store/geometry/freehand/palette/shapes/editor tests, real donor UI mounting, native Draft/reload/failed-input/CAS/provider-hold and merge regressions. Mocked browser tests are not hosted acceptance.
