/* ================= CONFIGURATION ================= */
const FILTERS = {
    normal: 'none',
    bw: 'grayscale(1)',
    vintage: 'sepia(.45) contrast(.95)',
    soft: 'brightness(1.08) saturate(1.1)',
    country: 'sepia(.25) saturate(1.2)',
    dv: 'contrast(1.3) saturate(.8)',
    instax: 'contrast(1.2) saturate(1.4)'
};

const USER_SETTINGS = {
    timer: 3,
    count: 2,
    filter: 'normal',
    frameColor: '#ffffffff',
    storeColor: '#ffffffff',
    useStoreColor: false,
    bgImage: null,
    textPrimary: '',
    textSecondary: '',
    emoji: '',
    dateMode: 'auto',
    customDate: ''
};

const TEXTURES = [
    '1.png',
    '2.png',
    '3.png',
    '4.png',
    '5.png',
    '6.png',
    '7.png',
];
const TEXTURE_PATH = 'texture/'

/* ================= STATE ================= */
let shots = [];
let maxShots = 2;
let currentShot = 0;
let replaceIndex = null;
let isCounting = false;
let activeFilter = 'normal';
let currentStep = 1;

/* ================= DOM ELEMENTS ================= */
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const collage = document.getElementById('collage');
const flash = document.getElementById('flash');
const countdownEl = document.getElementById('countdown');
const previewStrip = document.getElementById('previewStrip');
const shutterBtn = document.getElementById('shutterBtn');
const boothScreen = document.getElementById('boothScreen');
const resultScreen = document.getElementById('resultScreen');

const ctx = canvas.getContext('2d');
const cctx = collage.getContext('2d');

/* ================= CAMERA SETUP ================= */
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => { video.srcObject = stream; })
    .catch(err => alert("Kamera tidak diizinkan atau tidak ditemukan"));

/* ================= MULTI-STEP NAVIGATION ================= */
function goToStep(step) {
    const totalSteps = 3;

    document.querySelectorAll('.editor-step').forEach(el => el.classList.remove('active'));
    const targetStep = document.getElementById(`step${step}`);
    if (targetStep) targetStep.classList.add('active');

    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const finalActions = document.getElementById('finalActions');

    if (prevBtn) prevBtn.style.visibility = (step === 1) ? 'hidden' : 'visible';

    if (step === totalSteps) {
        nextBtn.textContent = "Download & Finish";
        nextBtn.classList.add('download-mode');
    } else {
        nextBtn.textContent = "Next";
        nextBtn.classList.remove('download-mode');
    }

    // Sembunyikan footer-actions lama
    if (finalActions) finalActions.style.display = 'none';

    currentStep = step;
}

document.getElementById('nextStep').onclick = () => {
    if (currentStep < 3) {
        goToStep(currentStep + 1);
    } else {
        const pesan = "Apakah desain sudah sesuai? Foto akan didownload dan Anda akan kembali ke layar kamera.";

        if (confirm(pesan)) {
            const link = document.createElement('a');
            link.download = `photobooth-${Date.now()}.png`;
            link.href = collage.toDataURL('image/png');
            link.click();

            setTimeout(() => {
                resetBooth();
            }, 1000);
        }
    }
};
document.getElementById('prevStep').onclick = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
};

/* ================= MODAL LOGIC ================= */
function closeAllModal() {
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
        m.classList.remove('active');
    });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-modal');
        const modal = document.getElementById(targetId);
        if (modal) {
            closeAllModal();
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    });
});

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) closeAllModal();
};

/* ================= SETTINGS SAVING ================= */
document.getElementById('saveShot').onclick = () => {
    USER_SETTINGS.timer = +document.getElementById('timer').value;
    USER_SETTINGS.count = +document.getElementById('count').value;
    maxShots = USER_SETTINGS.count;
    shots = [];
    updatePreview();
    closeAllModal();
};

