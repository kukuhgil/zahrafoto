
const FILTERS = {
    normal: 'contrast(1.05) brightness(1.02) saturate(1.1)',
    bw: 'grayscale(1) contrast(1.4) brightness(0.95)',
    vintage: 'sepia(0.5) contrast(0.9) brightness(1.05) hue-rotate(-10deg)',
    soft: 'brightness(1.15) saturate(1.1) contrast(0.9)',
    country: 'sepia(0.3) saturate(1.4) contrast(1.05) brightness(0.95)',
    dv: 'contrast(1.5) saturate(0.4) brightness(1.1) hue-rotate(20deg)',
    instax: 'contrast(1.25) saturate(1.6) brightness(1.05) hue-rotate(5deg)',
    nordic: 'saturate(0.6) contrast(1.1) brightness(1.05) hue-rotate(15deg) sepia(0.1)',
    midnight: 'contrast(1.2) brightness(0.9) saturate(0.8) hue-rotate(180deg) brightness(1.1)',
    cyber: 'contrast(1.3) saturate(2.5) hue-rotate(-40deg) brightness(1.1)',
    faded: 'contrast(0.8) brightness(1.15) saturate(0.8) sepia(0.2)',
    candy: 'saturate(2) contrast(1.1) brightness(1.05) hue-rotate(-5deg)',
    noir: 'grayscale(1) contrast(2) brightness(0.7)',
    golden: 'sepia(0.45) saturate(1.7) contrast(1) brightness(1.1) hue-rotate(-20deg)',
    ocean: 'hue-rotate(160deg) saturate(0.8) contrast(1.1) brightness(1.05)',
    retro: 'sepia(0.2) contrast(1.3) brightness(1) saturate(1.5) hue-rotate(-10deg)',
    bloom: 'brightness(1.2) saturate(1.2) contrast(0.9)',
    glitch: 'contrast(1.5) saturate(2) hue-rotate(90deg) opacity(0.8)'
};

const USER_SETTINGS = {
    timer: null,
    count: null,
    filter: 'normal',
    frameColor: '#ffffff',
    storeColor: '#000000',
    useStoreColor: false,
    bgImage: null,
    textPrimaryEditor: '',
    textSecondary: '',
    emoji: '',
    dateModeEditor: 'auto',
    customDate: '',
    frameID: null
};

const TEXTURE_PATH = 'texture/';
const FRAME_PATH = 'frame/';
const TEXTURES = ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png', '9.png', '10.png', '11.png', '12.png', '13.png', '14.png', '15.png'];

const appFlow = ['startScreen', 'tutorialScreen', 'setupScreen', 'boothScreen', 'resultScreen'];
let currentFlowIndex = 0;


let shots = [];
let maxShots = 2;
let currentShot = 0;
let replaceIndex = null;
let isCounting = false;
let activeFilter = 'normal';
let currentStep = 1;
let isMirrored = true;
let currentDeviceId = null;
let frameCoordinates = {};


const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const collage = document.getElementById('collage');
const flash = document.getElementById('flash');
const countdownEl = document.getElementById('countdown');
const previewStrip = document.getElementById('previewStrip');
const shutterBtn = document.getElementById('shutterBtn');
const mirrorBtn = document.getElementById('mirrorBtn');


document.addEventListener('DOMContentLoaded', () => {
    initCameraList();
    initTextureGallery();
    initFrameGallery();
    setupEventListeners();
    loadFrameCoordinates();

    isMirrored = true;
    if (video) {
        video.classList.add('mirrored');
    }
});

