const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const emptyState = document.getElementById("emptyState");
const imageMeta = document.getElementById("imageMeta");
const scaleRange = document.getElementById("scaleRange");
const scaleValue = document.getElementById("scaleValue");
const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const formatSelect = document.getElementById("formatSelect");
const qualityInput = document.getElementById("qualityInput");
const resetButton = document.getElementById("resetButton");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");

const translations = {
  en: {
    appTitle: "Crop Resize",
    canvasLabel: "Image editor canvas",
    settingsLabel: "Edit settings",
    dropTitle: "Drop an image",
    dropHint: "You can also click to choose a file",
    noImage: "No image selected",
    resolution: "Resolution",
    width: "Width",
    height: "Height",
    format: "Format",
    quality: "Quality",
    reset: "Reset",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    cropMeta: "{width} x {height}px / crop {cropWidth} x {cropHeight}px",
    unsupportedClipboard: "This browser does not support copying images to the clipboard.",
    copyFailed: "Could not copy to the clipboard. Check your browser permissions.",
  },
  ja: {
    appTitle: "Crop Resize",
    canvasLabel: "画像編集キャンバス",
    settingsLabel: "編集設定",
    dropTitle: "画像をドロップ",
    dropHint: "クリックして選択することもできます",
    noImage: "画像未選択",
    resolution: "解像度",
    width: "幅",
    height: "高さ",
    format: "形式",
    quality: "品質",
    reset: "リセット",
    copy: "コピー",
    copied: "コピー済み",
    download: "ダウンロード",
    cropMeta: "{width} x {height}px / 切り抜き {cropWidth} x {cropHeight}px",
    unsupportedClipboard: "このブラウザでは画像のクリップボードコピーに対応していません。",
    copyFailed: "クリップボードへコピーできませんでした。ブラウザの権限設定を確認してください。",
  },
  zh: {
    appTitle: "Crop Resize",
    canvasLabel: "图像编辑画布",
    settingsLabel: "编辑设置",
    dropTitle: "拖放图像",
    dropHint: "也可以点击选择文件",
    noImage: "未选择图像",
    resolution: "分辨率",
    width: "宽度",
    height: "高度",
    format: "格式",
    quality: "质量",
    reset: "重置",
    copy: "复制",
    copied: "已复制",
    download: "下载",
    cropMeta: "{width} x {height}px / 裁剪 {cropWidth} x {cropHeight}px",
    unsupportedClipboard: "此浏览器不支持将图像复制到剪贴板。",
    copyFailed: "无法复制到剪贴板。请检查浏览器权限设置。",
  },
  ko: {
    appTitle: "Crop Resize",
    canvasLabel: "이미지 편집 캔버스",
    settingsLabel: "편집 설정",
    dropTitle: "이미지 놓기",
    dropHint: "클릭해서 파일을 선택할 수도 있습니다",
    noImage: "선택된 이미지 없음",
    resolution: "해상도",
    width: "너비",
    height: "높이",
    format: "형식",
    quality: "품질",
    reset: "초기화",
    copy: "복사",
    copied: "복사됨",
    download: "다운로드",
    cropMeta: "{width} x {height}px / 자르기 {cropWidth} x {cropHeight}px",
    unsupportedClipboard: "이 브라우저는 이미지를 클립보드에 복사할 수 없습니다.",
    copyFailed: "클립보드에 복사할 수 없습니다. 브라우저 권한 설정을 확인하세요.",
  },
};

const supportedLanguages = Object.keys(translations);
let currentLanguage = detectLanguage();

const state = {
  image: null,
  fileName: "image",
  naturalWidth: 0,
  naturalHeight: 0,
  display: { x: 0, y: 0, width: 0, height: 0, scale: 1 },
  crop: { x: 0, y: 0, width: 0, height: 0 },
  dragging: null,
  dragOrigin: null,
  pointerId: null,
};

const handles = ["nw", "ne", "sw", "se"];
const handleSize = 14;
const minCropSize = 24;

function detectLanguage() {
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of browserLanguages) {
    const normalized = String(language || "").toLowerCase();
    const exact = supportedLanguages.find((supported) => normalized === supported);
    if (exact) return exact;

    const base = normalized.split("-")[0];
    if (supportedLanguages.includes(base)) return base;
  }
  return "en";
}

