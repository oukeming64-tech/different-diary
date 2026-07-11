"use client";

import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileText,
  Footprints,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { CSSProperties } from "react";

import { formatActivitySummary } from "../../lib/stage3";
import { branchFor, fullDateLabel, intentLabel, timeLabel } from "./model";
import { CalmBack, LocalBlobImage } from "./shared";
import type { DiaryController } from "./use-diary-controller";

export function TimelineScreen({ controller }: { controller: DiaryController }) {
  const {
    records,
    groupedRecords,
    attachmentsByCheckIn,
    activitiesByCheckIn,
    dataNotice,
    goHome,
    openRecord,
    setView,
  } = controller;

  return (
    <div className="screen timeline-screen screen-enter motion-timeline">
      <header className="section-header">
        <button className="icon-button" aria-label="回到首页" onClick={goHome} type="button">
          <ArrowLeft size={20} />
        </button>
        <div><p>最近</p><h2>发生了什么</h2></div>
        <button className="text-button" onClick={() => setView("data")} type="button">
          <Database size={16} aria-hidden="true" />数据
        </button>
      </header>
      <p className="section-intro">这些都只留在这台设备上。</p>

      {dataNotice && <div className="calm-notice" role="status">{dataNotice}</div>}

      {records.length === 0 ? (
        <div className="empty-memory editorial-empty">
          <span className="empty-dot" aria-hidden="true" />
          <h3>这里还没有记录</h3>
          <p>你可以先去首页坐一会儿，也可以什么都不做。</p>
          <button className="secondary-button" onClick={goHome} type="button">回到四个入口</button>
        </div>
      ) : (
        <div className="timeline-list">
          {groupedRecords.map((group) => (
            <section className="memory-group" key={group.key}>
              <h3>{group.label}</h3>
              <ol className="memory-stack memory-ledger">
                {group.records.map((record, recordIndex) => {
                  const branch = branchFor(record.state);
                  const attachment = attachmentsByCheckIn.get(record.id);
                  const activity = activitiesByCheckIn.get(record.id);
                  return (
                    <li className="memory-ledger-item" key={record.id}>
                      <button
                        className={`memory-card motion-memory-card ledger-entry ${attachment ? "memory-card--photo" : ""} ${activity ? "memory-card--activity" : ""}`}
                        data-tone={record.state}
                        onClick={() => openRecord(record.id)}
                        style={{ "--motion-delay": `${recordIndex * 70}ms` } as CSSProperties}
                        type="button"
                      >
                        <span className="memory-dot" aria-hidden="true" />
                        {attachment && (
                          <LocalBlobImage
                            alt="这条记录的本机照片"
                            blob={attachment.thumbnailBlob}
                            className="memory-photo-thumbnail"
                            height={attachment.thumbnailHeight}
                            width={attachment.thumbnailWidth}
                          />
                        )}
                        <span className="memory-card-body">
                          <time className="memory-meta" dateTime={record.occurredAt}>
                            <Clock3 size={13} aria-hidden="true" />
                            {timeLabel(record.occurredAt)} · {activity ? "记了一次运动" : branch?.memoryLabel}
                          </time>
                          {activity ? (
                            <>
                              <strong>{formatActivitySummary(activity)}</strong>
                              {activity.note && <small>“{activity.note}”</small>}
                            </>
                          ) : (
                            <>
                              {record.userText && <strong>“{record.userText}”</strong>}
                              <span className="memory-intent">{intentLabel(record.state, record.intentId)}</span>
                              <small>{record.responseText}</small>
                            </>
                          )}
                        </span>
                        <ChevronRight size={17} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function DetailScreen({ controller }: { controller: DiaryController }) {
  const {
    selectedRecord,
    selectedActivity,
    selectedAttachment,
    storageError,
    confirmDelete,
    setConfirmDelete,
    isDeleting,
    removeSelectedRecord,
    openTimeline,
  } = controller;
  if (!selectedRecord) return null;

  return (
    <div className="screen detail-screen screen-enter motion-detail" data-tone={selectedRecord.state}>
      <CalmBack label="回到最近" onClick={openTimeline} />
      <div className="detail-heading">
        <span className="detail-glyph" aria-hidden="true">
          {selectedActivity ? <Footprints size={20} /> : branchFor(selectedRecord.state)?.icon}
        </span>
        <p>{fullDateLabel(selectedRecord.occurredAt)}</p>
        <h2>{selectedActivity ? "记下了一次运动" : branchFor(selectedRecord.state)?.memoryLabel}</h2>
      </div>
      {selectedAttachment && (
        <figure className="detail-photo">
          <LocalBlobImage
            alt="这条记录保存在本机的照片"
            blob={selectedAttachment.blob}
            className="detail-photo-image"
            height={selectedAttachment.height}
            width={selectedAttachment.width}
          />
        </figure>
      )}
      <div className="detail-blocks motion-detail-blocks editorial-sections">
        {selectedActivity ? (
          <>
            <section><span>这次记了</span><p>{formatActivitySummary(selectedActivity)}</p></section>
            {selectedActivity.note && (
              <section><span>还留了一句</span><p>“{selectedActivity.note}”</p></section>
            )}
            <section><span>这里想说</span><p>{selectedRecord.responseText}</p></section>
          </>
        ) : (
          <>
            {selectedRecord.userText && (
              <section><span>你当时说</span><p>“{selectedRecord.userText}”</p></section>
            )}
            <section><span>你希望</span><p>{intentLabel(selectedRecord.state, selectedRecord.intentId)}</p></section>
            <section><span>这里回应了</span><p>{selectedRecord.responseText}</p></section>
          </>
        )}
      </div>
      {storageError && <div className="inline-notice" role="status">{storageError}</div>}
      <section className="delete-zone">
        <h3>不想再保留这条？</h3>
        <p>删除只会影响这台设备，删除后无法撤销。</p>
        {!confirmDelete ? (
          <button className="danger-button" onClick={() => setConfirmDelete(true)} type="button">
            <Trash2 size={16} aria-hidden="true" />删除这一条
          </button>
        ) : (
          <div className="confirm-row">
            <button className="secondary-button" onClick={() => setConfirmDelete(false)} type="button">先不删除</button>
            <button
              className="danger-button solid"
              disabled={isDeleting}
              onClick={() => void removeSelectedRecord()}
              type="button"
            >
              {isDeleting ? "正在删除…" : "确认删除"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export function DataScreen({ controller }: { controller: DiaryController }) {
  const {
    attachments,
    dataNotice,
    isExporting,
    isClearing,
    confirmClear,
    setConfirmClear,
    exportData,
    clearAllData,
    openTimeline,
  } = controller;

  return (
    <div className="screen data-screen screen-enter motion-data">
      <CalmBack label="回到最近" onClick={openTimeline} />
      <div className="data-heading">
        <p className="soft-kicker"><ShieldCheck size={14} />控制权在你手里</p>
        <h2>本机数据</h2>
        <p>这里仍然没有账户，也没有云端副本。</p>
      </div>
      <section className="data-card local-data-card motion-data-card data-row data-row-info">
        <span className="data-card-icon"><Database size={20} /></span>
        <div><h3>只在当前设备</h3><p>身份和记录保存在浏览器的本机空间里。</p></div>
      </section>
      <section className="data-card motion-data-card data-row data-row-action">
        <span className="data-card-icon"><FileText size={20} /></span>
        <div>
          <h3>导出一份副本</h3>
          <p>{attachments.length ? "生成记录、运动详情与照片索引；照片文件仍留在本机。" : "生成包含运动详情的 JSON 文件，不会删除或上传原记录。"}</p>
        </div>
        <button className="secondary-button" disabled={isExporting} onClick={() => void exportData()} type="button">
          <Download size={17} aria-hidden="true" />{isExporting ? "正在生成…" : "导出数据"}
        </button>
      </section>
      {dataNotice && <div className="calm-notice" role="status">{dataNotice}</div>}
      <section className="data-card danger-card motion-data-card data-row data-row-danger">
        <span className="data-card-icon"><Trash2 size={20} /></span>
        <div><h3>清空这台设备</h3><p>会删除本机身份和全部记录，无法撤销。</p></div>
        {!confirmClear ? (
          <button className="danger-button" onClick={() => setConfirmClear(true)} type="button">准备清空</button>
        ) : (
          <div className="clear-confirm">
            <strong>要清空这台设备上的全部记录吗？</strong>
            <p>这里没有云端副本。</p>
            <div className="confirm-row">
              <button className="secondary-button" onClick={() => setConfirmClear(false)} type="button">先不清空</button>
              <button
                className="danger-button solid"
                disabled={isClearing}
                onClick={() => void clearAllData()}
                type="button"
              >
                {isClearing ? "正在清空…" : "确认清空"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