function renderFrameTemplateSelection() {
    console.log('🔍 renderFrameTemplateSelection dipanggil, count:', USER_SETTINGS.count);

    const container = document.getElementById('frameGrid');
    if (!container) return;

    container.innerHTML = '';

    // Update photo count indicator
    const photoCountText = document.querySelector('.photo-count-text');
    if (photoCountText) {
        photoCountText.innerHTML = `
            Jumlah foto yang dipilih: <strong>${USER_SETTINGS.count} foto</strong> • 
            Ukuran: <strong>${USER_SETTINGS.count === 1 ? '5×10cm' : '5×15cm'}</strong>
        `;
    }

    // SELALU tampilkan "Tanpa Frame" (custom texture)
    const noFrameCard = document.createElement('div');
    noFrameCard.className = 'frame-card';
    noFrameCard.setAttribute('data-type', 'noframe');
    noFrameCard.innerHTML = `
        <div class="frame-preview">
            <i data-feather="box" class="frame-icon"></i>
        </div>
        <div class="frame-info">
            <div class="frame-title">Tanpa Frame</div>
            <div class="frame-desc">Custom warna & texture</div>
        </div>
        <div class="frame-badge">CUSTOM</div>
    `;
    noFrameCard.onclick = (e) => {
        e.stopPropagation();
        selectFrameTemplate(null);
    };

    // Default pilih "Tanpa Frame" kalau belum ada pilihan
    if (!USER_SETTINGS.frameID) {
        noFrameCard.classList.add('active');
        document.getElementById('confirmFrameBtn').disabled = false;
    }

    container.appendChild(noFrameCard);

    // ========== CEK APAKAH ADA DATA TEMPLATE ==========
    const count = USER_SETTINGS.count;
    const templates = frameCoordinates[count]?.templates;

    if (!templates || Object.keys(templates).length === 0) {
        console.log(`ℹ️ Tidak ada template untuk ${count} foto, hanya tampilkan custom`);
        feather.replace();
        return; // BERHENTI DI SINI, tidak render template apa-apa
    }

    // HANYA render template jika ada di JSON
    console.log(`🎨 Ada ${Object.keys(templates).length} template untuk ${count} foto`);

    Object.keys(templates).forEach(templateId => {
        const template = templates[templateId];

        if (!template || !template.fileName) {
            console.warn(`Template ${templateId} tidak valid`);
            return;
        }

        const frameCard = document.createElement('div');
        frameCard.className = 'frame-card';
        frameCard.setAttribute('data-type', 'template');
        frameCard.setAttribute('data-template-id', templateId);

        const previewUrl = `frame/${count}/${template.fileName}`;

        frameCard.innerHTML = `
            <div class="frame-preview" style="background-image: url('${previewUrl}')"></div>
            <div class="frame-info">
                <div class="frame-title">${template.displayName || `Template ${templateId}`}</div>
                <div class="frame-desc">${template.type || 'Layout'} • ${count} foto</div>
            </div>
            <div class="frame-badge">${(template.type || 'TEMPLATE').toUpperCase()}</div>
        `;

        frameCard.onclick = (e) => {
            e.stopPropagation();
            selectFrameTemplate(templateId);
        };

        if (USER_SETTINGS.frameID === templateId) {
            frameCard.classList.add('active');
            document.getElementById('confirmFrameBtn').disabled = false;
        }

        container.appendChild(frameCard);
    });

    feather.replace();
}

// Fungsi fallback jika tidak ada data di frameCoordinates
function renderFallbackTemplates(container, count) {
    console.log('Menggunakan fallback templates 1-10');
    for (let i = 1; i <= 10; i++) {
        const templateId = i.toString();
        const frameCard = document.createElement('div');
        frameCard.className = 'frame-card';
        frameCard.setAttribute('data-type', 'template');
        frameCard.setAttribute('data-template-id', templateId);

        const previewUrl = `frame/${count}/${templateId}.png`;

        frameCard.innerHTML = `
            <div class="frame-preview" style="background-image: url('${previewUrl}')"></div>
            <div class="frame-info">
                <div class="frame-title">Template ${templateId}</div>
                <div class="frame-desc">Layout untuk ${count} foto</div>
            </div>
            <div class="frame-badge">TEMPLATE</div>
            <div class="frame-dimensions">${count === 1 ? '5×10cm' : '5×15cm'}</div>
        `;

        frameCard.onclick = (e) => {
            e.stopPropagation();
            selectFrameTemplate(templateId);
        };

        if (USER_SETTINGS.frameID === templateId) {
            frameCard.classList.add('active');
            document.getElementById('confirmFrameBtn').disabled = false;
        }

        container.appendChild(frameCard);
    }
}
async function loadFrameCoordinates() {
    try {
        const response = await fetch('data/frame-coordinates.json');
        frameCoordinates = await response.json();
    } catch (error) {
        console.error("Gagal load frame coordinates:", error);
        frameCoordinates = {};
    }
}


function setupEventListeners() {

    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-theme', darkModeToggle.checked);
        });
    }

    if (mirrorBtn) {

        mirrorBtn.onclick = null;


        mirrorBtn.addEventListener('click', function () {
            video.classList.toggle('mirrored');
            updateMirrorState();
            console.log('Mirror mode toggled:', isMirrored ? 'ON' : 'OFF');
        });
    }


    const manualUpload = document.getElementById('manualUpload');
    if (manualUpload) {
        manualUpload.addEventListener('change', handleManualUpload);
    }


    const nextStepBtn = document.getElementById('nextStep');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', handleNextStep);
    }

    const prevStepBtn = document.getElementById('prevStep');
    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', () => {
            if (currentStep > 1) goToStep(currentStep - 1);
        });
    }


    const downloadBtn = document.getElementById('download');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }


    const dateModeSelect = document.getElementById('dateModeEditor');
    if (dateModeSelect) {
        dateModeSelect.addEventListener('change', handleDateModeChange);
    }


    const liveToggle = document.getElementById('liveToggle');
    if (liveToggle) {
        liveToggle.addEventListener('change', function () {
            toggleLiveMode(this);
        });
    }


    const cameraSelect = document.getElementById('cameraSelect');
    if (cameraSelect) {
        cameraSelect.addEventListener('change', async function () {
            currentDeviceId = this.value;
            if (document.getElementById('boothScreen').style.display !== 'none') {
                await startVideo();
            }
        });
    }
    const skipFrameBtn = document.getElementById('skipFrameBtn');
    if (skipFrameBtn) {
        skipFrameBtn.addEventListener('click', () => {
            USER_SETTINGS.frameID = null;
            USER_SETTINGS.frameCoordinates = null;
            showScreen('boothScreen');
        });
    }

    const confirmFrameBtn = document.getElementById('confirmFrameBtn');
    if (confirmFrameBtn) {
        confirmFrameBtn.addEventListener('click', () => {
            showScreen('boothScreen');
        });
    }
}


