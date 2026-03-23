const URL_GAS = "https://script.google.com/macros/s/AKfycby-khigEY4-TEJVuHxearwrA-tMTacy0FXdv2--G-Bk9jBgAQEX6iIxrv4-rnRzX5uF/exec";
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const video = document.getElementById('video');
const status = document.getElementById('status');
const logList = document.getElementById('log-list');
let labeledDescriptors = [];
let faceMatcher = null;
let isProcessing = false;

async function init() {
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('scanner').classList.remove('hidden');
        status.innerText = "Sistem Siap!";
        
        // Load data user dari Sheets jika ada (Opsional: Butuh fungsi fetch data)
    } catch (err) {
        status.innerText = "Gagal: " + err.message;
    }
}

// Fungsi Daftar Wajah
async function registerFace() {
    const nama = document.getElementById('reg-name').value;
    if (!nama) return alert("Isi nama dulu!");

    status.innerText = "Merekam wajah...";
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detection) {
        const payload = {
            type: 'REGISTER',
            nama: nama,
            descriptor: Array.from(detection.descriptor)
        };
        
        await fetch(URL_GAS, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        alert("Wajah " + nama + " berhasil didaftarkan!");
        document.getElementById('reg-name').value = "";
        status.innerText = "Siap Absen Kembali";
    } else {
        alert("Wajah tidak terdeteksi, coba posisi lain.");
    }
}

// Loop Deteksi Absensi
video.addEventListener('play', () => {
    setInterval(async () => {
        if (isProcessing) return;

        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        
        if (detections.length > 0) {
            isProcessing = true;
            status.innerText = "Wajah Terdeteksi!";
            
            // Untuk versi simpel, kita kirim "User Terdeteksi"
            // Jika ingin matching, butuh load data descriptor dari Sheets
            await kirimAbsen("User Terdeteksi");
        }
    }, 3000);
});

async function kirimAbsen(nama) {
    await fetch(URL_GAS, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify({ type: 'ABSEN', nama: nama }) 
    });

    const item = document.createElement('div');
    item.className = "p-2 bg-blue-500/10 border border-blue-500/30 rounded text-[11px]";
    item.innerHTML = `<b>${nama}</b> berhasil absen pada ${new Date().toLocaleTimeString()}`;
    logList.prepend(item);

    setTimeout(() => { isProcessing = false; status.innerText = "Mencari wajah..."; }, 5000);
}

init();
