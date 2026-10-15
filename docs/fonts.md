# 简历字体

内置字体为 Geist、Noto Sans SC、Noto Serif SC、Noto Sans、Noto Serif、Noto Sans Mono。资源来自项目依赖，部署后由本站提供；不依赖 Google Fonts 等外部字体服务。Noto 字体包含 400/700 字重，Geist 使用可变字重。未提供的字重由浏览器按字体匹配规则处理。

字体 CSS 按需导入，等待常规和粗体声明完成注册后，使用正文内容加载对应 unicode-range 子集。英文无衬线和等宽字体配 Noto Sans SC，英文衬线字体配 Noto Serif SC。字体切换成功前保留当前字体；失败可重试，不保存失败的选择。首屏已保存字体失败时保留回退预览并提示，禁止将未就绪页面当作完整结果导出。

旧 Source Han Sans SC / Source Han Serif SC 配置分别映射到 Noto Sans SC / Noto Serif SC，原配置不被批量重写。圆体别名保持兼容；可选本地字体通过 FontFace(local) 检测，未安装的选项不显示。移除了圆体自动放大 4%、强制变细和额外字距的旧规则，使字号设置与模板层级保持一致。

新建与恢复默认采用 11pt、1.4 行高、20px 章节间距、12mm 页边距。Minimal 章节标题使用正文字号的 1.16 倍，条目标题随正文字号变化，避免标题小于正文。正常状态不显示字体加载和 Word 安装说明，只在加载或失败时显示状态。

PDF/HTML 等待字体和分页就绪，嵌入所选字体及对应中文字体的实际文件，仅保留正文涉及的子集。不能取得本机字体文件时，不声称可嵌入；本地字体选择在 PDF/HTML 导出时会提示改用内置字体。

DOCX 写入真实字体名称并区分西文与东亚字体，不嵌入字体。接收设备需要安装相应字体，Word 排版仍可能与浏览器不同。

验证见 `e2e/fonts.spec.ts`：通过 Chromium 的 CSS.getPlatformFontsForNode 检查真实字形来源与中英文粗体，阻断网络后验证离线 HTML，再检查加载失败保留原选择及重试。相关工作区测试覆盖中文 PDF 生成与文本回读、即时导出和多页分页。
