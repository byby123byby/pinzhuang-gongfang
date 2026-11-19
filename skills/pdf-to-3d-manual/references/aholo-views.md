# Aholo geometry in an assembly manual

For 拼装工坊, generate a real Aholo 3D source per distinct physical type, including preparation-only tools. Reuse that source for repeated instances. The understanding agent reads the inventory and working-step diagrams together, identifies functional faces, contact direction and asymmetric landmarks, and chooses the input views. Make those decisions automatically unless the current request explicitly asks for approval of the art.

## Choose the views

Select the smallest set that explains the visible geometry and actual mating operation. Let the feature determine the camera relative to the part. One clear three-quarter view can describe a simple solid. For multiple planes or hidden features, start with an identifying oblique view, then add the views needed to expose what it hides.

| Evidence in the PDF | What the additional camera should show |
|---|---|
| A locator strip with cutouts, an end hook and a small marking hole | Look perpendicular to the perforated face for the openings, then low along the strip for its thickness and hook orientation. Keep the hooked end on the same side across views. |
| A bent angle bracket | Look normal to the slotted flange, normal to the mounting foot and obliquely across the bend to relate the two. Consider a low profile or reverse view if the bend or handedness is still ambiguous. |
| A screw with a drive recess or a shaped tool tip | Show the side profile and thread or taper, then look down the drive axis to see the recess or tip. A mating hole on the reverse of a panel needs a view of that face. |

Mark expected features with original PDF pages. Render distinct colour views from one frozen Blender asset with fixed physical dimensions and consistent colour and lighting. Keep ordinary comparison views at a common camera scale. For an axial tool view with a tiny working end, frame the complete projected end profile and record the change of framing. Inspect the renders for cropped tips, blocked openings, mirrored landmarks and insufficient contrast. Unknown colours or dimensions are illustrative. Store the ordered plan as JSON. Paths are relative to the plan file. Example of a three-input plan:

```json
{"parts":{"bracket":{"sourcePages":[3,6],"features":["bend","slot","foot hole"],"fitChecks":["Fastener follows the indicated slot axis; driver engages its matching recess"],"views":[
  {"id":"oblique","image":"bracket/oblique.png","shows":["bend"]},
  {"id":"flange-normal","image":"bracket/flange.png","shows":["slot"]},
  {"id":"foot-normal","image":"bracket/foot.png","shows":["foot hole"]}
]}}}
```

Record expected application checks in `fitChecks`. An empty list is appropriate for preparation-only tools. Include an entry for every type in a new run, including types that need only one view. Use `scripts/aholo_views.py` in the geometry generation entry point. `read_view_plan(path)` checks the local files and feature coverage. Pass each part's ordered paths to `image_payload(paths, upload_or_cached_url, version=..., faceCount=..., outputFormat=..., aiPredictSize=False, region=...)` using the installed Aholo runtime. One view maps to `img` and multiple views map to `imgs` in their given order. Supply the identical body to quote and creation. Preserve the original run's view plan, upload receipts, source images and task ID. Use the active authorization and available budget for the quote. Record a local-only run as such.

## Independently verify fit

The checking agent reads the PDF and inspects the downloaded mesh itself. Register the rendered views with the same landmarks and working orientation. Compare the source page and model for every expected opening, bend or lip, including which face it is on. Check aperture centers relative to the part length and nearest edges, silhouette, separation, through-passage and hook direction. A topological hole count alone cannot locate a marking hole. Separate inferred proportions and chosen visualization tolerances from documented dimensions.

For each tool interaction, record the source page, step, instance, expected contact, approach axis, engagement interval and tested asset hash. Check the real tip and real aperture or recess in the animated world pose. For a marking template, confirm the shaft passes through the named opening and its tip reaches the surface behind. For a bracket, inspect the screw passing through the correct flange and the driver reaching its recess along the screw axis. Check the approach and withdrawal for penetration into the surrounding solid. Compare the relevant tip/shaft cross-section to the free aperture or drive profile when the geometry permits. A shared coordinate, ray hitting the mesh somewhere, or endpoints alone cannot establish clearance. Record the sampled poses and tolerances, untested continuous clearance, or unresolved real-world fit explicitly. Preparation-only tools retain their appearance review with the action check marked inapplicable.

## Choose and present the reviewed asset

Keep the original Aholo output and task ID. Inspect each type against the specific identifying landmarks from its PDF inventory and working steps. A filled positioning hole, merged windows, blunt double-ended stud or missing Phillips wings changes how a user identifies or uses the part. When a critical feature fails, rebuild or select the calibrated geometry, transfer the Aholo finish to that mesh and check the feature again. If the source improves under multiple views, review the actual result before choosing it. Appearance and functional fit have separate outcomes. Keep any unverified geometry out of the working action until the corrected pair passes the contact check.

For each displayed type record the accepted GLB path and hash, source generation task, material task and any local corrections. Render its card poster from that exact GLB. Use the same accepted asset, colour, orientation and useful framing across the preparation card, the current step's identification panel and the inventory comparison beside the original drawing. Confirm the assembly stage shows the corresponding working geometry and finish. Preserve the original artwork in the production record. For a Cycles poster and a WebGL viewer, use the same neutral studio HDR, work-face camera, framing and AgX tone mapping. Record the studio file hash with each poster. Check both sides of an asymmetric part; a matching outline can still show a mirrored hole pattern if the camera looks from the back.

Make the model directly rotatable and zoomable inside each identification card. Opening a preparation item or step item should immediately activate its view. A comparison can initially show its matching poster, then activate in place on pointer or keyboard interaction. Reuse a renderer across cards and restore the correct poster to the previous card. For identifying details smaller than the grip, such as a driver or awl tip, provide a close view of the actual working end and a way back to the complete tool. Frame the cross recess or point in inspection and retain the checked tool tip and axis in animated use. When two different ends explain the tool, such as a hammer’s striking face and split pulling claw, give each its own view of the accepted mesh and inspect both in the shipped browser.

Test the shipped browser entry. Open every preparation item, each step's available items and each inventory comparison; match the decoded model URL to the reviewed model and its poster. On representative cards of each kind exercise real drag and zoom and observe changed image content. Check full-tool and working-end views for both recognizability and visible geometric detail. Exercise touch input in the narrow layout and keyboard activation on an inactive comparison. Confirm the shipped viewer loaded the recorded HDR. Capture the actual inactive poster and the live GLB at the same camera, compare their silhouette and finish, then rotate the actual mesh to inspect through-holes and tool contact. Add a work-face preset where a numbered opening pattern depends on viewing side. Record the real model hashes and screenshots of the checked frames.
