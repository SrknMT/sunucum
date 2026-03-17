const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ====================================================
// MERKEZİ İSTİHBARAT SİSTEMİ (Önbellek & Tarihçe Kaptanı)
// ====================================================
let globalMarketData = null; // Arayüzün çökmemesi için orijinal veriyi tuttuğumuz yer
let marketLedger = {};       // 7/24 Fiyat ve Stok Geçmişini arşivleyen gizli kasamız
let lastUpdate = "Henüz güncellenmedi";

async function updateMarketData() {
    try {
        console.log("📡 Market verileri Mixyero'dan çekiliyor...");
        const response = await fetch("https://mixyero.online/api_market_data.php", {
            headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        
        if (!response.ok) throw new Error("Market API yanıt vermedi.");
        
        const dataText = await response.text();
        const dataJson = JSON.parse(dataText);
        
        globalMarketData = dataJson; // Eski sistem için ham veriyi sakla
        
        // --- 7/24 TARİHÇE (GRAFİK) KAYIT İŞLEMİ ---
        const now = Date.now();
        let itemsList = Array.isArray(dataJson.data) ? dataJson.data : (Array.isArray(dataJson) ? dataJson : Object.values(dataJson.data || dataJson));

        itemsList.forEach(apiItem => {
            let name = apiItem.item || apiItem.name || apiItem.id;
            if (!name) return;
            
            let price = apiItem.price || apiItem.avgPrice || apiItem.minPrice || 0;
            let supply = apiItem.supply || apiItem.volume || apiItem.stock || apiItem.quantity || 0;

            // Ürün kasada yoksa sıfırdan oluştur
            if (!marketLedger[name]) {
                marketLedger[name] = { price: price, oldPrice: price, supply: supply, oldSupply: supply, history: [] };
            }

            let current = marketLedger[name];
            
            // Fiyat veya stok değişmişse eski veriyi oldPrice/oldSupply'a kaydır, yenisini yaz
            if (current.price !== price || current.supply !== supply) {
                current.oldPrice = current.price;
                current.oldSupply = current.supply;
                current.price = price;
                current.supply = supply;
            }
            
            // Grafiğin kesintisiz çizilmesi için o anki fiyatı zamana damgalayıp arşive at
            current.history.push({ t: now, p: price });
            
            // Sunucunun RAM'i dolup çökmesin diye sadece son 50 fiyat hareketini (yaklaşık 12 saatlik kesintisiz grafik) tutuyoruz
            if (current.history.length > 50) {
                current.history.shift();
            }
        });

        lastUpdate = new Date().toLocaleTimeString('tr-TR');
        console.log(`[BAŞARILI] Piyasa güncellendi ve arşive işlendi! Saat: ${lastUpdate}`);
        
    } catch (err) {
        console.error("[HATA] Arka plan market güncellemesi başarısız:", err.message);
    }
}

// Sunucu başlar başlamaz ilk veriyi çek
updateMarketData();

// Her 15 dakikada bir veriyi otomatik yenile (Limitlere takılmamak ve uyumamak için)
setInterval(updateMarketData, 15 * 60 * 1000);

// ----------------------------------------------------
// 0. UPTIME PING KAPISI (Sunucuyu 7/24 Uyanık Tutar)
// ----------------------------------------------------
app.get("/ping", (req, res) => {
    res.status(200).send("PONG - Sunucu ayakta ve çalışıyor!");
});

// ----------------------------------------------------
// 1. ESKİ UYGULAMANI BOZMAYAN MARKET API'Sİ
// ----------------------------------------------------
app.get("/market", (req, res) => {
    if (!globalMarketData) {
        return res.status(503).json({ error: "Market verileri hazırlanıyor..." });
    }
    // Eski uygulamanın bozulmaması için orijinal ham veriyi gönderiyoruz
    res.json(globalMarketData);
});

// YENİ: Oyuna girmesen bile biriken 7/24 grafik ve stok verisini sunan kapı
app.get("/api/istihbarat", (req, res) => {
    res.json({ lastUpdate: lastUpdate, ledger: marketLedger });
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
