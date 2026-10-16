"use client";

import * as React from "react";
import { toStaticHref } from "@/lib/nav";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

// 渲染为指向真实 index.html 文件的普通 <a>，强制整页硬导航，
// 规避 CloudStudio 对干净 URL 的 SPA 兜底（否则会停在首页壳）。
export function StaticLink({ href, ...rest }: Props) {
  return <a href={toStaticHref(href)} {...rest} />;
}