document.getElementById('saveStyle').onclick = () => {
    USER_SETTINGS.filter = document.getElementById('filter').value;
    USER_SETTINGS.frameColor = document.getElementById('frameColor').value;

    const bgFile = document.getElementById('bgUpload').files[0];
    if (bgFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            USER_SETTINGS.bgImage = e.target.result;
            makeCollage();
            closeAllModal();
        };
        reader.readAsDataURL(bgFile);
    } else {
        USER_SETTINGS.bgImage = null;
        makeCollage();
        closeAllModal();
    }
};

function applyStyleSettings() {
    activeFilter = USER_SETTINGS.filter;
    video.style.filter = FILTERS[activeFilter];
    closeAllModal();
}

function drawCoverImage(targetCtx, img, canvasW, canvasH) {
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasW / canvasH;
    let sx, sy, sw, sh;

    if (imgRatio > canvasRatio) {
        sh = img.height;
        sw = img.height * canvasRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = img.width / canvasRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }
    targetCtx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
}

function getAverageColor(imgElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = imgElement.naturalWidth || imgElement.width;
    const height = canvas.height = imgElement.naturalHeight || imgElement.height;

    ctx.drawImage(imgElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0;

    for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
    }

    const count = imageData.length / 4;
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    // Kembalikan dalam format hex agar bisa dibaca fungsi getContrastColor kamu
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

document.getElementById('saveText').onclick = () => {
    USER_SETTINGS.textPrimary = document.getElementById('textPrimary').value;
    USER_SETTINGS.textSecondary = document.getElementById('textSecondary').value;
    USER_SETTINGS.emoji = document.getElementById('emojiSelect').value;
    USER_SETTINGS.dateMode = document.getElementById('dateMode').value;
    USER_SETTINGS.customDate = document.getElementById('customDate').value;

    makeCollage();
    closeAllModal();
};
document.getElementById('dateMode').onchange = (e) => {
    const customInput = document.getElementById('customDate');
    if (e.target.value === 'custom') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
};

/* ================= CORE FUNCTIONS ================= */
function updatePreview() {
    previewStrip.innerHTML = '';
    for (let i = 0; i < maxShots; i++) {
        const box = document.createElement('div');
        box.className = 'preview-box';

        if (shots[i]) {
            const img = document.createElement('img');
            img.src = shots[i];
            img.onclick = () => {
                replaceIndex = i;
                alert(`Slot foto ${i + 1} terpilih. Foto berikutnya akan mengganti foto ini.`);
            };
            box.appendChild(img);

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '×';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm("Hapus foto ini dan ambil ulang?")) {
                    shots[i] = null;
                    if (replaceIndex === i) replaceIndex = null;
                    updatePreview();
                }
            };
            box.appendChild(delBtn);
        } else {
            box.innerHTML = `<span>Foto ${i + 1}</span>`;
        }
        previewStrip.appendChild(box);
    }

    const filledShots = shots.filter(s => s !== null).length;
    document.getElementById('process').disabled = (filledShots !== maxShots);
}

async function countdown(sec) {
    countdownEl.style.opacity = 1;
    for (let i = sec; i > 0; i--) {
        countdownEl.textContent = i;
        await new Promise(r => setTimeout(r, 1000));
    }
    countdownEl.style.opacity = 0;
}

shutterBtn.onclick = async () => {
    if (isCounting) return;

    const filledShotsCount = shots.filter(s => s !== null).length;

    // 1. Validasi jika slot penuh
    if (replaceIndex === null && filledShotsCount >= maxShots) {
        if (confirm("Slot foto sudah penuh. Ingin menghapus foto terakhir dan mengambil ulang?")) {
            for (let i = shots.length - 1; i >= 0; i--) {
                if (shots[i] !== null) {
                    shots[i] = null;
                    break;
                }
            }
        } else {
            return;
        }
    }

    isCounting = true;
    await countdown(USER_SETTINGS.timer);

    flash.classList.add('flash');
    setTimeout(() => flash.classList.remove('flash'), 300);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    const data = canvas.toDataURL('image/png');

    if (replaceIndex !== null) {
        shots[replaceIndex] = data;
        replaceIndex = null;
    } else {
        let emptySlotIndex = shots.findIndex(slot => slot === null);

        if (emptySlotIndex !== -1 && emptySlotIndex < maxShots) {
            shots[emptySlotIndex] = data;
        } else if (shots.length < maxShots) {
            shots.push(data);
        }
    }

    updatePreview();
    isCounting = false;
};

function getContrastColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

window.updateLiveSettings = function () {
    USER_SETTINGS.filter = document.getElementById('filterEditor').value;
    USER_SETTINGS.frameColor = document.getElementById('frameColorEditor').value;
    USER_SETTINGS.storeColor = document.getElementById('storeColorEditor').value;
    USER_SETTINGS.useStoreColor = document.getElementById('useStoreColor').checked;
    USER_SETTINGS.textPrimary = document.getElementById('textPrimaryEditor').value;
    USER_SETTINGS.textSecondary = document.getElementById('textSecondaryEditor').value;
    USER_SETTINGS.emoji = document.getElementById('emojiSelectEditor').value;
    USER_SETTINGS.dateMode = document.getElementById('dateModeEditor').value;

    const hasBackground = USER_SETTINGS.bgImage !== null;
    const customDateInput = document.getElementById('customDateEditor');
    USER_SETTINGS.customDate = customDateInput.value;
    customDateInput.style.display = (USER_SETTINGS.dateMode === 'custom') ? 'block' : 'none';

    const bgFile = document.getElementById('bgUploadEditor').files[0];
    const isUpload = bgFile !== undefined;
    const removeUploadBtn = document.getElementById('removeUploadBtn');
    const removeTextureBtn = document.getElementById('removeTextureBtn');

    const storeInput = document.getElementById('storeColorEditor');
    const frameInput = document.getElementById('frameColorEditor');
    const storeCheckbox = document.getElementById('useStoreColor');

    USER_SETTINGS.useStoreColor = storeCheckbox.checked;
    USER_SETTINGS.storeColor = storeInput.value;

    storeInput.style.display = storeCheckbox.checked ? 'block' : 'none';

    if (hasBackground) {
        storeInput.style.opacity = "0.4";
        storeInput.style.pointerEvents = "none";
        frameInput.style.opacity = "0.4";
        frameInput.style.pointerEvents = "none";
        storeCheckbox.disabled = true;
    } else {
        storeInput.style.opacity = "1";
        storeInput.style.pointerEvents = "auto";
        frameInput.style.opacity = "1";
        frameInput.style.pointerEvents = "auto";
        storeCheckbox.disabled = false;
        storeInput.style.display = USER_SETTINGS.useStoreColor ? 'block' : 'none';
    }

    if (isUpload) {
        storeInput.style.opacity = "0.5";
        frameInput.style.opacity = "0.5";
        storeCheckbox.disabled = true;
    } else {
        storeInput.style.opacity = "1";
        frameInput.style.opacity = "1";
        storeCheckbox.disabled = false;
        storeInput.style.display = USER_SETTINGS.useStoreColor ? 'block' : 'none';
    }

    if (bgFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            USER_SETTINGS.bgImage = e.target.result;
            if (removeUploadBtn) removeUploadBtn.style.display = 'flex';
            if (removeTextureBtn) removeTextureBtn.style.display = 'none';

            document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));

            makeCollage();
        };
        reader.readAsDataURL(bgFile);
    } else {
        makeCollage();
    }
};


function initTextureGallery() {
    const gallery = document.getElementById('textureGallery');
    const removeUploadBtn = document.getElementById('removeUploadBtn');
    const removeTextureBtn = document.getElementById('removeTextureBtn');
    if (!gallery) return;

    gallery.innerHTML = '';
    TEXTURES.forEach(file => {
        const div = document.createElement('div');
        div.className = 'texture-item';
        const fullPath = TEXTURE_PATH + file;
        div.style.backgroundImage = `url('${fullPath}')`;

        if (USER_SETTINGS.bgImage === fullPath) div.classList.add('active');

        div.onclick = () => {
            USER_SETTINGS.bgImage = fullPath;

            document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');

            if (removeTextureBtn) removeTextureBtn.style.display = 'block';
            if (removeUploadBtn) removeUploadBtn.style.display = 'none';

            const uploadInput = document.getElementById('bgUploadEditor');
            if (uploadInput) uploadInput.value = '';

            makeCollage();
        };
        gallery.appendChild(div);
    });
}