function initTextureGallery() {
    const gallery = document.getElementById('textureGallery');
    if (!gallery) return;

    gallery.innerHTML = '';
    TEXTURES.forEach(file => {
        const div = document.createElement('div');
        div.className = 'texture-item';
        const fullPath = TEXTURE_PATH + file;
        div.style.backgroundImage = `url('${fullPath}')`;

        if (USER_SETTINGS.bgImage === fullPath) {
            div.classList.add('active');
            document.getElementById('removeTextureBtn').style.display = 'flex';
        }

        div.onclick = () => {
            USER_SETTINGS.bgImage = fullPath;
            document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');

            document.getElementById('removeTextureBtn').style.display = 'flex';
            document.getElementById('removeUploadBtn').style.display = 'none';

            const uploadInput = document.getElementById('bgUploadEditor');
            if (uploadInput) uploadInput.value = '';

            makeCollage();
        };
        gallery.appendChild(div);
    });
}

function initFrameGallery() {
    const gallery = document.getElementById('frameTemplateGallery');
    if (!gallery) return;

    gallery.innerHTML = '';
    const frames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

    frames.forEach(id => {
        const item = document.createElement('div');
        item.className = 'texture-item';
        const fullPath = `${FRAME_PATH}${maxShots}/${id}.png`;

        item.style.backgroundImage = `url('${fullPath}')`;
        item.style.backgroundSize = 'contain';
        item.style.backgroundRepeat = 'no-repeat';
        item.style.backgroundPosition = 'center';

        if (USER_SETTINGS.frameID === id) {
            item.classList.add('active');
            const removeFrameBtn = document.getElementById('removeFrameBtn');
            if (removeFrameBtn) removeFrameBtn.style.display = 'block';
        }

        item.onclick = () => {
            USER_SETTINGS.frameID = id;
            document.querySelectorAll('#frameTemplateGallery .texture-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            const removeFrameBtn = document.getElementById('removeFrameBtn');
            if (removeFrameBtn) removeFrameBtn.style.display = 'block';

            makeCollage();
        };

        gallery.appendChild(item);
    });
}


function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = (screenId === 'boothScreen') ? 'grid' : 'flex';
        setTimeout(() => target.classList.add('active'), 50);

        currentFlowIndex = appFlow.indexOf(screenId);


        const globalNav = document.getElementById('mainNavigation');
        if (globalNav) {
            const layarAktifNavbar = ['tutorialScreen', 'setupScreen', 'boothScreen'];
            globalNav.style.display = layarAktifNavbar.includes(screenId) ? 'flex' : 'none';
        }

        if (screenId === 'boothScreen') {
            renderBoothFilters();
            startVideo();
            updatePreview();
        } else if (screenId === 'resultScreen') {
            syncEditorInputs();
            setTimeout(() => {
                if (shots.length > 0) makeCollage();
            }, 100);
        }
    }
}


let selectedSettings = { timer: null, count: null };

function updateSelection(type, value, element) {
    selectedSettings[type] = parseInt(value);
    const column = element.closest('.setup-column');
    column.querySelectorAll('.selection-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');


    const nextBtn = document.getElementById('globalNext');
    if (selectedSettings.timer !== null && selectedSettings.count !== null) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = "1";
    }
}

function confirmSetup() {
    USER_SETTINGS.timer = selectedSettings.timer;
    USER_SETTINGS.count = selectedSettings.count;
    maxShots = USER_SETTINGS.count;
    shots = [];
    currentShot = 0;
    replaceIndex = null;

    // Reset frame template selection
    USER_SETTINGS.frameID = null;
    USER_SETTINGS.frameCoordinates = null;

    // Render frame template selection
    renderFrameTemplateSelection();

    // Tampilkan frame template screen
    showScreen('frameTemplateScreen');
}

function selectFrameTemplate(templateId) {
    // Update seleksi visual
    document.querySelectorAll('.frame-card').forEach(card => {
        card.classList.remove('active');
    });

    // Cari card yang diklik berdasarkan templateId
    const selectedCard = document.querySelector(`.frame-card[data-template-id="${templateId}"]`) ||
        document.querySelector('.frame-card[data-type="noframe"]');

    if (selectedCard) {
        selectedCard.classList.add('active');
    }

    // Simpan pilihan
    USER_SETTINGS.frameID = templateId;

    // Jika memilih template, load koordinatnya
    if (templateId && frameCoordinates && frameCoordinates[USER_SETTINGS.count]) {
        USER_SETTINGS.frameCoordinates = frameCoordinates[USER_SETTINGS.count].templates[templateId];
    } else {
        USER_SETTINGS.frameCoordinates = null;
    }

    // Aktifkan tombol konfirmasi
    const confirmFrameBtn = document.getElementById('confirmFrameBtn');
    if (confirmFrameBtn) {
        confirmFrameBtn.disabled = false;
    }

    console.log('Frame template selected:', templateId);
}

