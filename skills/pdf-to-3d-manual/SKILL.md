---
name: pdf-to-3d-manual
description: Turn a product's PDF assembly instructions into an evidence-linked, interactive 3D manual using coordinated understanding, modeling, and independent checking agents. Use for PDF-to-3D assembly workflows and reusable agent production chains, not ordinary PDF summaries or free-form model generation.
---

# PDF to 3D Assembly Manual

Deliver a working manual whose actions can be traced to the supplied PDF, plus editable models and the actual production record. A PDF may explain assembly without specifying enough geometry for an engineering-accurate model. Separate source facts from illustrative reconstruction throughout.

For a 拼装工坊 furniture manual, use the current academy workspace’s `work/academy/manual-design.md` from the first version of the current product. The LACK layout is the approved baseline, and `work/academy/manual.css` supplies the shared styles. Bind the new inventory, branches and 3D scene to that layout. Compare the actual preparation page, workbench and part viewer with LACK at matching desktop and mobile viewports before release. A source-reading study is an intermediate handoff when the user requested the full production chain.

When publishing inside 拼装工坊, apply the catalogue and collection section of the same design guide. Photograph the approved assembled geometry on transparent film, including visibly different route variants. Use the shared local collection module for first completion, returning to a finished object, and resuming at a missing required step. Verify the actual player and persisted album in a fresh browser with the academy's `work/academy/verify_collection.py` and extend its cases when adding a product.

## 1. Prepare the source

Preserve the user's product and variant. Record the PDF source, revision when visible, and file hash; do not mix hardware or steps from another revision. Use a new run directory and the local entry script:

```sh
python3 scripts/prepare_pdf.py /absolute/path/manual.pdf /absolute/path/run/input --revision AA-123456-1
```

Resolve `scripts/prepare_pdf.py` from this Skill directory. Omit `--revision` if not established. The script requires PyMuPDF (`fitz`), copies the PDF, renders every page, extracts embedded text, and writes `manifest.json`. It does not perform OCR, interpret diagrams, or generate a 3D model. Use the host's existing PDF runtime when the active Python lacks PyMuPDF; do not silently install a new toolchain.

Inspect all rendered pages, including warnings and parts pages. Text extraction alone is insufficient for arrows, handedness, repeated actions, and fastener silhouettes. Distinguish PDF page indices from printed step numbers.

## 2. Delegate real work

Use the host's available subagent tools for this workflow. Keep a shared run directory and give each agent an exclusive output directory. Inherit the current host model unless the user has selected another available model; do not label a run with models that were never invoked.

| Role | Required input | Concrete output |
| --- | --- | --- |
| Understanding agent | Original PDF and every rendered page | Evidence by page; part types, quantities and instances; reusable tools; original step order; warnings; missing facts |
| Modeling agent | Frozen evidence and shared contract | Parameterized construction script, named independent meshes, GLB and editable source; explicit illustrative geometry parameters |
| Independent checking agent | Original PDF, shared contract, actual exported model and actions | Evidence-backed defects or acceptance, with affected page/step/instance and checks actually performed |
| Main agent | All outputs and actual task results | Resolved contract, running viewer, real browser checks, package and concise limitations |

The understanding stage precedes modeling. An agent may propose a correction, but the main agent resolves conflicts against the original source before downstream work proceeds. The checking agent must inspect the PDF and exported artifacts itself, not merely approve another agent's summary. Route a failed check to the responsible agent, then recheck the changed behavior.

When subagents are unavailable, perform the roles serially and identify the review as a serial self-check. Do not invent independent reviews, task IDs, model calls, or completion events. Record real role, input/output paths, observed status and known timestamps in `run.json`; omit unknown timestamps. A webpage upload control does not itself run these agents.

## 3. Freeze the handoff

Before modeling, define the smallest shared contract needed by this product. Read [the handoff reference](references/handoff.md). Separate part types, physical instances, reusable tools, and steps: one step may affect several instances, and the same tool or part may reappear later.

Preserve observed values, derived values, illustrative values and unknowns distinctly. Product-envelope dimensions do not establish board thickness, screw length, hole positions or thread pitch. Keep unknown source dimensions null; put chosen visualization estimates in separate illustrative fields. If an unresolved fact changes hardware identity, joint direction, assembly order or a warning, pause that affected instruction and obtain clearer evidence. A decorative or proportion uncertainty may remain explicitly illustrative.

Do not add operations based only on what seems mechanically plausible. Magnify ambiguous diagram regions and resolve them from the original page or additional product-specific evidence.