window.removeSpecificBg = function (type) {
    USER_SETTINGS.bgImage = null;

    if (type === 'upload') {
        const uploadInput = document.getElementById('bgUploadEditor');
        if (uploadInput) uploadInput.value = '';
        document.getElementById('removeUploadBtn').style.display = 'none';
    } else {
        document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
        document.getElementById('removeTextureBtn').style.display = 'none';
    }

    makeCollage();
};
function syncEditorInputs() {
    if (!document.getElementById('filterEditor')) return;
    document.getElementById('filterEditor').value = USER_SETTINGS.filter;
    document.getElementById('frameColorEditor').value = USER_SETTINGS.frameColor;
    document.getElementById('textPrimaryEditor').value = USER_SETTINGS.textPrimary;
    document.getElementById('textSecondaryEditor').value = USER_SETTINGS.textSecondary;
    document.getElementById('emojiSelectEditor').value = USER_SETTINGS.emoji;
    document.getElementById('dateModeEditor').value = USER_SETTINGS.dateMode;

    initTextureGallery();

    const removeBtn = document.getElementById('removeBgEditor');
    if (removeBtn) {
        removeBtn.style.display = USER_SETTINGS.bgImage ? 'flex' : 'none';
    }

    const today = new Date().toISOString().split("T")[0];
    document.getElementById('customDateEditor').setAttribute('max', today);
}

window.removeBackground = function () {
    USER_SETTINGS.bgImage = null;

    const uploadInput = document.getElementById('bgUploadEditor');
    if (uploadInput) uploadInput.value = '';

    const removeBtn = document.getElementById('removeBgEditor');
    if (removeBtn) removeBtn.style.display = 'none';

    document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));

    makeCollage();
};