function t(key, values = {}) {
  const message = translations[currentLanguage]?.[key] || translations.en[key] || key;
  return Object.entries(values).reduce((result, [name, value]) => {
    return result.replaceAll(`{${name}}`, String(value));
  }, message);
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = t("appTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(",").forEach((mapping) => {
      const [attr, key] = mapping.split(":").map((part) => part.trim());
      if (attr && key) {
        element.setAttribute(attr, t(key));
      }
    });
  });

  updateMeta();
}

function enableControls(enabled) {
  [
    scaleRange,
    widthInput,
    heightInput,
    formatSelect,
    qualityInput,
    resetButton,
    copyButton,
    downloadButton,
  ].forEach((control) => {
    control.disabled = !enabled;
  });
  updateQualityAvailability();
}

function updateQualityAvailability() {
  qualityInput.disabled = !state.image || formatSelect.value === "image/png";
}

function baseName(fileName) {
  return fileName.replace(/\.[^.]+$/, "") || "image";
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      state.fileName = baseName(file.name);
      state.naturalWidth = image.naturalWidth;
      state.naturalHeight = image.naturalHeight;
      resetCrop();
      scaleRange.value = "100";
      updateDimensionsFromScale();
      enableControls(true);
      updateQualityAvailability();
      dropZone.classList.add("has-image");
      emptyState.hidden = true;
      resizeCanvas();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function resetCrop() {
  state.crop = {
    x: 0,
    y: 0,
    width: state.naturalWidth,
    height: state.naturalHeight,
  };
}

function resizeCanvas() {
  const rect = dropZone.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function getDisplayRect() {
  if (!state.image) return { x: 0, y: 0, width: 0, height: 0, scale: 1 };

  const rect = dropZone.getBoundingClientRect();
  const padding = 36;
  const maxWidth = Math.max(1, rect.width - padding * 2);
  const maxHeight = Math.max(1, rect.height - padding * 2);
  const scale = Math.min(maxWidth / state.naturalWidth, maxHeight / state.naturalHeight, 1);
  const width = state.naturalWidth * scale;
  const height = state.naturalHeight * scale;

  return {
    x: (rect.width - width) / 2,
    y: (rect.height - height) / 2,
    width,
    height,
    scale,
  };
}

function imageToCanvasRect(rect) {
  const display = state.display;
  return {
    x: display.x + rect.x * display.scale,
    y: display.y + rect.y * display.scale,
    width: rect.width * display.scale,
    height: rect.height * display.scale,
  };
}

function canvasToImagePoint(point) {
  const display = state.display;
  return {
    x: (point.x - display.x) / display.scale,
    y: (point.y - display.y) / display.scale,
  };
}

function draw() {
  const rect = dropZone.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (!state.image) return;

  state.display = getDisplayRect();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    state.image,
    state.display.x,
    state.display.y,
    state.display.width,
    state.display.height,
  );

  const cropRect = imageToCanvasRect(state.crop);
  ctx.save();
  ctx.fillStyle = "rgba(13, 22, 31, 0.58)";
  ctx.beginPath();
  ctx.rect(state.display.x, state.display.y, state.display.width, state.display.height);
  ctx.rect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
  ctx.fill("evenodd");

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i += 1) {
    const x = cropRect.x + (cropRect.width / 3) * i;
    const y = cropRect.y + (cropRect.height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x, cropRect.y);
    ctx.lineTo(x, cropRect.y + cropRect.height);
    ctx.moveTo(cropRect.x, y);
    ctx.lineTo(cropRect.x + cropRect.width, y);
    ctx.stroke();
  }

  getHandlePositions(cropRect).forEach((handle) => {
    ctx.fillStyle = "#1677c8";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function getHandlePositions(rect) {
  return [
    { name: "nw", x: rect.x, y: rect.y },
    { name: "ne", x: rect.x + rect.width, y: rect.y },
    { name: "sw", x: rect.x, y: rect.y + rect.height },
    { name: "se", x: rect.x + rect.width, y: rect.y + rect.height },
  ];
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function hitTestHandle(point) {
  if (!state.image) return null;
  const cropRect = imageToCanvasRect(state.crop);
  return getHandlePositions(cropRect).find((handle) => {
    return Math.abs(point.x - handle.x) <= handleSize && Math.abs(point.y - handle.y) <= handleSize;
  })?.name;
}

function hitTestCropEdge(point) {
  if (!state.image) return false;
  const cropRect = imageToCanvasRect(state.crop);
  const tolerance = 8;
  const withinX = point.x >= cropRect.x && point.x <= cropRect.x + cropRect.width;
  const withinY = point.y >= cropRect.y && point.y <= cropRect.y + cropRect.height;
  const nearLeft = Math.abs(point.x - cropRect.x) <= tolerance;
  const nearRight = Math.abs(point.x - (cropRect.x + cropRect.width)) <= tolerance;
  const nearTop = Math.abs(point.y - cropRect.y) <= tolerance;
  const nearBottom = Math.abs(point.y - (cropRect.y + cropRect.height)) <= tolerance;

  return (withinX && (nearTop || nearBottom)) || (withinY && (nearLeft || nearRight));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampImagePoint(point) {
  return {
    x: clamp(point.x, 0, state.naturalWidth),
    y: clamp(point.y, 0, state.naturalHeight),
  };
}

function setCropFromEdges(left, top, right, bottom) {
  const safeMinWidth = Math.min(minCropSize, state.naturalWidth);
  const safeMinHeight = Math.min(minCropSize, state.naturalHeight);

  let nextLeft = clamp(Math.round(left), 0, state.naturalWidth - safeMinWidth);
  let nextTop = clamp(Math.round(top), 0, state.naturalHeight - safeMinHeight);
  let nextRight = clamp(Math.round(right), nextLeft + safeMinWidth, state.naturalWidth);
  let nextBottom = clamp(Math.round(bottom), nextTop + safeMinHeight, state.naturalHeight);

  if (nextRight - nextLeft < safeMinWidth) {
    nextLeft = Math.max(0, nextRight - safeMinWidth);
  }
  if (nextBottom - nextTop < safeMinHeight) {
    nextTop = Math.max(0, nextBottom - safeMinHeight);
  }

  state.crop = {
    x: nextLeft,
    y: nextTop,
    width: nextRight - nextLeft,
    height: nextBottom - nextTop,
  };
}

function updateCropFromHandle(handle, point) {
  const imagePoint = clampImagePoint(canvasToImagePoint(point));
  const origin = state.dragOrigin?.crop || state.crop;
  const left = origin.x;
  const top = origin.y;
  const right = origin.x + origin.width;
  const bottom = origin.y + origin.height;
  const safeMinWidth = Math.min(minCropSize, state.naturalWidth);
  const safeMinHeight = Math.min(minCropSize, state.naturalHeight);

  let nextLeft = left;
  let nextTop = top;
  let nextRight = right;
  let nextBottom = bottom;

  if (handle.includes("w")) {
    nextLeft = clamp(imagePoint.x, 0, right - safeMinWidth);
  }
  if (handle.includes("e")) {
    nextRight = clamp(imagePoint.x, left + safeMinWidth, state.naturalWidth);
  }
  if (handle.includes("n")) {
    nextTop = clamp(imagePoint.y, 0, bottom - safeMinHeight);
  }
  if (handle.includes("s")) {
    nextBottom = clamp(imagePoint.y, top + safeMinHeight, state.naturalHeight);
  }

  setCropFromEdges(nextLeft, nextTop, nextRight, nextBottom);
  updateDimensionsFromScale();
  draw();
}

function moveCropToPoint(point) {
  const origin = state.dragOrigin;
  if (!origin) return;

  const imagePoint = clampImagePoint(canvasToImagePoint(point));
  const dx = imagePoint.x - origin.point.x;
  const dy = imagePoint.y - origin.point.y;
  const maxX = state.naturalWidth - origin.crop.width;
  const maxY = state.naturalHeight - origin.crop.height;

  state.crop = {
    x: Math.round(clamp(origin.crop.x + dx, 0, maxX)),
    y: Math.round(clamp(origin.crop.y + dy, 0, maxY)),
    width: origin.crop.width,
    height: origin.crop.height,
  };
  updateDimensionsFromScale();
  draw();
}

function updateDimensionsFromScale() {
  const scale = Number(scaleRange.value) / 100;
  const width = Math.max(1, Math.round(state.crop.width * scale));
  const height = Math.max(1, Math.round(state.crop.height * scale));
  widthInput.value = String(width);
  heightInput.value = String(height);
  scaleValue.value = `${scaleRange.value}%`;
  updateMeta();
}

function updateScaleFromWidth() {
  if (!state.crop.width) return;
  const width = Math.max(1, Number(widthInput.value) || 1);
  const scale = clamp(Math.round((width / state.crop.width) * 100), 1, 400);
  scaleRange.value = String(clamp(scale, 10, 100));
  updateDimensionsFromScale();
}

function updateScaleFromHeight() {
  if (!state.crop.height) return;
  const height = Math.max(1, Number(heightInput.value) || 1);
  const scale = clamp(Math.round((height / state.crop.height) * 100), 1, 400);
  scaleRange.value = String(clamp(scale, 10, 100));
  updateDimensionsFromScale();
}

function updateMeta() {
  if (!state.image) {
    imageMeta.textContent = t("noImage");
    return;
  }
  imageMeta.textContent = t("cropMeta", {
    width: state.naturalWidth,
    height: state.naturalHeight,
    cropWidth: state.crop.width,
    cropHeight: state.crop.height,
  });
}

function mimeExtension(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

function createOutputCanvas() {
  const outputWidth = Math.max(1, Number(widthInput.value) || 1);
  const outputHeight = Math.max(1, Number(heightInput.value) || 1);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = "high";
  outputCtx.drawImage(
    state.image,
    state.crop.x,
    state.crop.y,
    state.crop.width,
    state.crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  return outputCanvas;
}

function canvasToBlob(sourceCanvas, mime, quality) {
  return new Promise((resolve) => {
    sourceCanvas.toBlob(resolve, mime, quality);
  });
}

async function createOutputBlob(mime = formatSelect.value) {
  const outputCanvas = createOutputCanvas();
  const quality = clamp(Number(qualityInput.value) || 92, 1, 100) / 100;
  return canvasToBlob(outputCanvas, mime, quality);
}

async function downloadResult() {
  if (!state.image) return;

  const mime = formatSelect.value;
  const blob = await createOutputBlob(mime);
  if (!blob) return;

  const outputWidth = Math.max(1, Number(widthInput.value) || 1);
  const outputHeight = Math.max(1, Number(heightInput.value) || 1);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.fileName}-${outputWidth}x${outputHeight}.${mimeExtension(mime)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyResult() {
  if (!state.image) return;
  if (!navigator.clipboard || !window.ClipboardItem) {
    window.alert(t("unsupportedClipboard"));
    return;
  }

  const blob = await createOutputBlob("image/png");
  if (!blob) return;

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);

  copyButton.textContent = t("copied");
  window.setTimeout(() => {
    copyButton.textContent = t("copy");
  }, 1200);
}

function pasteImageFromClipboard(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;

  const file = imageItem.getAsFile();
  if (!file) return;

  event.preventDefault();
  loadFile(file);
}

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragover");
  loadFile(event.dataTransfer.files[0]);
});

fileInput.addEventListener("change", (event) => {
  loadFile(event.target.files[0]);
  fileInput.value = "";
});

canvas.addEventListener("pointerdown", (event) => {
  const point = pointerPosition(event);
  const handle = hitTestHandle(point);
  const mode = handle || (hitTestCropEdge(point) ? "move" : null);
  if (!mode) return;
  event.preventDefault();
  state.dragging = mode;
  state.dragOrigin = {
    crop: { ...state.crop },
    point: clampImagePoint(canvasToImagePoint(point)),
  };
  state.pointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.image) return;
  const point = pointerPosition(event);
  const handle = hitTestHandle(point);
  const canMove = hitTestCropEdge(point);
  canvas.style.cursor = handle ? `${handle}-resize` : canMove ? "move" : "crosshair";

  if (state.dragging && state.pointerId === event.pointerId) {
    if (state.dragging === "move") {
      moveCropToPoint(point);
    } else {
      updateCropFromHandle(state.dragging, point);
    }
  }
});

function stopDragging(event) {
  if (state.pointerId === event.pointerId) {
    state.dragging = null;
    state.dragOrigin = null;
    state.pointerId = null;
  }
}

canvas.addEventListener("pointerup", stopDragging);
canvas.addEventListener("pointercancel", stopDragging);

scaleRange.addEventListener("input", updateDimensionsFromScale);
widthInput.addEventListener("change", updateScaleFromWidth);
heightInput.addEventListener("change", updateScaleFromHeight);
formatSelect.addEventListener("change", updateQualityAvailability);
resetButton.addEventListener("click", () => {
  resetCrop();
  scaleRange.value = "100";
  updateDimensionsFromScale();
  draw();
});
downloadButton.addEventListener("click", downloadResult);
copyButton.addEventListener("click", () => {
  copyResult().catch(() => {
    window.alert(t("copyFailed"));
  });
});
window.addEventListener("paste", pasteImageFromClipboard);
window.addEventListener("languagechange", () => {
  currentLanguage = detectLanguage();
  applyTranslations();
});
window.addEventListener("resize", resizeCanvas);

applyTranslations();
enableControls(false);
