# 拼装工坊

交互式 3D 拼装图鉴。原创纸模「海边小屋」支持三张零件板与四十件拼装，家具说明书提供宜家 LACK 茶几与 IVAR 松木双门柜的逐步装配、工具演示和连接特写。完成一条路线后，可以把作品收入本地收藏。

[打开拼装工坊在线体验](https://pinzhuang-gongfang.pages.dev/)

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