/* ================= COLLAGE LOGIC ================= */
async function makeCollage() {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');

    const margin = 40;
    const photoW = 375;
    const photoH = 500;

    const isDoubleStrip = maxShots > 3;
    const shotsPerStrip = isDoubleStrip ? Math.ceil(maxShots / 2) : maxShots;
    const singleStripW = photoW + (margin * 2);

    offCanvas.width = isDoubleStrip ? (singleStripW * 2) : singleStripW;
    offCanvas.height = (photoH * shotsPerStrip) + (margin * (shotsPerStrip + 1)) + 180;

    offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);

    const renderStripSection = async (offsetX, startIndex, isRightStrip) => {
        const stripRect = { x: offsetX, y: 0, w: singleStripW, h: offCanvas.height };
        let textColor = "#000000";

        const hasBackground = USER_SETTINGS.bgImage !== null;
        const borderThickness = (USER_SETTINGS.useStoreColor && !hasBackground) ? 15 : 0;
        const isUpload = USER_SETTINGS.bgImage && !USER_SETTINGS.bgImage.includes(TEXTURE_PATH);

        if (hasBackground) {
            const bgImg = new Image();
            bgImg.src = USER_SETTINGS.bgImage;
            await new Promise(r => bgImg.onload = r);

            const isTexture = USER_SETTINGS.bgImage.includes(TEXTURE_PATH);
            drawImageToRect(offCtx, bgImg, stripRect, isTexture ? 'fit' : 'cover');

            textColor = getContrastColor(getAverageColor(bgImg));
        } else {

            if (USER_SETTINGS.useStoreColor) {
                offCtx.fillStyle = USER_SETTINGS.storeColor;
                offCtx.fillRect(stripRect.x, stripRect.y, stripRect.w, stripRect.h);
            }

            const innerRect = {
                x: stripRect.x + borderThickness,
                y: stripRect.y + borderThickness,
                w: stripRect.w - (borderThickness * 2),
                h: stripRect.h - (borderThickness * 2)
            };

            offCtx.fillStyle = USER_SETTINGS.frameColor;
            offCtx.fillRect(innerRect.x, innerRect.y, innerRect.w, innerRect.h);
            textColor = getContrastColor(USER_SETTINGS.frameColor);
        }

        if (isUpload) {
            const bgImg = new Image();
            bgImg.src = USER_SETTINGS.bgImage;
            await new Promise(r => bgImg.onload = r);

            drawImageToRect(offCtx, bgImg, stripRect, 'cover');
            textColor = getContrastColor(getAverageColor(bgImg));
        } else {

            if (USER_SETTINGS.useStoreColor) {
                offCtx.fillStyle = USER_SETTINGS.storeColor;
                offCtx.fillRect(stripRect.x, stripRect.y, stripRect.w, stripRect.h);
            }

            const innerRect = {
                x: stripRect.x + borderThickness,
                y: stripRect.y + borderThickness,
                w: stripRect.w - (borderThickness * 2),
                h: stripRect.h - (borderThickness * 2)
            };

            if (USER_SETTINGS.bgImage) {
                const bgImg = new Image();
                bgImg.src = USER_SETTINGS.bgImage;
                await new Promise(r => bgImg.onload = r);

                offCtx.save();
                offCtx.beginPath();
                offCtx.rect(innerRect.x, innerRect.y, innerRect.w, innerRect.h);
                offCtx.clip();
                drawImageToRect(offCtx, bgImg, innerRect, 'fit');
                offCtx.restore();
                textColor = getContrastColor(getAverageColor(bgImg));
            } else {
                offCtx.fillStyle = USER_SETTINGS.frameColor;
                offCtx.fillRect(innerRect.x, innerRect.y, innerRect.w, innerRect.h);
                textColor = getContrastColor(USER_SETTINGS.frameColor);
            }
        }

        // --- 2. GAMBAR FOTO ---
        for (let i = 0; i < shotsPerStrip; i++) {
            const currentIdx = startIndex + i;
            if (!shots[currentIdx]) continue;

            const img = new Image();
            img.src = shots[currentIdx];
            await new Promise(r => img.onload = r);

            const posX = offsetX + margin;
            const posY = margin + i * (photoH + margin);

            offCtx.save();
            offCtx.filter = FILTERS[USER_SETTINGS.filter] || 'none';

            const targetRatio = photoW / photoH;
            const imgRatio = img.width / img.height;
            let sx, sy, sw, sh;
            if (imgRatio > targetRatio) {
                sh = img.height; sw = img.height * targetRatio;
                sx = (img.width - sw) / 2; sy = 0;
            } else {
                sw = img.width; sh = img.width / targetRatio;
                sx = 0; sy = (img.height - sh) / 2;
            }

            offCtx.drawImage(img, sx, sy, sw, sh, posX, posY, photoW, photoH);
            offCtx.restore();

            // Tambahkan garis pinggir pada foto jika store color aktif (Optional tapi bagus)
            /*if (USER_SETTINGS.useStoreColor && !isUpload) {
                 offCtx.strokeStyle = USER_SETTINGS.storeColor;
                 offCtx.lineWidth = 4;
                 offCtx.strokeRect(posX, posY, photoW, photoH);
             }*/

            if (USER_SETTINGS.emoji) {
                offCtx.save();
                offCtx.fillStyle = textColor;
                offCtx.font = "45px Arial";
                offCtx.textAlign = "center";
                offCtx.textBaseline = "middle";
                offCtx.fillText(USER_SETTINGS.emoji, posX + photoW - 35, posY + 35);
                offCtx.fillText(USER_SETTINGS.emoji, posX + 35, posY + (photoH / 2));
                offCtx.fillText(USER_SETTINGS.emoji, posX + photoW - 35, posY + photoH - 35);
                offCtx.restore();
            }
        }

        // 3. RENDER TEKS
        offCtx.save();
        offCtx.fillStyle = textColor;
        offCtx.textAlign = "center";
        const centerX = offsetX + (singleStripW / 2);
        let textY = offCanvas.height - 120;

        let primary = USER_SETTINGS.textPrimary;
        let secondary = USER_SETTINGS.textSecondary;

        if (isDoubleStrip && isRightStrip) {
            primary = USER_SETTINGS.textPrimaryRight || USER_SETTINGS.textPrimary;
            secondary = USER_SETTINGS.textSecondaryRight || USER_SETTINGS.textSecondary;
        }

        if (primary) {
            offCtx.font = "bold 40px Arial";
            offCtx.fillText(primary, centerX, textY);
            textY += 45;
        }
        if (secondary) {
            offCtx.font = "22px Arial";
            offCtx.fillText(secondary, centerX, textY);
        }

        let dateStr = "";
        if (USER_SETTINGS.dateMode === 'auto') {
            const d = new Date();
            dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } else if (USER_SETTINGS.dateMode === 'custom' && USER_SETTINGS.customDate) {
            const p = USER_SETTINGS.customDate.split('-');
            if (p.length === 3) dateStr = `${p[2]}/${p[1]}/${p[0]}`;
        }
        if (dateStr) {
            offCtx.font = "italic 18px Arial";
            offCtx.fillText(dateStr, centerX, offCanvas.height - 35);
        }
        offCtx.restore();
    };

    // Render Strip Pertama (Selalu Ada)
    await renderStripSection(0, 0, false);

    // Render Strip Kedua (Hanya jika foto > 3)
    if (isDoubleStrip) {
        await renderStripSection(singleStripW, shotsPerStrip, true);
        if (USER_SETTINGS.useStoreColor) {
            offCtx.fillStyle = USER_SETTINGS.storeColor;
            offCtx.fillRect(singleStripW - 5, 0, 10, offCanvas.height);
        }
    }

    collage.width = offCanvas.width;
    collage.height = offCanvas.height;
    cctx.drawImage(offCanvas, 0, 0);

    // Navigasi Layar
    if (boothScreen.classList.contains('active') || boothScreen.style.display !== 'none') {
        boothScreen.classList.remove('active');
        boothScreen.style.display = 'none';
        resultScreen.style.display = 'flex';
        resultScreen.classList.add('active');
    }
}

