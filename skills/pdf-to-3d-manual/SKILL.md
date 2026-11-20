---
name: pdf-to-3d-manual
description: Turn a product's PDF assembly instructions into an evidence-linked, interactive 3D manual using coordinated understanding, modeling, and independent checking agents. Use for PDF-to-3D assembly workflows and reusable agent production chains, not ordinary PDF summaries or free-form model generation. 将产品 PDF 转为可追溯的交互式 3D 装配说明书，涵盖读图、建模与独立复核。
---

# 拼装工坊 · PDF 转 3D 装配说明书 / PDF to 3D Assembly Manual

[中文操作指南](#中文操作指南) · [English instructions](#english-instructions)

给读图、建模和复核 Agent 同一份宜家说明书，最后交付一套可以转动、暂停、放大连接处的装配演示。下图取自 IVAR 双门柜第 17 页的挂门案例。

The reading, modeling and review agents work from the same source manual. The resulting guide lets an assembler rotate the model, pause a step and inspect a joint. This example follows the door hinge on page 17 of the IKEA IVAR manual.

| 原册动作 · Source diagram | 装配特写 · In the 3D guide |
| --- | --- |
| ![原册图示：铰链套过钉头 / Manual diagram showing the hinge fitting over the screw head](https://pinzhuang-gongfang.pages.dev/report/media/manual-step-1.webp) | ![装配复核：十字刀头对准螺钉 / Checking the screwdriver tip against the hinge screw](https://pinzhuang-gongfang.pages.dev/report/media/hinge-contact.webp) |

[产品说明与创作记录 / Product story](https://pinzhuang-gongfang.pages.dev/report-motion/) · [试装柜门铰链 / Try the hinge](https://pinzhuang-gongfang.pages.dev/ivar/?route=wall&resume=8) · [观看成品短片 / Watch the cabinet film (MP4)](https://pinzhuang-gongfang.pages.dev/report-motion/media/hero.mp4)

## 中文操作指南

交付一份可运行的交互式装配说明书、可编辑的模型和本次制作记录。每个动作都应能追溯到用户提供的 PDF。说明书能说明装法，却未必给足工程建模所需的尺寸。制作时分别记录原图事实与示意重建。

制作拼装工坊的家具说明书时，从第一版就使用当前项目的 `work/academy/manual-design.md`。以 LACK 茶几的版式为基准，复用 `work/academy/manual.css`，把新产品的清单、装配路线和 3D 场景接入同一套界面。发布前，在相同的桌面和手机视口下，逐一对照 LACK 的准备页、装配台和零件查看器。用户要求完整制作时，读图分析只是交接环节。

发布到拼装工坊时，按同一设计指南制作作品目录和收藏页。用验收后的成品模型渲染透明背景封面，外形明显不同的装法分别出图。复用本地收藏模块，处理首次完成、重新查看成品，以及从尚未完成的必要步骤续装。新增产品时扩充 `work/academy/verify_collection.py` 的用例，用全新浏览器会话验收实际播放器和持久化收藏。

### 1. 准备原始说明书

确认产品及具体款型，记录 PDF 来源、可辨认的修订号和文件哈希。五金和步骤都取自同一版本。新建本次运行目录，在 Skill 目录下执行：

```sh
python3 scripts/prepare_pdf.py /absolute/path/manual.pdf /absolute/path/run/input --revision AA-123456-1
```

修订号未知时省略 `--revision`。脚本用 PyMuPDF（`fitz`）复制 PDF、逐页渲染、提取内嵌文字并写出 `manifest.json`。它不做 OCR、图解判断或三维建模。当前 Python 缺少 PyMuPDF 时，优先用宿主已有的 PDF 运行环境，避免静默安装另一套工具链。

检查每张渲染页，包括警示和零件清单。回到图中辨认箭头、左右件、重复次数和紧固件轮廓，并分别记录 PDF 页码和印刷步骤号。

### 2. 按角色分工

使用宿主提供的子 Agent 工具，共享同一个运行目录，各角色分别写入自己的输出目录。默认继承当前宿主模型；用户指定其他可用模型时按其选择执行。记录实际调用的模型。

| 角色 | 输入 | 交付物 |
| --- | --- | --- |
| 读图 Agent | 原始 PDF、全部渲染页 | 逐页依据、零件类型和实例、数量、可复用工具、原始顺序、警示及缺失信息 |
| 建模 Agent | 已确认的读图依据和交接约定 | 参数化构建脚本、独立命名网格、GLB、可编辑源文件，以及明确标注的示意参数 |
| 独立检查 Agent | 原始 PDF、交接约定、实际导出模型和动作 | 有依据的缺陷或验收结论，写明相关页、步骤、实例和实际执行的检查 |
| 主 Agent | 各角色输出及实际任务结果 | 已解决分歧的交接约定、可运行的查看器、浏览器实测、交付包和已知限制 |

先读图，再建模。发现分歧时，由主 Agent 回到原始资料裁定，再交给下游。检查者亲自核对 PDF、导出模型和动作；检查失败就交回负责的角色修复，并复验受影响的行为。

宿主无法开启子 Agent 时，可依次完成这些角色，在记录中注明“串行自检”。在 `run.json` 写下实际角色、输入输出路径、观察到的状态和已知时间。没有发生的独立评审、任务编号、模型调用或完成事件不能记入记录。网页上的上传控件本身不会启动这条生产流程。

### 3. 确定交接约定

建模前只约定本产品用得到的数据。区分零件类型、实物实例、可复用工具和步骤。一步可能影响多个实例，同一件工具或零件也可能跨步出现。[交接格式与字段](references/handoff.md)

分开记录直接观察值、推导值、示意值和未知值。整件家具的外尺寸无法确定板厚、螺钉长度、孔位或螺距。原始尺寸未知就保留 `null`，另设字段记录绘制时选取的示意尺寸。如缺失信息会改变五金身份、连接方向、装配顺序或警示内容，暂停受影响的指令并补找依据。装饰和比例可在标明示意后继续。

遇到含糊的局部，放大原页或查找同一产品的额外资料。不能仅凭机械常识添加装配操作。每种零件都保留官方图或产品专属裁图，记录可见的轮廓、开孔、长槽、折边、表面起伏，以及图中能辨认的螺钉头、驱动槽、尖端和螺纹。比例可以估算，清楚可见的结构仍须逐项还原。

### 4. 建模与编排动作

规整的板件、桌腿、紧固件和连接处优先采用参数化 Blender 或 CAD 构建。相同零件可共享几何体，每个实物实例仍要有稳定 ID。明确单位，并记下转换到 glTF 坐标系的方法。

分别确认清单图的观察方向、装配步骤中的工作朝向、模型坐标。先从装配图确定位置、接触面和安装方向，再做坐标转换。只为贴合纸上的轮廓而镜像零件或颠倒带槽面，会导致装反。用包括背面在内的多视图检查单件，再检查组合变换和导出后的安装朝向。

拼装工坊或采用 Aholo 资产的项目，从读图到交付均使用[自适应选视角与接触检查](references/aholo-views.md)。读图 Agent 逐件决定需要哪些角度，建模 Agent 在 Blender 准备有顺序的参考渲染图，交给 Aholo 的图生 3D 流程得到真实网格。独立检查者对照 PDF 检查回传网格及工具的实际接触。使用已安装的 Aholo 流程和现有费用授权。原图未给出的实物尺寸仍按示意处理。

工具只在原册明确用到的步骤出现。准备页列有工具，并不意味着可以为它编造操作。分别表现徒手拼装、标记孔位、拧紧，以及支撑或保护表面的用途。手工具作为独立、可复用的资产。把真实工具尖端对准标记孔或驱动槽，表现靠近、接触作业和撤离三个阶段；在组合变换后的世界坐标中复核接触位置。

保留原始步骤和工作朝向。每步讲清动作、方向、准备事项和注意点，并能打开对应原页。把建模假设、播放细节、碰撞检查和制作依据放入复核记录。按产品需要编排多枚紧固件、标记工具、已装组件整体翻面及回到前一步等动作。一步可以涉及多件零件；原册要求翻面时，模型也要实际翻面。原图没有规定的旋转圈数和运动路径均为示意。

刚性装配查看器可从 `assets/viewer/` 起步。提供 `public/manifest.json`、其 `modelFile` 所指的 GLB、`public/references/manual.pdf` 和各页 `page-N.png`。替换 HTML 中的示例产品文案，运行时名称、尺寸、步骤数和零件数从清单读取。模板提供可点击放大且可独立旋转缩放的局部视图、播放、进度拖动与透视。通过 `toolAssets` 和逐动作的工具与接触信息，可显示尖锥标记或螺丝刀操作。复用时保留相应 HTML 控件。模板已有 `install`、`mark` 动作，支持 `inverted`、`sideA`、`sideB` 和正立姿态。扩展前先检查模板实际支持的动作。

### 5. 验收与交付

- 按原始 PDF 逐页核对数量、编号、工具、警示和每一步的顺序。
- 对每种实际导出的零件，独立比较孤立多视图与官方原图，再将安装位置和朝向与对应装配图比较。记录页码、裁图、渲染文件路径、具体特征和通过情况。节点数量、外尺寸或碰撞检测不足以证明外形一致；发现差异要修复或明确记为未解决。
- 检查实际 GLB 的实例名、几何、缩放和记录的尺寸。核对动作终点、重新进入某一步及装配组变换。记录已检测的碰撞范围，离散抽样只能说明被检查的位置。
- 在实际查看器中验证加载、完整播放、暂停、拖动进度、前后切步、跳步、选件、旋转和局部放大。每一步都能回到来源 PDF 或渲染页。
- 在准备清单、步骤和零件对照中显示五金编号、数量及可直接旋转的识别卡。让 Cycles 海报与实时 GLB 的工作面相机、摄影棚 HDR 和 AgX 色彩处理一致，并比较实际画帧。手工具增加工作端特写。只有实物尺寸已知且屏幕已经校准，才可称为屏上 1:1。
- Agent 日志、缺失信息和开发细节存入制作记录。装配界面保留用户当下能执行的指令及与使用相关的精度说明。

交付可运行查看器、最终模型、可编辑工程、构建脚本、交接约定、原始参考和验收记录。新做产品时保留原有说明书及原型。报告说明本次实际验证了什么、哪些测量仍为示意，以及是否进行过实物试装。单一案例验证的范围不能外推到任意 PDF 的无人值守转换。

## English instructions

Deliver a working manual whose actions can be traced to the supplied PDF, plus editable models and the actual production record. A PDF may explain assembly without specifying enough geometry for an engineering-accurate model. Separate source facts from illustrative reconstruction throughout.

For a 拼装工坊 furniture manual, use the current academy workspace’s `work/academy/manual-design.md` from the first version of the current product. The LACK layout is the approved baseline, and `work/academy/manual.css` supplies the shared styles. Bind the new inventory, branches and 3D scene to that layout. Compare the actual preparation page, workbench and part viewer with LACK at matching desktop and mobile viewports before release. A source-reading study is an intermediate handoff when the user requested the full production chain.

When publishing inside 拼装工坊, apply the catalogue and collection section of the same design guide. Photograph the approved assembled geometry on transparent film, including visibly different route variants. Use the shared local collection module for first completion, returning to a finished object, and resuming at a missing required step. Verify the actual player and persisted album in a fresh browser with the academy's `work/academy/verify_collection.py` and extend its cases when adding a product.

### 1. Prepare the source

Preserve the user's product and variant. Record the PDF source, revision when visible, and file hash; do not mix hardware or steps from another revision. Use a new run directory and the local entry script:

```sh
python3 scripts/prepare_pdf.py /absolute/path/manual.pdf /absolute/path/run/input --revision AA-123456-1
```

Resolve `scripts/prepare_pdf.py` from this Skill directory. Omit `--revision` if not established. The script requires PyMuPDF (`fitz`), copies the PDF, renders every page, extracts embedded text, and writes `manifest.json`. It does not perform OCR, interpret diagrams, or generate a 3D model. Use the host's existing PDF runtime when the active Python lacks PyMuPDF; do not silently install a new toolchain.

Inspect all rendered pages, including warnings and parts pages. Text extraction alone is insufficient for arrows, handedness, repeated actions, and fastener silhouettes. Distinguish PDF page indices from printed step numbers.

### 2. Delegate real work

Use the host's available subagent tools for this workflow. Keep a shared run directory and give each agent an exclusive output directory. Inherit the current host model unless the user has selected another available model; do not label a run with models that were never invoked.

| Role | Required input | Concrete output |
| --- | --- | --- |
| Understanding agent | Original PDF and every rendered page | Evidence by page; part types, quantities and instances; reusable tools; original step order; warnings; missing facts |
| Modeling agent | Frozen evidence and shared contract | Parameterized construction script, named independent meshes, GLB and editable source; explicit illustrative geometry parameters |
| Independent checking agent | Original PDF, shared contract, actual exported model and actions | Evidence-backed defects or acceptance, with affected page/step/instance and checks actually performed |
| Main agent | All outputs and actual task results | Resolved contract, running viewer, real browser checks, package and concise limitations |

The understanding stage precedes modeling. An agent may propose a correction, but the main agent resolves conflicts against the original source before downstream work proceeds. The checking agent must inspect the PDF and exported artifacts itself, not merely approve another agent's summary. Route a failed check to the responsible agent, then recheck the changed behavior.

When subagents are unavailable, perform the roles serially and identify the review as a serial self-check. Do not invent independent reviews, task IDs, model calls, or completion events. Record real role, input/output paths, observed status and known timestamps in `run.json`; omit unknown timestamps. A webpage upload control does not itself run these agents.

### 3. Freeze the handoff

Before modeling, define the smallest shared contract needed by this product. Read [the handoff reference](references/handoff.md). Separate part types, physical instances, reusable tools, and steps: one step may affect several instances, and the same tool or part may reappear later.

Preserve observed values, derived values, illustrative values and unknowns distinctly. Product-envelope dimensions do not establish board thickness, screw length, hole positions or thread pitch. Keep unknown source dimensions null; put chosen visualization estimates in separate illustrative fields. If an unresolved fact changes hardware identity, joint direction, assembly order or a warning, pause that affected instruction and obtain clearer evidence. A decorative or proportion uncertainty may remain explicitly illustrative.

Do not add operations based only on what seems mechanically plausible. Magnify ambiguous diagram regions and resolve them from the original page or additional product-specific evidence.

For every part type, retain the official part drawing or product-specific image crop and list its visible identifying features: outline, openings and slots, bends, surface relief, screw head/drive, tip and thread form where shown. Unknown dimensions permit explicitly estimated proportions; they do not justify omitting visible features or substituting a generic primitive for a recognizably different component.

### 4. Model and animate

Prefer parameterized Blender/CAD construction for regular boards, legs, fasteners and joints. Share geometries where appropriate, while keeping every physical instance addressable by a stable ID. Use explicit units and one documented coordinate conversion to glTF.

Distinguish the part-list drawing's viewing direction, the assembly step's working orientation, and the model's coordinates. Use the source assembly diagram to establish position, contact face and installation direction before converting coordinates. Do not mirror a part or reverse a slotted face merely to match its silhouette on the page. Render the individual component from multiple angles, including the opposite face, and check its installed orientation after group and export transforms.

For 拼装工坊 or a manual using Aholo assets, apply the [adaptive view and contact review](references/aholo-views.md) from evidence extraction through delivery. The understanding agent selects the necessary viewpoints per part, the modeling agent prepares ordered Blender renders for actual Aholo image-to-3D geometry, and the independent checker verifies the returned mesh and working tool interaction against the PDF. Use the installed Aholo execution workflow and current spending authorization. Keep undocumented physical dimensions illustrative.

Represent tools only in the steps that actually use them. A tool shown in the preparation list does not authorize an invented operation. Distinguish hand assembly, marking, driving and supporting/protective surfaces. Use separate reusable hand-tool assets, not extra permanent product parts. Anchor the actual tool tip to the actual marking hole or drive socket; show approach, contact/work and withdrawal, and verify contact after world-space group transforms.

Keep source steps intact. Describe the physical action, its direction and any preparation or caution the assembler needs in each visible step. Keep modeling assumptions, playback behavior, collision checks and production evidence in the review record. Retain access to the source page beside each step. Support only the motions this product needs: multiple fasteners, reusable marking tools, rotating an already assembled group, and returning to earlier steps when present. Model those as actions instead of assuming step N means part N. Preserve the PDF's working orientation; a convenient camera angle is not a substitute for an instructed flip. Animation turn counts and paths are illustrative unless the source establishes them.

For an initial rigid-assembly viewer, use the tested starter in `assets/viewer/`. Supply `public/manifest.json`, its `modelFile` GLB, and `public/references/manual.pdf` plus `page-N.png` rendered pages. Adapt the example product text in HTML; runtime names, dimensions, step and part counts come from the manifest. The viewer supports a clickable expanded detail view with independent orbit/zoom, playback/scrubbing and x-ray. It can load separate `toolAssets` and use per-action tool/contact metadata for a marked awl or a screwdriver. Preserve all corresponding HTML controls when reusing the viewer. The implemented actions are `install` and `mark`, with `inverted`, `sideA`, `sideB` and upright group poses. Inspect the actual template before expanding its action vocabulary; it is a starter, not a universal PDF converter.

### 5. Check and deliver

- Compare quantities, identifiers, tools, warnings and every step with original PDF pages.
- Independently compare every part type's actual isolated multi-angle renders with its official source image, then compare its installed position and direction with the relevant assembly diagram. Record the source page/crop, rendered image paths, specific feature and pass/fail result. Node counts, dimensions and collision checks cannot establish appearance or structural-feature fidelity; a mismatch must be repaired or explicitly left unresolved.
- Inspect the actual GLB's instance names, geometry, scale and documented dimensions. Check action endpoints, re-entry to a step, and assembly-group transforms. State the tested range of collision checks; sampled paths do not prove continuous clearance.
- In the real viewer, verify loading, complete playback, pause, scrub, previous/next, jump to a step, selection, rotation and local detail views as implemented. Each step must link to its source PDF page or rendered page.
- Make physical part identification clear through hardware code, quantity, and a directly rotatable identification card in preparation, steps and inventory comparisons. Use matching work-face cameras, the same studio HDR and AgX for the Cycles poster and live GLB. Compare real frames from both. For hand tools, give the user a close working-end view. Claim screen-size 1:1 only when the real dimension is known and the display has been calibrated; zooming alone is not 1:1.
- Keep agent logs, missing-data diagnostics and development details in the production record. The assembly interface should show actionable instructions and the accuracy limitations relevant to its user.

Deliver the runnable viewer, final model, editable project, construction script, contract, source references and verification record. Keep an existing manual or prototype intact when creating a new product. Report what the actual run established, which measurements remain illustrative, and whether physical assembly was tested. Do not present a single successful example as a universal unattended PDF conversion service.
