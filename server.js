const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 1. MARKET API (Eski onlineveri)
// ----------------------------------------------------
app.get("/market", async (req, res) => {
    try {
        const response = await fetch("https://mixyero.online/api_market_data.php", {
            headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        if (!response.ok) throw new Error("Market API yanıt vermedi.");
        const data = await response.text();
        res.json(JSON.parse(data));
    } catch (err) { 
        res.status(500).json({ error: "Market hatası: " + err.message }); 
    }
});

// ----------------------------------------------------
// 2. LAND RADAR API (Eski lands)
// ----------------------------------------------------
app.post('/api/search', async (req, res) => {
    try {
        const payload = req.body;
        const response = await fetch('https://voxels-extension.com/hub/search/?hub_search_api=1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Radar hatası: " + response.status);
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
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            body: JSON.stringify({ searchTerm: username })
        });

        if (!response.ok) throw new Error("Oyuncu verisi alınamadı.");
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Oyuncu verisi çekilemedi: " + err.message });
    }
});

// ----------------------------------------------------
// ANA SAYFA (Dashboard)
// ----------------------------------------------------
app.get("/", (req, res) => {
    res.send(`
        <body style="font-family:sans-serif; background:#130822; color:white; text-align:center; padding:50px;">
            <h1 style="color:#ccff00;">🚀 Pixels Birleşik API Paneli</h1>
            <p>Tüm sistemler Render üzerinde tek sunucuda birleşti.</p>
            <div style="background:#201036; padding:20px; border-radius:10px; display:inline-block; border:1px solid #4c1d95; text-align:left;">
                <b style="color:#a78bfa;">Aktif Servisler:</b><br><br>
                ✅ <span style="color:#ccff00;">Market:</span> <code>/market</code> (GET)<br>
                ✅ <span style="color:#ccff00;">Radar:</span> <code>/api/search</code> (POST)<br>
                ✅ <span style="color:#ccff00;">Player:</span> <code>/api/oyuncu/:isim</code> (GET)
            </div>
            <p style="margin-top:20px; font-size:12px; color:#555;">Sunucu Durumu: Aktif</p>
        </body>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu ${PORT} portunda aktif!`);
});