function drawImageToRect(targetCtx, img, rect, mode = 'cover') {
    const imgRatio = img.width / img.height;
    const rectRatio = rect.w / rect.h;
    let sx, sy, sw, sh;

    if (mode === 'fit') {
        targetCtx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    } else {
        if (imgRatio > rectRatio) {
            sh = img.height;
            sw = img.height * rectRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = img.width / rectRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
        }
        targetCtx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
    }
}

/* ================= EVENT HANDLERS ================= */
document.getElementById('process').onclick = () => {
    syncEditorInputs();
    makeCollage();
};

function resetToDefaultSettings() {
    // 1. Reset Data Objek
    USER_SETTINGS.filter = 'normal';
    USER_SETTINGS.frameColor = '#ffffffff';
    USER_SETTINGS.useStoreColor = false;
    USER_SETTINGS.bgImage = null;
    USER_SETTINGS.textPrimary = '';
    USER_SETTINGS.textSecondary = '';
    USER_SETTINGS.emoji = '';
    USER_SETTINGS.dateMode = 'auto';
    USER_SETTINGS.customDate = '';


    // 2. Reset Visual Input (Layar Editor)
    if (document.getElementById('filterEditor')) {
        document.getElementById('filterEditor').value = 'normal';
        document.getElementById('frameColorEditor').value = '#ffffffff';
        document.getElementById('storeColorEditor').value = '#ffffffff';
        document.getElementById('textPrimaryEditor').value = '';
        document.getElementById('textSecondaryEditor').value = '';
        document.getElementById('emojiSelectEditor').value = '';
        document.getElementById('dateModeEditor').value = 'auto';
        document.getElementById('bgUploadEditor').value = '';
    }

    // 3. Reset Filter Kamera
    video.style.filter = FILTERS['normal'];

    // 4. Sembunyikan tombol hapus background
    const removeBtn = document.getElementById('removeBgEditor');
    if (removeBtn) removeBtn.style.display = 'none';

    if (document.getElementById('useStoreColor')) {
        document.getElementById('useStoreColor').checked = false;
        document.getElementById('storeColorEditor').style.display = 'none';
    }
}

function resetBooth() {
    shots = [];
    currentShot = 0;
    replaceIndex = null;

    resetToDefaultSettings();
    updatePreview();
    goToStep(1);

    resultScreen.classList.remove('active');
    resultScreen.style.display = 'none';
    boothScreen.style.display = 'grid';
    boothScreen.classList.add('active');
}