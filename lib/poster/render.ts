import type { TodayPosterModel, TodayPosterMoment } from "./types";

export const TODAY_POSTER_WIDTH = 1080;
export const TODAY_POSTER_HEIGHT = 1440;

const TONE_COLORS: Record<TodayPosterMoment["tone"], string> = {
  food: "#a96547",
  rest: "#5f7f8b",
  tired: "#5f7e69",
  visit: "#776a83",
};

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  let current = "";
  for (const character of text) {
    const next = current + character;
    if (current && context.measureText(next).width > maxWidth) {
      lines.push(current);
      current = character;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawMoment(
  context: CanvasRenderingContext2D,
  moment: TodayPosterMoment,
  y: number,
) {
  const accent = TONE_COLORS[moment.tone];
  context.fillStyle = accent;
  context.beginPath();
  context.arc(116, y + 28, 10, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#77695e";
  context.font = '500 26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  context.fillText(`${moment.timeLabel}  ·  ${moment.stateLabel}`, 154, y + 38);

  context.fillStyle = "#3f342d";
  context.font = '600 35px "Songti SC", "STSong", "PingFang SC", serif';
  const lines = wrapText(context, moment.choiceLabel, 770).slice(0, 2);
  lines.forEach((line, index) => {
    context.fillText(line, 154, y + 90 + index * 46);
  });

  context.strokeStyle = "rgba(93, 68, 50, 0.12)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(154, y + 145);
  context.lineTo(962, y + 145);
  context.stroke();
}

export async function renderTodayPoster(
  model: TodayPosterModel,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Poster rendering requires a browser");
  }
  const canvas = document.createElement("canvas");
  canvas.width = TODAY_POSTER_WIDTH;
  canvas.height = TODAY_POSTER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.fillStyle = "#f4eee5";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = context.createRadialGradient(900, 120, 20, 900, 120, 480);
  glow.addColorStop(0, "rgba(126, 154, 136, 0.23)");
  glow.addColorStop(1, "rgba(126, 154, 136, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, 680);

  const warmGlow = context.createRadialGradient(70, 1200, 20, 70, 1200, 420);
  warmGlow.addColorStop(0, "rgba(210, 148, 105, 0.16)");
  warmGlow.addColorStop(1, "rgba(210, 148, 105, 0)");
  context.fillStyle = warmGlow;
  context.fillRect(0, 800, 600, 640);

  context.fillStyle = "#70533f";
  context.fillRect(86, 80, 58, 58);
  context.fillStyle = "#fffaf4";
  context.font = '700 27px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  context.fillText("啪", 101, 119);

  context.fillStyle = "#6d6158";
  context.font = '500 27px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  context.fillText(model.dateLabel, 86, 205);

  context.fillStyle = "#3f342d";
  context.font = '600 78px "Songti SC", "STSong", "PingFang SC", serif';
  model.headline.forEach((line, index) => {
    context.fillText(line, 86, 330 + index * 98);
  });

  context.fillStyle = "#77695e";
  context.font = '500 29px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  context.fillText("不算完成度，只把今天放在这里。", 88, 535);

  model.moments.forEach((moment, index) => {
    drawMoment(context, moment, 610 + index * 150);
  });

  if (model.hiddenCount > 0) {
    context.fillStyle = "#77695e";
    context.font = '500 25px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    context.fillText(`还有 ${model.hiddenCount} 段，安静留在本机。`, 154, 1380);
  } else {
    context.fillStyle = "#77695e";
    context.font = '500 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    context.fillText("由今天的本机选择生成 · 没有上传", 86, 1360);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Poster image could not be created"));
      },
      "image/png",
    );
  });
}
