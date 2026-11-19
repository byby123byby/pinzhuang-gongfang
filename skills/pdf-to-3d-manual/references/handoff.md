# Minimal handoff contract

Use one versioned JSON document as the shared handoff. Adapt names to an existing project; do not create a general workflow engine merely to match this list.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | The actual local contract version |
| `product` | Exact product, article/variant, units, coordinate system and accuracy note |
| `sources` | PDF path/URL, SHA-256, page count, visible revision; product-page dimensions remain a separately named source |
| `evidence` | Stable evidence ID, source ID, one-based PDF page and concise observed claim; optional image region |
| `partTypes` | Name, printed hardware code or null, quantity, reusable-tool status, dimensional evidence, official image/crop references, visible identifying features and unknowns |
| `instances` | Stable ID, type ID, exported node name, explicit pose and installation evidence for position, contact face and direction; repeated physical items remain separate instances |
| `steps` | Printed step number, dependencies, instruction, PDF pages/evidence IDs, affected instances, tools, warnings, actions and detail camera |
| `unknowns` | Missing fact, affected field/step, impact and whether an illustrative result is acceptable |
| `validation` | Checks actually performed, result paths and validated model hash |

Use `observed`, `derived`, `illustrative` or `unknown` on dimensions and poses as appropriate. An unknown source dimension stays null even when an illustrative value is chosen for rendering. A rendered-page coordinate or normalized bounding box is evidence location, not a measured physical dimension.

For each part type, include a concise feature checklist tied to its official image: for example a curved outline, elongated slot, side hole, relief pattern, head recess or continuous screw thread when visible. Keep the expected feature and its source separate from the rendered result. Unknown measurements do not make an observed hole, cutout, head shape or surface feature optional. Geometry shared by repeated instances needs one full shape review; each installed instance still needs the correct position and orientation.

Record the relationship between the drawn view, the part's local axes, and the assembly coordinates. A part-list illustration is a view of a loose component, not a command to install it facing that camera. Establish contact faces, slot-facing direction and fastener insertion direction from the assembly diagram; preserve those relationships through working-pose rotations and the glTF conversion.

Check the final world-space working pose as well as local mating directions: if the diagram operates on the lower pair of legs with an upward face, test that the animated group places that pair below the other and its working-face normal upward. A self-consistent quaternion endpoint does not prove the source pose is correct.

The bundled viewer can show per-type source/render comparisons using `partTypes[].comparison` with `referenceImage`, `modelImage` (paths relative to public/) and `page`. Supply both actual images; keep official crops and actual model renders distinct. Inspect the final framing so complete part outlines and useful margins are visible.

For an animated hand tool, retain the step-specific source evidence, a separate asset/node, local tip origin and outward axis. `toolAssets` lists the GLB and node IDs; `action.tool` identifies the tool and either a template-local `contact`/`outward` or a screw-axis `tipOffset` measured from the drive socket plus illustrative `driveDistance`. Confirm overview tool lists against per-step diagrams. Test real exported tip/socket contact and withdrawal; a floating tool icon is insufficient.

For each action, keep the instance targets, start/end pose or offset, action kind, and whether the motion is illustrative. Use the same units throughout. A supported action vocabulary may be as small as `install`, `mark` and a group orientation for an initial product. Add a new action type only when a real step needs it, and implement its checks and renderer together.

Repeated `2x` instructions may mean reusing one template twice rather than receiving two templates. Distinguish consumable quantities from repetition counts. A list of permanent assembled items must exclude temporarily shown tools. Do not deduce missing official part codes from a model filename.

The checking agent receives the original pages and actual artifacts alongside this handoff. It should resolve a contested interpretation by locating the relevant diagram and inspecting it, rather than relying on consensus between agents. Record a correction once at the source contract, regenerate affected outputs, and retain the unresolved items explicitly.

The visual check record names the part type/instance, official page and crop, actual isolated render paths for multiple angles (including the reverse face), installed-view render, feature being checked, and observed result. Inspect the rendered features themselves; a list of correct nodes or collision-free meshes is not a substitute. Mark a missing source view or unresolved feature as unverified instead of claiming the whole component is faithful.

## Real execution record

Use `pending`, `running`, `needs_information`, `failed` and `succeeded` only for observed task states. Record the actual agent role/ID when available, input/output paths, contract version, known start/end times and validation result. Do not pre-populate successful states or infer that a host task finished because a progress animation reached 100%.

The Skill orchestrates work through the host agent. A future upload website requires a real server-side agent runner, authentication and task persistence; this Skill alone is not that service. Keep those additions outside the task unless requested.
