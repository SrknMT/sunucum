const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ====================================================
// MERKEZİ İSTİHBARAT SİSTEMİ (Önbellek / Cache)
// ====================================================
let globalMarketData = null;
let lastUpdate = "Henüz güncellenmedi";

async function updateMarketData() {
    try {
        console.log("Market verileri Mixyero'dan çekiliyor...");
        const response = await fetch("https://mixyero.online/api_market_data.php", {
            headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        
        if (!response.ok) throw new Error("Market API yanıt vermedi.");
        
        const data = await response.text();
        // Veriyi sunucunun RAM'ine alıyoruz
        globalMarketData = JSON.parse(data);
        lastUpdate = new Date().toLocaleTimeString('tr-TR');
        
        console.log(`[BAŞARILI] Piyasa güncellendi! Saat: ${lastUpdate}`);
    } catch (err) {
        console.error("[HATA] Arka plan market güncellemesi başarısız:", err.message);
    }
}

// Sunucu başlar başlamaz ilk veriyi çek
updateMarketData();

// Her 30 dakikada bir veriyi otomatik yenile (Limitlere takılmamak için)
setInterval(updateMarketData, 30 * 60 * 1000);

// ----------------------------------------------------
// 1. ESKİ UYGULAMANI BOZMAYAN MARKET API'Sİ
// ----------------------------------------------------
app.get("/market", (req, res) => {
    if (!globalMarketData) {
        return res.status(503).json({ error: "Market verileri hazırlanıyor..." });
    }
    // DİKKAT: Eski uygulaman nasıl bekliyorsa veriyi TIPA TIP aynı formatta gönderiyoruz!
    // Sadece Mixyero'dan değil, bizim hızlı RAM'imizden gidiyor.
    res.json(globalMarketData);
});

// (Yeni Radar ve İstihbarat için ekstra bir kapı açtık, eskisini ellemedik)
app.get("/api/istihbarat", (req, res) => {
    res.json({ lastUpdate: lastUpdate, data: globalMarketData });
});

// ----------------------------------------------------
// 2. LAND RADAR API (Eski lands)
// ----------------------------------------------------
app.post('/api/search', async (req, res) => {
    try {
        const payload = req.body;
        const response = await fetch('https://voxels-extension.com/hub/search/?hub_search_api=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Radar hatası");
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----------------------------------------------------
// 3. OYUNCU İSTATİSTİK API (Eski player)
// ----------------------------------------------------
app.get('/api/oyuncu/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const targetApiUrl = 'https://mixyero.online/playerpage.php';

        const response = await fetch(targetApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            body: JSON.stringify({ searchTerm: username })
        });

        if (!response.ok) throw new Error("Oyuncu verisi alınamadı.");
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Oyuncu verisi çekilemedi: " + err.message });
    }
});

app.get("/", (req, res) => {
    res.send(`<body style="background:#130822; color:#ccff00; text-align:center; padding:50px; font-family:sans-serif;"><h1>🚀 Pixels API Aktif</h1><p>Son Güncelleme: ${lastUpdate}</p></body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu ${PORT} portunda aktif!`);
});