async function initCameraList() {
    const select = document.getElementById('cameraSelect');
    if (!select) return;

    try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        select.innerHTML = '';
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            select.appendChild(option);
        });

        select.onchange = async () => {
            currentDeviceId = select.value;
            if (document.getElementById('boothScreen').style.display !== 'none') {
                startVideo();
            }
        };

        if (videoDevices.length > 0) currentDeviceId = videoDevices[0].deviceId;
    } catch (err) {
        console.error("Gagal mendeteksi kamera");
        select.innerHTML = '<option>Akses Kamera Ditolak</option>';
    }
}

async function startVideo() {
    if (window.stream) {
        window.stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.stream = stream;
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
    } catch (err) {
        console.error("Gagal memulai kamera");
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = basicStream;
    }
}


async function countdown(sec) {
    countdownEl.style.opacity = 1;
    for (let i = sec; i > 0; i--) {
        countdownEl.textContent = i;
        await new Promise(r => setTimeout(r, 1000));
    }
    countdownEl.style.opacity = 0;
}

shutterBtn.onclick = async function () {
    if (isCounting) return;

    if (shots.length === 0) {
        shots = new Array(maxShots).fill(null);
    }

    let emptyIdx = shots.findIndex(slot => slot === null);

    if (replaceIndex === null && emptyIdx === -1) {
        if (confirm("Slot foto sudah penuh. Ingin reset semua dan ambil ulang?")) {
            shots = new Array(maxShots).fill(null);
            updatePreview();
            emptyIdx = 0;
            const globalNext = document.getElementById('globalNext');
            if (globalNext) globalNext.disabled = true;
        } else {
            return;
        }
    }

    isCounting = true;
    const loopStart = (replaceIndex !== null) ? 0 : (emptyIdx === -1 ? 0 : emptyIdx);
    const loopEnd = (replaceIndex !== null) ? 1 : maxShots;

    for (let i = loopStart; i < loopEnd; i++) {
        let targetIndex = (replaceIndex !== null) ? replaceIndex : i;
        if (replaceIndex === null && shots[targetIndex]) continue;

        await countdown(USER_SETTINGS.timer);
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 300);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        ctx.save();
        ctx.filter = FILTERS[activeFilter] || 'none';

        if (isMirrored && video.classList.contains('mirrored')) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const data = canvas.toDataURL('image/png');
        shots[targetIndex] = data;
        updatePreview();

        if (replaceIndex !== null) {
            replaceIndex = null;
            break;
        }

        if (i < loopEnd - 1) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    USER_SETTINGS.filter = activeFilter;
    isCounting = false;
};


function updateMirrorState() {

    isMirrored = video.classList.contains('mirrored');

    console.log('Mirror updated:', isMirrored ? 'ON' : 'OFF');


    if (mirrorBtn) {
        const icon = mirrorBtn.querySelector('i');
        if (icon) {
            feather.replace();
        }
    }
}

function updatePreview() {
    if (!previewStrip) return;

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
        }
        previewStrip.appendChild(box);
    }

    const filledShots = shots.filter(s => s !== null).length;
    const isFull = (filledShots === maxShots);
    const globalNextBtn = document.getElementById('globalNext');

    if (globalNextBtn) {
        globalNextBtn.disabled = !isFull;
        globalNextBtn.style.opacity = isFull ? "1" : "0.3";
        if (isFull) {
            globalNextBtn.classList.add('pulse-animation');
        } else {
            globalNextBtn.classList.remove('pulse-animation');
        }
    }
}


function renderBoothFilters() {
    const filterWrapper = document.getElementById('boothFilterList');
    if (!filterWrapper) return;

    filterWrapper.innerHTML = '';
    Object.keys(FILTERS).forEach(key => {
        const card = document.createElement('div');
        card.className = `filter-item-card ${activeFilter === key ? 'active' : ''}`;
        card.innerText = key;

        card.onclick = () => {
            activeFilter = key;
            video.style.filter = FILTERS[key];
            document.querySelectorAll('.filter-item-card').forEach(el => el.classList.remove('active'));
            card.classList.add('active');
        };
        filterWrapper.appendChild(card);
    });
}

function scrollFilter(direction) {
    const wrapper = document.getElementById('boothFilterList');
    const amount = 300;
    wrapper.scrollLeft += direction === 'left' ? -amount : amount;
}


