"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  useId,
  useRef,
} from "react";

import "./photo-flow.css";

export type PhotoFlowProps = {
  previewUrl: string | null;
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onRecordOnly: () => void;
  onWrite: () => void;
  onCancel: () => void;
};

export function PhotoFlow({
  previewUrl,
  busy,
  error,
  onFile,
  onRecordOnly,
  onWrite,
  onCancel,
}: PhotoFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  function openPhotoPicker() {
    if (!busy) inputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) onFile(file);
  }

  return (
    <section
      aria-busy={busy}
      aria-describedby={error ? errorId : undefined}
      className={`photo-flow ${previewUrl ? "photo-flow--preview" : "photo-flow--empty"}`}
    >
      <input
        accept="image/*"
        capture="environment"
        className="photo-flow__file-input"
        disabled={busy}
        id={inputId}
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {!previewUrl ? (
        <>
          <header className="photo-flow__heading">
            <p className="photo-flow__eyebrow">照片记录</p>
            <h2>拍一张，先放在这里</h2>
            <p>留下一张照片，或者继续写两句。</p>
          </header>

          {error && (
            <p className="photo-flow__error" id={errorId} role="alert">
              {error}
            </p>
          )}

          <div className="photo-flow__empty-actions">
            <button
              aria-controls={inputId}
              className="photo-flow__pick-row"
              disabled={busy}
              onClick={openPhotoPicker}
              type="button"
            >
              <span>
                <strong>{busy ? "正在准备照片…" : "拍照或选择图片"}</strong>
                <small>拍下眼前，或者从相册选择</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>

            <button
              className="photo-flow__text-action"
              disabled={busy}
              onClick={onWrite}
              type="button"
            >
              还是写两句
            </button>
            <button
              className="photo-flow__text-action"
              disabled={busy}
              onClick={onCancel}
              type="button"
            >
              取消
            </button>
          </div>
        </>
      ) : (
        <>
          <figure className="photo-flow__preview">
            <Image
              alt="准备保存在本机的照片预览"
              className="photo-flow__preview-image"
              height={900}
              sizes="(max-width: 520px) calc(100vw - 40px), 432px"
              src={previewUrl}
              unoptimized
              width={1200}
            />
          </figure>

          <header className="photo-flow__heading photo-flow__heading--preview">
            <p className="photo-flow__eyebrow">照片记录</p>
            <h2>照片准备好了</h2>
            <p>接下来做什么，由你决定。</p>
          </header>

          {error && (
            <p className="photo-flow__error" id={errorId} role="alert">
              {error}
            </p>
          )}

          <div className="photo-flow__preview-actions">
            <button
              className="photo-flow__record-button"
              disabled={busy}
              onClick={onRecordOnly}
              type="button"
            >
              <strong>{busy ? "正在记下…" : "只替我记住"}</strong>
              <small>不识别，也不会发送出去</small>
            </button>

            <button
              className="photo-flow__write-row"
              disabled={busy}
              onClick={onWrite}
              type="button"
            >
              <span>
                <strong>写两句再记住</strong>
                <small>从哪一句开始都可以</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>

            <div className="photo-flow__utilities">
              <button
                aria-controls={inputId}
                disabled={busy}
                onClick={openPhotoPicker}
                type="button"
              >
                重新选一张
              </button>
              <button disabled={busy} onClick={onCancel} type="button">
                删除这张照片
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default PhotoFlow;
