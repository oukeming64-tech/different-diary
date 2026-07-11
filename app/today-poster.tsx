"use client";

import { ArrowLeft, Download, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  renderTodayPoster,
  type TodayPosterModel,
} from "../lib/poster";

import "./today-poster.css";

export type TodayPosterProps = {
  model: TodayPosterModel;
  onBack: () => void;
};

export function TodayPoster({ model, onBack }: TodayPosterProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let nextUrl: string | null = null;

    async function preparePoster() {
      setError(null);
      try {
        const blob = await renderTodayPoster(model);
        if (!active) return;
        nextUrl = URL.createObjectURL(blob);
        setPosterUrl(nextUrl);
      } catch {
        if (active) setError("这张海报暂时没有生成，今天的记录没有变化。");
      }
    }

    if (model.moments.length) void preparePoster();
    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [model]);

  function downloadPoster() {
    if (!posterUrl) return;
    const today = new Date();
    const date = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    const link = document.createElement("a");
    link.href = posterUrl;
    link.download = `不一样的日记-今日海报-${date}.png`;
    link.click();
  }

  return (
    <section className="today-poster screen screen-enter">
      <header className="today-poster__backbar">
        <button onClick={onBack} type="button">
          <ArrowLeft size={18} aria-hidden="true" />回到首页
        </button>
        <span>今日海报</span>
      </header>

      <header className="today-poster__heading">
        <p>把今天轻轻放在一张纸上</p>
        <h2>生成今天的海报</h2>
        <span>只使用今天保存过的状态和选择。海报在当前设备生成，不会上传，也不放照片、原话、AI 回应或身体数据。</span>
      </header>

      {!model.moments.length ? (
        <div className="today-poster__empty">
          <ImageIcon size={28} aria-hidden="true" />
          <h3>今天还没有可以做成海报的选择</h3>
          <p>先从首页挑一句，愿意的话把那次选择记下来，再回来看看。</p>
          <button onClick={onBack} type="button">去选一句</button>
        </div>
      ) : (
        <>
          <figure className="today-poster__preview">
            {error ? (
              <div className="today-poster__preparing today-poster__failed" role="alert">
                <ImageIcon size={24} aria-hidden="true" />
                这次没有排成图片，可以稍后再试
              </div>
            ) : posterUrl ? (
              // The preview is a short-lived local Blob URL created from canvas.
              <img alt="根据今天本机选择生成的海报预览" src={posterUrl} />
            ) : (
              <div className="today-poster__preparing" role="status">
                <span />
                正在把今天排成一张海报…
              </div>
            )}
          </figure>

          {error && <p className="today-poster__error" role="alert">{error}</p>}

          <button
            className="today-poster__download"
            disabled={!posterUrl}
            onClick={downloadPoster}
            type="button"
          >
            <Download size={18} aria-hidden="true" />
            {posterUrl ? "保存为图片" : "正在生成…"}
          </button>
        </>
      )}
    </section>
  );
}

export default TodayPoster;