function syncEditorInputs() {
    if (!document.getElementById('textPrimaryEditor')) return;

    document.getElementById('frameColorEditor').value = USER_SETTINGS.frameColor || '#ffffff';
    document.getElementById('storeColorEditor').value = USER_SETTINGS.storeColor || '#000000';
    document.getElementById('useStoreColor').checked = USER_SETTINGS.useStoreColor || false;
    document.getElementById('textPrimaryEditor').value = USER_SETTINGS.textPrimaryEditor || '';
    document.getElementById('textSecondaryEditor').value = USER_SETTINGS.textSecondary || '';
    document.getElementById('emojiSelectEditor').value = USER_SETTINGS.emoji || '';
    document.getElementById('dateModeEditor').value = USER_SETTINGS.dateModeEditor || 'auto';
    document.getElementById('customDateEditor').value = USER_SETTINGS.customDate || '';


    document.getElementById('storeColorEditor').style.display = USER_SETTINGS.useStoreColor ? 'block' : 'none';


    const customDateInput = document.getElementById('customDateEditor');
    if (USER_SETTINGS.dateModeEditor === 'custom') {
        customDateInput.style.display = 'block';

        const today = new Date().toISOString().split("T")[0];
        customDateInput.setAttribute('max', today);
    } else {
        customDateInput.style.display = 'none';
    }

    const frameTemplateSection = document.getElementById('step3').querySelector('.editor-group:last-child');
    if (frameTemplateSection) {
        if (USER_SETTINGS.frameID) {
            frameTemplateSection.style.display = 'none';
        } else {
            frameTemplateSection.style.display = 'block';
        }
    }
}

window.updateLiveSettings = function () {

    USER_SETTINGS.textPrimaryEditor = document.getElementById('textPrimaryEditor').value;
    USER_SETTINGS.textSecondary = document.getElementById('textSecondaryEditor').value;
    USER_SETTINGS.emoji = document.getElementById('emojiSelectEditor').value;
    USER_SETTINGS.frameColor = document.getElementById('frameColorEditor').value;
    USER_SETTINGS.storeColor = document.getElementById('storeColorEditor').value;
    USER_SETTINGS.useStoreColor = document.getElementById('useStoreColor').checked;
    USER_SETTINGS.dateModeEditor = document.getElementById('dateModeEditor').value;

    const customDateInput = document.getElementById('customDateEditor');
    if (USER_SETTINGS.dateModeEditor === 'custom') {
        USER_SETTINGS.customDate = customDateInput.value;
        customDateInput.style.display = 'block';
    } else {
        USER_SETTINGS.customDate = '';
        customDateInput.style.display = 'none';
    }

    document.getElementById('storeColorEditor').style.display = USER_SETTINGS.useStoreColor ? 'block' : 'none';


    triggerMakeCollage();
};

function handleDateModeChange() {
    const dateMode = this.value;
    USER_SETTINGS.dateModeEditor = dateMode;

    const customDateInput = document.getElementById('customDateEditor');
    if (dateMode === 'custom') {
        customDateInput.style.display = 'block';

        if (!customDateInput.value) {
            const today = new Date().toISOString().split("T")[0];
            customDateInput.value = today;
            USER_SETTINGS.customDate = today;
        }
    } else {
        customDateInput.style.display = 'none';
        USER_SETTINGS.customDate = '';
    }

    triggerMakeCollage();
}

function triggerMakeCollage() {
    if (window.collageTimeout) clearTimeout(window.collageTimeout);

    window.collageTimeout = setTimeout(() => {
        if (shots && shots.length > 0 && shots.some(s => s !== null)) {
            makeCollage();
        }
    }, 100);
}


function handleManualUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        if (shots.length < maxShots) {
            shots.push(event.target.result);
            updatePreview();
        } else {
            alert("Slot foto sudah penuh!");
        }
    };
    reader.readAsDataURL(file);
}

function handleBackgroundUpload(inputElement) {
    if (!inputElement.files || inputElement.files.length === 0) return;

    const bgFile = inputElement.files[0];
    if (!bgFile.type.startsWith('image/')) {
        alert("Hanya file gambar yang diizinkan!");
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        USER_SETTINGS.bgImage = e.target.result;
        document.getElementById('removeUploadBtn').style.display = 'flex';
        document.getElementById('removeTextureBtn').style.display = 'none';
        document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
        triggerMakeCollage();
    };
    reader.readAsDataURL(bgFile);
}

window.removeSpecificBg = function (type) {
    if (type === 'upload') {
        USER_SETTINGS.bgImage = null;
        document.getElementById('removeUploadBtn').style.display = 'none';
        const uploadInput = document.getElementById('bgUploadEditor');
        if (uploadInput) uploadInput.value = '';
    } else if (type === 'texture') {
        USER_SETTINGS.bgImage = null;
        document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
        document.getElementById('removeTextureBtn').style.display = 'none';
    }
    triggerMakeCollage();
};

function removeFrameTemplate() {
    USER_SETTINGS.frameID = null;
    document.querySelectorAll('#frameTemplateGallery .texture-item').forEach(el => el.classList.remove('active'));
    const removeFrameBtn = document.getElementById('removeFrameBtn');
    if (removeFrameBtn) removeFrameBtn.style.display = 'none';
    makeCollage();
}

function clearCurrentShots() {
    if (confirm("Hapus semua foto yang baru saja diambil?")) {
        shots = [];
        currentShot = 0;
        previewStrip.innerHTML = '';
        const globalNext = document.getElementById('globalNext');
        if (globalNext) {
            globalNext.disabled = true;
            globalNext.style.opacity = "0.3";
        }
    }
}


