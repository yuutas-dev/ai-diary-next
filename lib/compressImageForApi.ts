import { PHOTO_API_JPEG_QUALITY, PHOTO_API_MAX_EDGE_PX } from "@/constants";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result;
      if (typeof raw !== "string") {
        reject(new Error("ファイルの読み込みに失敗しちゃった💦 (無効なデータ)"));
        return;
      }
      resolve(raw);
    };
    reader.onerror = () => {
      reject(new Error("ファイルの読み込みに失敗しちゃった💦"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 画像（data URL または http(s)/blob URL）を長辺 PHOTO_API_MAX_EDGE_PX 以内に縮小し、JPEG data URL にする。
 * 写メ選択時・生成 API 直前の両方で利用（DRY）。
 */
export function compressImageSrcToJpegDataUrl(sourceDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = PHOTO_API_MAX_EDGE_PX;
      let width = img.width;
      let height = img.height;
      if (!width || !height) {
        reject(new Error("画像のサイズ（寸法）が読み取れなかったよ💦 別の画像で試してね"));
        return;
      }
      if (width > height) {
        if (width > max) {
          height *= max / width;
          width = max;
        }
      } else if (height > max) {
        width *= max / height;
        height = max;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("お使いのブラウザが画像処理に対応していないみたい💦"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", PHOTO_API_JPEG_QUALITY));
      } catch {
        reject(new Error("画像の圧縮に失敗しちゃった💦"));
      }
    };
    img.onerror = () => {
      reject(new Error("画像の読み込みに失敗しちゃった💦 別の画像で試してね"));
    };
    img.src = sourceDataUrl;
  });
}

export async function compressImageFileToJpegDataUrl(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file);
  return compressImageSrcToJpegDataUrl(raw);
}
