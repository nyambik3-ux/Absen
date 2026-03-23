const URL_GAS = "https://script.google.com/macros/s/AKfycbz1ZWd53vUvNvoZDzn7swrQDzkzw-RLO4TxUilQAQ4-3r1slJ9wbc-VL4MYXJ_ZfFaOKQ/exec";
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const video = document.getElementById('video');
const statusText = document.getElementById('status');
const userDisplay = document.getElementById('user-display');
const logList = document.getElementById('log-list');

let currentDescriptor = null;
let labeledFaceDescriptors = [];
let faceMatcher = null;

// Update Jam Real-time
setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleString('id-ID', { 
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
}, 1000);

// Inisialisasi AI & Kamera
async function init() {
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        
        // Ambil data user terdaftar untuk Recognition
        await refreshUserDatabase();

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('scanner').classList.remove('hidden');
        statusText.innerText = "Sistem Siap Digunakan";
    } catch (err) {
        statusText.innerText = "Gagal Memuat Kamera/AI";
        console.error(err);
    }
}

// Ambil Database Wajah dari Google Sheets
async function refreshUserDatabase() {
    try {
        const res = await fetch(URL_GAS + "?action=getUsers");
        const users = await res.json();
        
        if (users.length > 0) {
            labeledFaceDescriptors = users.map(u => {
                const desc = new Float32Array(JSON.parse(u.descriptor));
                return new faceapi.LabeledFaceDescriptors(u.nama, [desc]);
            });
            faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
            console.log("Database Wajah Dimuat.");
        }
    } catch (e) { console.log("Database kosong atau gagal muat."); }
}

// Loop Deteksi Wajah
video.addEventListener('play', () => {
    setInterval(async () => {
        const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
            currentDescriptor = detection.descriptor;
            if (faceMatcher) {
                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                userDisplay.innerText = bestMatch.label.toUpperCase();
                userDisplay.classList.replace('text-slate-400', 'text-emerald-400');
            } else {
                userDisplay.innerText = "Wajah Terdeteksi (Belum Terdaftar)";
            }
        } else {
            currentDescriptor = null;
            userDisplay.innerText = "Mencari Wajah...";
            userDisplay.classList.replace('text-emerald-400', 'text-slate-400');
        }
    }, 1000);
});

// Fungsi Registrasi Baru
async function registerFace() {
    const nama = document.getElementById('reg-name').value;
    if (!nama || !currentDescriptor) return alert("Lengkapi nama dan pastikan wajah terlihat!");

    statusText.innerText = "Menyimpan ke Database...";
    const payload = {
        type: 'REGISTER',
        nama: nama,
        descriptor: Array.from(currentDescriptor)
    };

    await fetch(URL_GAS, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    alert("Registrasi Berhasil!");
    location.reload();
}

// Fungsi Absen Datang/Pulang
async function prosesAbsen(tipe) {
    if (!currentDescriptor) return alert("Wajah tidak terdeteksi!");
    
    let namaUser = "Unknown";
    if (faceMatcher) {
        const match = faceMatcher.findBestMatch(currentDescriptor);
        if (match.label === "unknown") return alert("Wajah tidak dikenal! Silakan daftar dulu.");
        namaUser = match.label;
    } else {
        return alert("Database wajah kosong. Daftar dulu!");
    }

    statusText.innerText = "Mengambil Lokasi GPS...";
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const payload = {
            type: 'ABSEN',
            nama: namaUser,
            status: tipe,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        statusText.innerText = "Mengirim Absensi...";
        await fetch(URL_GAS, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        
        // Update UI sederhana
        const log = document.createElement('p');
        log.innerText = `> ${namaUser} | ${tipe} | Berhasil`;
        logList.prepend(log);

        alert(`Terima Kasih ${namaUser}, Absen ${tipe} Berhasil dicatat.`);
        statusText.innerText = "Selesai!";
    }, (err) => alert("Harap aktifkan GPS untuk absen!"));
}

init();