function getContrastColor(hexColor) {
    if (!hexColor) return '#000000';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

function getAverageColor(imgElement) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const width = tempCanvas.width = imgElement.naturalWidth || imgElement.width;
    const height = tempCanvas.height = imgElement.naturalHeight || imgElement.height;

    tempCtx.drawImage(imgElement, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, width, height).data;

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

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function drawZoomedImage(ctx, img, x, y, w, h, zoom) {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > targetRatio) {
        sh = img.height;
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = img.width / targetRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }

    const zoomW = sw / zoom;
    const zoomH = sh / zoom;
    const zoomX = sx + (sw - zoomW) / 2;
    const zoomY = sy + (sh - zoomH) / 2;

    ctx.drawImage(img, zoomX, zoomY, zoomW, zoomH, x, y, w, h);
}

function getFrameCoordinates(totalShots, index, canvasW, canvasH) {
    const marginSide = canvasW * 0.08;
    const marginTop = canvasH * 0.05;
    const gap = 20;
    const footerSpace = 180;

    let x, y, w, h;

    if (totalShots == 4) {
        w = (canvasW - (marginSide * 2) - gap) / 2;
        h = (canvasH - marginTop - footerSpace - gap) / 2;
        x = marginSide + (index % 2) * (w + gap);
        y = marginTop + Math.floor(index / 2) * (h + gap);
    } else {
        w = canvasW - (marginSide * 2);
        h = (canvasH - marginTop - footerSpace - (gap * (totalShots - 1))) / totalShots;
        x = marginSide;
        y = marginTop + (index * (h + gap));
    }

    return { x, y, w, h };

}

