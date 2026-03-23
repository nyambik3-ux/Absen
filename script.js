const URL_GAS = "https://script.google.com/macros/s/AKfycby-khigEY4-TEJVuHxearwrA-tMTacy0FXdv2--G-Bk9jBgAQEX6iIxrv4-rnRzX5uF/exec";
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const video = document.getElementById('video');
const status = document.getElementById('status');
let currentDescriptor = null;

// Clock Akurat
setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString();
}, 1000);

async function init() {
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('scanner').classList.remove('hidden');
        status.innerText = "Siap! Hadap kamera & pilih menu.";
    } catch (err) { alert("Error Init: " + err); }
}

// Deteksi Wajah Kontinu
video.addEventListener('play', () => {
    setInterval(async () => {
        const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
        if (detection) {
            currentDescriptor = detection.descriptor;
            status.innerText = "Wajah Terdeteksi ✅";
        } else {
            currentDescriptor = null;
            status.innerText = "Mencari Wajah... 🔍";
        }
    }, 1000);
});

// FUNGSI DAFTAR KARYAWAN
async function registerFace() {
    const nama = document.getElementById('reg-name').value;
    if (!nama || !currentDescriptor) return alert("Nama kosong atau wajah belum terdeteksi!");

    const payload = {
        type: 'REGISTER',
        nama: nama,
        descriptor: Array.from(currentDescriptor)
    };

    status.innerText = "Mendaftarkan...";
    await fetch(URL_GAS, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    alert("Karyawan " + nama + " Berhasil Masuk Database!");
    location.reload();
}

// FUNGSI ABSEN DATANG/PULANG + GPS
function prosesAbsen(tipe) {
    if (!currentDescriptor) return alert("Wajah belum terdeteksi!");

    status.innerText = "Mengambil Lokasi GPS...";
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const payload = {
            type: 'ABSEN',
            nama: "User Terdeteksi", // Nanti bisa diupgrade dengan Face Matching
            status: tipe,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        status.innerText = "Mengirim Data Absen...";
        await fetch(URL_GAS, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        
        alert("Absen " + tipe + " Berhasil!\nLokasi: " + payload.lat + ", " + payload.lng);
        location.reload();
    }, (err) => {
        alert("Gagal ambil GPS. Pastikan izin lokasi aktif!");
    });
}

init();