For every part type, retain the official part drawing or product-specific image crop and list its visible identifying features: outline, openings and slots, bends, surface relief, screw head/drive, tip and thread form where shown. Unknown dimensions permit explicitly estimated proportions; they do not justify omitting visible features or substituting a generic primitive for a recognizably different component.

## 4. Model and animate

Prefer parameterized Blender/CAD construction for regular boards, legs, fasteners and joints. Share geometries where appropriate, while keeping every physical instance addressable by a stable ID. Use explicit units and one documented coordinate conversion to glTF.

Distinguish the part-list drawing's viewing direction, the assembly step's working orientation, and the model's coordinates. Use the source assembly diagram to establish position, contact face and installation direction before converting coordinates. Do not mirror a part or reverse a slotted face merely to match its silhouette on the page. Render the individual component from multiple angles, including the opposite face, and check its installed orientation after group and export transforms.

For 拼装工坊 or a manual using Aholo assets, apply the [adaptive view and contact review](references/aholo-views.md) from evidence extraction through delivery. The understanding agent selects the necessary viewpoints per part, the modeling agent prepares ordered Blender renders for actual Aholo image-to-3D geometry, and the independent checker verifies the returned mesh and working tool interaction against the PDF. Use the installed Aholo execution workflow and current spending authorization. Keep undocumented physical dimensions illustrative.

Represent tools only in the steps that actually use them. A tool shown in the preparation list does not authorize an invented operation. Distinguish hand assembly, marking, driving and supporting/protective surfaces. Use separate reusable hand-tool assets, not extra permanent product parts. Anchor the actual tool tip to the actual marking hole or drive socket; show approach, contact/work and withdrawal, and verify contact after world-space group transforms.

Keep source steps intact. Describe the physical action, its direction and any preparation or caution the assembler needs in each visible step. Keep modeling assumptions, playback behavior, collision checks and production evidence in the review record. Retain access to the source page beside each step. Support only the motions this product needs: multiple fasteners, reusable marking tools, rotating an already assembled group, and returning to earlier steps when present. Model those as actions instead of assuming step N means part N. Preserve the PDF's working orientation; a convenient camera angle is not a substitute for an instructed flip. Animation turn counts and paths are illustrative unless the source establishes them.

For an initial rigid-assembly viewer, use the tested starter in `assets/viewer/`. Supply `public/manifest.json`, its `modelFile` GLB, and `public/references/manual.pdf` plus `page-N.png` rendered pages. Adapt the example product text in HTML; runtime names, dimensions, step and part counts come from the manifest. The viewer supports a clickable expanded detail view with independent orbit/zoom, playback/scrubbing and x-ray. It can load separate `toolAssets` and use per-action tool/contact metadata for a marked awl or a screwdriver. Preserve all corresponding HTML controls when reusing the viewer. The implemented actions are `install` and `mark`, with `inverted`, `sideA`, `sideB` and upright group poses. Inspect the actual template before expanding its action vocabulary; it is a starter, not a universal PDF converter.

## 5. Check and deliver

- Compare quantities, identifiers, tools, warnings and every step with original PDF pages.
- Independently compare every part type's actual isolated multi-angle renders with its official source image, then compare its installed position and direction with the relevant assembly diagram. Record the source page/crop, rendered image paths, specific feature and pass/fail result. Node counts, dimensions and collision checks cannot establish appearance or structural-feature fidelity; a mismatch must be repaired or explicitly left unresolved.
- Inspect the actual GLB's instance names, geometry, scale and documented dimensions. Check action endpoints, re-entry to a step, and assembly-group transforms. State the tested range of collision checks; sampled paths do not prove continuous clearance.
- In the real viewer, verify loading, complete playback, pause, scrub, previous/next, jump to a step, selection, rotation and local detail views as implemented. Each step must link to its source PDF page or rendered page.
- Make physical part identification clear through hardware code, quantity, and a directly rotatable identification card in preparation, steps and inventory comparisons. Use matching work-face cameras, the same studio HDR and AgX for the Cycles poster and live GLB. Compare real frames from both. For hand tools, give the user a close working-end view. Claim screen-size 1:1 only when the real dimension is known and the display has been calibrated; zooming alone is not 1:1.
- Keep agent logs, missing-data diagnostics and development details in the production record. The assembly interface should show actionable instructions and the accuracy limitations relevant to its user.

Deliver the runnable viewer, final model, editable project, construction script, contract, source references and verification record. Keep an existing manual or prototype intact when creating a new product. Report what the actual run established, which measurements remain illustrative, and whether physical assembly was tested. Do not present a single successful example as a universal unattended PDF conversion service.