function drawImageToRect(targetCtx, img, rect, mode = 'cover', rotation = 0) {
    targetCtx.save();
    
    // Jika ada rotasi, apply transform
    if (rotation !== 0) {
        // Hitung pusat rotasi
        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;
        
        // Pindah ke pusat, rotasi, lalu kembali
        targetCtx.translate(centerX, centerY);
        targetCtx.rotate(rotation * Math.PI / 180);
        targetCtx.translate(-centerX, -centerY);
    }
    
    if (mode === 'fit') {
        targetCtx.drawImage(img, 0, 0, img.width, img.height, rect.x, rect.y, rect.w, rect.h);
    } else {
        const imgRatio = img.width / img.height;
        const rectRatio = rect.w / rect.h;
        let sx, sy, sw, sh;
        
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
    
    targetCtx.restore();
}

async function makeCollage() {
    if (!collage) return;

    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');

    // Deklarasi textColor di scope terluar
    let textColor = "#000000";

    // Tentukan apakah menggunakan frame template atau layout custom
    const useFrameTemplate = USER_SETTINGS.frameID && USER_SETTINGS.frameCoordinates;

    // Jika menggunakan frame template, gunakan koordinat dari JSON
    if (useFrameTemplate) {
        const frameData = USER_SETTINGS.frameCoordinates;

        // Set ukuran canvas dari frame data
        offCanvas.width = frameData.canvasWidth || 680;
        offCanvas.height = frameData.canvasHeight || 1690;

        // Clear canvas
        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);

        // Render background jika ada
        if (USER_SETTINGS.bgImage) {
            const bgImg = new Image();
            bgImg.src = USER_SETTINGS.bgImage;
            await new Promise(r => bgImg.onload = r);

            let mode = 'cover';
            if (USER_SETTINGS.bgImage.includes('texture/')) {
                mode = 'fit';
            }

            drawImageToRect(offCtx, bgImg, {
                x: 0,
                y: 0,
                w: offCanvas.width,
                h: offCanvas.height
            }, mode);

            // Tentukan warna teks berdasarkan background
            if (typeof getAverageColor === 'function') {
                textColor = getContrastColor(getAverageColor(bgImg));
            }
        } else {
            // Render warna background solid
            offCtx.fillStyle = USER_SETTINGS.useStoreColor ? USER_SETTINGS.storeColor : USER_SETTINGS.frameColor;
            offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

            if (USER_SETTINGS.useStoreColor) {
                const border = 15;
                offCtx.fillStyle = USER_SETTINGS.frameColor;
                offCtx.fillRect(border, border,
                    offCanvas.width - (border * 2),
                    offCanvas.height - (border * 2));
            }

            // Tentukan warna teks
            textColor = USER_SETTINGS.useStoreColor ?
                getContrastColor(USER_SETTINGS.storeColor) :
                getContrastColor(USER_SETTINGS.frameColor);
        }

        // Render foto-foto pada posisi yang ditentukan frame template
        for (let i = 0; i < Math.min(shots.length, frameData.photoCoordinates.length); i++) {
            if (shots[i]) {
                const img = new Image();
                img.src = shots[i];
                await new Promise(r => img.onload = r);

                const coord = frameData.photoCoordinates[i];
                const photoRect = {
                    x: Math.round(coord.x),
                    y: Math.round(coord.y),
                    w: Math.round(coord.width),
                    h: Math.round(coord.height)
                };

                offCtx.save();
                offCtx.filter = FILTERS[USER_SETTINGS.filter] || 'none';
                // Pakai rotation dari JSON (default 0)
                const rotation = coord.rotation || 0;
                drawImageToRect(offCtx, img, photoRect, 'cover', rotation);
                offCtx.restore();

                // Render emoji jika ada
                if (USER_SETTINGS.emoji && i === 0) {
                    offCtx.font = "35px Arial";
                    offCtx.fillStyle = textColor;
                    offCtx.fillText(USER_SETTINGS.emoji,
                        photoRect.x + 15,
                        photoRect.y + 40);
                }
            }
        }

        // Render frame template PNG di atas foto - FIXED!
        const frameImg = new Image();
        const templateId = USER_SETTINGS.frameID;
        const count = USER_SETTINGS.count;

        // Cari fileName dari frame coordinates
        let fileName = `${templateId}.png`; // default
        if (frameCoordinates[count] && frameCoordinates[count].templates[templateId]) {
            fileName = frameCoordinates[count].templates[templateId].fileName || fileName;
        }

        frameImg.src = `frame/${count}/${fileName}`;
        await new Promise(r => frameImg.onload = r);
        offCtx.drawImage(frameImg, 0, 0, offCanvas.width, offCanvas.height);

        // Render teks (judul, subtitle, tanggal)
        offCtx.fillStyle = textColor;
        offCtx.textAlign = "center";
        const centerX = offCanvas.width / 2;

        // Tentukan posisi teks berdasarkan jumlah foto
        let textY;
        if (count === 1) {
            textY = offCanvas.height - 100;
        } else {
            textY = offCanvas.height - 80;
        }

        // Render teks utama
        if (USER_SETTINGS.textPrimaryEditor) {
            offCtx.font = "bold 35px Arial";
            offCtx.fillText(USER_SETTINGS.textPrimaryEditor, centerX, textY);
            textY += 40;
        }

        // Render teks sekunder
        if (USER_SETTINGS.textSecondary) {
            offCtx.font = "20px Arial";
            offCtx.fillText(USER_SETTINGS.textSecondary, centerX, textY);
        }

        // Render tanggal
        let dateStr = "";
        if (USER_SETTINGS.dateModeEditor === 'auto') {
            const d = new Date();
            dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } else if (USER_SETTINGS.dateModeEditor === 'custom' && USER_SETTINGS.customDate) {
            const p = USER_SETTINGS.customDate.split('-');
            if (p.length === 3) {
                dateStr = `${p[2]}/${p[1]}/${p[0]}`;
            }
        }

        if (dateStr && USER_SETTINGS.dateModeEditor !== 'off') {
            offCtx.font = "italic 16px Arial";
            const dateY = count === 1 ? offCanvas.height - 40 : offCanvas.height - 30;
            offCtx.fillText(dateStr, centerX, dateY);
        }

    } else {
        // LOGIKA LAMA (untuk custom frame tanpa template)
        const margin = 40;
        const photoW = 600;
        const photoH = 450;
        const isDoubleStrip = maxShots > 3;
        const shotsPerStrip = isDoubleStrip ? Math.ceil(maxShots / 2) : maxShots;
        const singleStripW = photoW + (margin * 2);

        offCanvas.width = isDoubleStrip ? (singleStripW * 2) : singleStripW;
        offCanvas.height = (photoH * shotsPerStrip) + (margin * (shotsPerStrip + 1)) + 180;


        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);


        let useFramePNG = false;
        const frameImg = new Image();

        if (USER_SETTINGS.frameID) {
            const currentFramePath = `frame/${maxShots}/${USER_SETTINGS.frameID}.png`;
            frameImg.crossOrigin = "anonymous";
            frameImg.src = `${currentFramePath}?t=${Date.now()}`;

            try {
                await new Promise((resolve, reject) => {
                    frameImg.onload = () => { useFramePNG = true; resolve(); };
                    frameImg.onerror = () => { useFramePNG = false; resolve(); };
                });
            } catch { useFramePNG = false; }
        }

        const renderStripSection = async (offsetX, isRightStrip) => {
            const stripRect = { x: offsetX, y: 0, w: singleStripW, h: offCanvas.height };
            let textColor = "#000000";


            if (USER_SETTINGS.bgImage) {
                const bgImg = new Image();
                bgImg.src = USER_SETTINGS.bgImage;
                await new Promise(r => bgImg.onload = r);

                let mode = 'cover';

                if (USER_SETTINGS.bgImage.includes('texture/')) {
                    mode = 'fit';
                }

                else if (USER_SETTINGS.bgImage.startsWith('data:')) {
                    mode = 'cover';
                }


                drawImageToRect(offCtx, bgImg, stripRect, mode);


                if (typeof getAverageColor === 'function') {
                    textColor = getContrastColor(getAverageColor(bgImg));
                }
            } else {
                offCtx.fillStyle = USER_SETTINGS.useStoreColor ? USER_SETTINGS.storeColor : USER_SETTINGS.frameColor;
                offCtx.fillRect(stripRect.x, stripRect.y, stripRect.w, stripRect.h);

                if (USER_SETTINGS.useStoreColor) {
                    const border = 15;
                    offCtx.fillStyle = USER_SETTINGS.frameColor;
                    offCtx.fillRect(stripRect.x + border, stripRect.y + border,
                        stripRect.w - (border * 2), stripRect.h - (border * 2));
                }
                textColor = USER_SETTINGS.useStoreColor ?
                    getContrastColor(USER_SETTINGS.storeColor) :
                    getContrastColor(USER_SETTINGS.frameColor);
            }



            for (let i = 0; i < shotsPerStrip; i++) {
                let currentIdx = isDoubleStrip ? (isRightStrip ? (i * 2 + 1) : (i * 2)) : i;
                if (currentIdx >= maxShots || !shots[currentIdx]) continue;

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


                if (USER_SETTINGS.emoji) {
                    offCtx.font = "45px Arial";
                    offCtx.fillStyle = textColor;
                    offCtx.fillText(USER_SETTINGS.emoji, posX + 20, posY + 50);
                }
            }


            if (useFramePNG) {
                offCtx.drawImage(frameImg, offsetX, 0, singleStripW, offCanvas.height);
            }


            offCtx.fillStyle = textColor;
            offCtx.textAlign = "center";
            const centerX = offsetX + (singleStripW / 2);
            let textY = offCanvas.height - 120;


            if (USER_SETTINGS.textPrimaryEditor) {
                offCtx.font = "bold 40px Arial";
                offCtx.fillText(USER_SETTINGS.textPrimaryEditor, centerX, textY);
                textY += 45;
            }


            if (USER_SETTINGS.textSecondary) {
                offCtx.font = "22px Arial";
                offCtx.fillText(USER_SETTINGS.textSecondary, centerX, textY);
            }


            let dateStr = "";
            if (USER_SETTINGS.dateModeEditor === 'auto') {
                const d = new Date();
                dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            } else if (USER_SETTINGS.dateModeEditor === 'custom' && USER_SETTINGS.customDate) {
                const p = USER_SETTINGS.customDate.split('-');
                if (p.length === 3) {
                    dateStr = `${p[2]}/${p[1]}/${p[0]}`;
                }
            }

            if (dateStr && USER_SETTINGS.dateModeEditor !== 'off') {
                offCtx.font = "italic 18px Arial";
                offCtx.fillText(dateStr, centerX, offCanvas.height - 35);
            }
        };


        await renderStripSection(0, false);
        if (isDoubleStrip) {
            await renderStripSection(singleStripW, true);
        }
    }


    // Draw ke canvas utama
    collage.width = offCanvas.width;
    collage.height = offCanvas.height;
    const cctx = collage.getContext('2d');
    cctx.drawImage(offCanvas, 0, 0);
}


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

    if (step === 2) initFrameGallery();
    if (finalActions) finalActions.style.display = 'none';
    currentStep = step;
}

