# 拼装工坊

**在 Codex、Claude Code 等 AI 工具里启用拼装工坊 Skill，上传一份 PDF 装配说明书，就能让 AI 把它做成可以在浏览器里操作的 3D 说明书。** 开始前先看要准备哪些零件和工具。装到某一步拿不准方向，就暂停，转到自己手里的角度，还可以放大连接处，看清螺丝是从哪一侧拧的进去。

上传 PDF 后，可以直接对 AI 说：

> 用拼装工坊的 pdf-to-3d-manual Skill，把这份 PDF 做成可交互的 3D 装配说明书。我想先看零件和工具清单，再跟着原说明书一步一步装。

[获取 Skill（中英双语）](skills/pdf-to-3d-manual/) · [试试 3D 说明书：给 IVAR 柜装上门铰链](https://pinzhuang-gongfang.pages.dev/ivar/?route=wall&resume=8) · [浏览拼装工坊全部作品](https://pinzhuang-gongfang.pages.dev/)

## 制作工作流

[PDF 转 3D 装配说明书工作流](skills/pdf-to-3d-manual/SKILL.md) 包含说明书解读、Aholo 多视图参考、建模与独立复核的分工。成品网页可直接用仓库内的资产构建。

## 从源码启动

以下命令从仓库根目录执行。开发环境为 macOS、Node.js 22.22.3、npm 10 和 Python 3.9。首次安装依赖需要联网。构建直接读取包内的 GLB、贴图和说明书资料，不需要 Aholo 账号或密钥。

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm ci --prefix work/cottage-production
ln -s ../../cottage-production/node_modules work/manual-pipeline/app/node_modules
ln -s ../../cottage-production/node_modules work/ivar-pilot/player/node_modules
python work/academy/build.py
python -m http.server 4184 --bind 127.0.0.1 --directory outputs/拼装工坊/site
```

浏览器打开 http://127.0.0.1:4184/ 。安装依赖与创建软链接只需执行一次。之后修改源码，重新运行构建命令即可。构建同时产出三项目离线版 ZIP。

## 源码入口

| 路径 | 内容 |
| --- | --- |
| work/academy | 图鉴首页、收藏与续拼、共享样式、发布脚本 |
| work/cottage-production | 小屋三维场景、零件板排布、40 件装配规格与动作 |
| work/manual-pipeline/app | LACK 播放器、手势、工具、可旋转零件预览 |
| work/ivar-pilot/player | IVAR 三种装法、逐步动作和交互播放器 |
| work/ivar-pilot | IVAR 模型库、清单、说明书原页、裁图和发布代码 |
| work/academy/manual-design.md | 复用设计、封面、成品视角与入藏验收流程 |

## 素材

网页使用 Three.js 和 Vite。家具原图取自宜家对应产品的装配说明书，随资料保留原 PDF。包内模型为互动说明书使用的最终资产，包含 Aholo 生成并针对装配位置校正的部件与材质。

## 反馈与共创 · Feedback and collaboration

哪一步让你停下来转了好几次视角？欢迎告诉我是哪件家具、哪一步，以及你当时想看清什么。如果你有一本想做成 3D 的说明书，或想一起做模型、交互动效、试装体验，也欢迎带着想法来聊。[提建议或联系我共创](https://github.com/byby123byby/pinzhuang-gongfang/issues/new)

Which step made you turn the model around a few times? Tell me what you were assembling, which step you were on, and what you wanted to see. If you have a manual you'd love to see in 3D, or you'd like to help model a part, animate a tricky step, or try a build, I'd love to hear from you. [Share feedback or propose a collaboration](https://github.com/byby123byby/pinzhuang-gongfang/issues/new)

## 作品署名与使用说明 · Credits and reuse

「拼装工坊」由 [@byby123byby](https://github.com/byby123byby) 发起并维护。[项目主页](https://pinzhuang-gongfang.pages.dev/)

欢迎浏览源码、在本地运行和评审本项目。项目作者保留对原创代码、工作流文档和原创美术素材的权利。如需将这些内容用于其他项目、参赛、再分发或商用，请先通过上方共创入口联系作者取得授权。宜家说明书与原图、第三方软件和素材的权利归各自权利人，按各自条款使用。

Assembly Workshop was created and is maintained by [@byby123byby](https://github.com/byby123byby). [Project website](https://pinzhuang-gongfang.pages.dev/)

You are welcome to browse the source, run the project locally, and review it. The author reserves the rights to the project's original code, workflow documentation, and original artwork. To reuse these materials in another project or competition entry, redistribute them, or use them commercially, please contact the author through the collaboration link above for permission first. IKEA manuals and illustrations, third-party software, and third-party assets remain subject to their respective rights and terms.
