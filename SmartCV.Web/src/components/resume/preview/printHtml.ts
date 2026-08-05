import type { PageMarginsMm } from '../resumeTypes';

/**
 * Wraps the rendered resume markup in a standalone HTML document for the
 * server-side PDF renderer. `pageCss` is the CSS `@page size` keyword
 * (e.g. "A4"), and `margins` set the printable area.
 */
export function buildResumePrintHtml(bodyHtml: string, pageCss: string, margins: PageMarginsMm): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#fff;font-family:'Noto Sans CJK SC','Noto Sans CJK TC','Noto Sans SC','Noto Sans TC','PingFang SC','Microsoft YaHei','SimHei',sans-serif;}
h2{break-after:avoid;page-break-after:avoid;}
.rich-text-content ul,.rich-text-content ol{margin:0;padding-left:1.35em;}
.rich-text-content [data-list-style="disc"]{list-style-type:disc;}
.rich-text-content [data-list-style="circle"]{list-style-type:circle;}
.rich-text-content [data-list-style="square"]{list-style-type:square;}
.rich-text-content [data-list-style="decimal"]{list-style-type:decimal;}
.rich-text-content [data-list-style="lower-alpha"]{list-style-type:lower-alpha;}
.rich-text-content [data-list-style="upper-alpha"]{list-style-type:upper-alpha;}
.rich-text-content [data-list-style="lower-roman"]{list-style-type:lower-roman;}
.rich-text-content [data-list-style="upper-roman"]{list-style-type:upper-roman;}
.rich-text-content [data-list-style="none"]{list-style-type:none;}
.rich-text-content [data-list-style="dash"],.rich-text-content [data-list-style="check"]{list-style-type:none;padding-left:0;}
.rich-text-content [data-list-style="dash"]>li,.rich-text-content [data-list-style="check"]>li{position:relative;padding-left:1.15em;}
.rich-text-content [data-list-style="dash"]>li::before,.rich-text-content [data-list-style="check"]>li::before{position:absolute;left:0;}
.rich-text-content [data-list-style="dash"]>li::before{content:"-";}
.rich-text-content [data-list-style="check"]>li::before{content:"✓";}
@page{size:${pageCss};margin:${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;}
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}