function handleNextStep() {
    if (currentStep < 3) {
        goToStep(currentStep + 1);
    } else {
        handleDownload();
    }
}

function handleDownload() {
    const pesan = "Apakah desain sudah sesuai? Foto akan didownload dan Anda akan kembali ke layar kamera.";

    if (confirm(pesan)) {
        const link = document.createElement('a');
        link.download = `photobooth-${Date.now()}.png`;
        link.href = collage.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resetBooth();
    }
}

function goNext() {
    const currentScreen = appFlow[currentFlowIndex];

    if (currentScreen === 'setupScreen') {
        if (selectedSettings.timer === null || selectedSettings.count === null) {
            alert("Mohon pilih durasi foto dan jumlah foto terlebih dahulu!");
            return;
        }
        confirmSetup();
    } else if (currentScreen === 'boothScreen') {
        const filledShots = shots.filter(s => s !== null).length;
        if (filledShots === maxShots) {
            const userSetuju = confirm("Apakah Anda sudah puas dengan hasil foto? Klik OK untuk memproses kolase.");
            if (userSetuju) {
                USER_SETTINGS.filter = activeFilter;
                makeCollage();
                showScreen('resultScreen');
            }
        } else {
            alert("Silahkan ambil semua foto terlebih dahulu!");
        }
    } else {
        currentFlowIndex++;
        showScreen(appFlow[currentFlowIndex]);
    }
}

function goBack() {
    if (currentFlowIndex > 0) {
        if (appFlow[currentFlowIndex] === 'boothScreen') {
            if (!confirm("Kembali ke setup akan menghapus foto yang sudah diambil. Lanjutkan?")) return;
            shots = [];
        }
        currentFlowIndex--;
        showScreen(appFlow[currentFlowIndex]);
    }
}

function resetBooth() {
    shots = [];
    currentShot = 0;
    selectedSettings = { timer: null, count: null };
    USER_SETTINGS.frameID = null;

    const globalNav = document.getElementById('mainNavigation');
    if (globalNav) globalNav.style.display = 'none';

    showScreen('startScreen');
}


function toggleLiveMode(checkbox) {
    const liveIndicator = document.getElementById('liveIndicator');
    if (checkbox.checked) {
        liveIndicator.style.background = '#ff4444';
        video.style.filter = FILTERS[activeFilter];
    } else {
        liveIndicator.style.background = '#ccc';
        video.style.filter = 'none';
    }
}