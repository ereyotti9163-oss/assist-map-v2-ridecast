// 地図の初期化
const map = L.map('map', { center: [34.882, 135.698], zoom: 16, zoomControl: false });

L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 20, attribution: '© CyclOSM'
}).addTo(map);

let userMarker, isFollowing = false;

// 現在地取得
map.on('locationfound', (e) => {
    if (!userMarker) {
        userMarker = L.circleMarker(e.latlng, {
            radius: 9, color: '#FFFFFF', weight: 3, fillOpacity: 1, fillColor: '#007AFF'
        }).addTo(map);
    } else {
        userMarker.setLatLng(e.latlng);
    }
    if (isFollowing) { map.setView(e.latlng, 17); }
});
map.locate({ watch: true, enableHighAccuracy: true });

// 追従ボタン
const followBtn = document.getElementById('follow-btn');
followBtn.onclick = () => {
    isFollowing = !isFollowing;
    followBtn.classList.toggle('active', isFollowing);
    if (isFollowing && userMarker) { map.setView(userMarker.getLatLng(), 17); }
};

map.on('dragstart', () => {
    isFollowing = false;
    followBtn.classList.remove('active');
});

// 風向・風速取得 (Ride Cast機能)
async function fetchWindData() {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=34.882&longitude=135.698&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Asia%2FTokyo`);
        const data = await response.json();
        const speed = data.current.wind_speed_10m;
        const deg = data.current.wind_direction_10m;
        
        const arrows = ['↓北', '↙北東', '←東', '↖南東', '↑南', '↗南西', '→西', '↘北西'];
        const arrow = arrows[Math.round(deg / 45) % 8];
        
        document.getElementById('wind-data').innerHTML = `風速: <strong>${speed}m/s</strong><br>風向き: <strong>${arrow}</strong>`;
    } catch (e) {
        document.getElementById('wind-data').innerText = "取得失敗";
    }
}
fetchWindData();
setInterval(fetchWindData, 600000); // 10分更新

// 検索機能 (Nominatim JSONP)
window.handleSearchResponse = function(data) {
    if (data && data.length > 0) {
        isFollowing = false;
        followBtn.classList.remove('active');
        const latlng = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        map.setView(latlng, 15);
        L.marker(latlng).addTo(map).bindPopup(data[0].display_name).openPopup();
        document.getElementById('search-input').blur();
    } else {
        alert("見つかりませんでした。");
    }
    const oldScript = document.getElementById('search-script');
    if (oldScript) oldScript.remove();
};

function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    const script = document.createElement('script');
    script.id = 'search-script';
    script.src = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&json_callback=handleSearchResponse`;
    document.body.appendChild(script);
}
document.getElementById('search-button').onclick = performSearch;
document.getElementById('search-input').onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };

// PWA サービスワーカー登録
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
}
