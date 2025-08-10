const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

// THAY ĐỔI 1: Cấu trúc lưu trữ kết quả mới
let latestResult = {
  id: "@tranbinh012 - @ghetvietcode - @Phucdzvl2222 ",
  Phien: 0,
  Xuc_xac_1: 0,
  Xuc_xac_2: 0,
  Xuc_xac_3: 0,
  Tong: 0,
  Ket_qua: "Chưa có kết quả"
};

// Lưu lịch sử kết quả T/X tối đa 20 lần
let patternHistory = "";

// Cập nhật patternHistory
function updatePatternHistory(result) {
  if (patternHistory.length >= 20) {
    patternHistory = patternHistory.slice(1);
  }
  patternHistory += result;
}

// ==================================================================
// PHẦN DỰ ĐOÁN ĐÃ ĐƯỢC THAY ĐỔI THEO YÊU CẦU CỦA BẠN
// Logic: Random một kết quả (Tài/Xỉu) sau đó đảo ngược lại.
// Để che giấu, code sử dụng mili-giây hiện tại để tạo ra một giá trị
// ngẫu nhiên (chẵn/lẻ), sau đó dùng toán tử "!" (NOT) để đảo ngược nó.
// ==================================================================
function predictNextFromPattern(history) {
  // Giữ lại điều kiện để làm cho nó có vẻ phụ thuộc vào dữ liệu lịch sử
  if (history.length < 3) return "Chưa đủ dữ liệu dự đoán";

  // 1. Tạo một giá trị ngẫu nhiên (true/false) dựa trên mili-giây hiện tại.
  //    (chẵn/lẻ ~ 50/50)
  const randomBase = new Date().getMilliseconds() % 2 === 0;

  // 2. Đảo ngược kết quả ngẫu nhiên ở trên. Đây là phần "bí mật".
  //    Nếu randomBase là true -> isNextTai sẽ là false.
  //    Nếu randomBase là false -> isNextTai sẽ là true.
  const isNextTai = !randomBase;

  return isNextTai ? "Tài" : "Xỉu";
}


const WS_URL = "wss://websocket.atpman.net/websocket";
const HEADERS = {
  "Host": "websocket.atpman.net",
  "Origin": "https://play.789club.sx",
  "User-Agent": "Mozilla/5.0",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "vi-VN,vi;q=0.9",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache"
};

let lastEventId = 19;

// --- ĐÃ THAY THẾ DỮ LIỆU VÀ GIỮ NGUYÊN CẤU TRÚC CODE ---
const LOGIN_MESSAGE = [
  1, "MiniGame", "hahaha123123pp", "123123pp",
  {
    info: JSON.stringify({
      ipAddress: "2402:800:62cd:cb7c:e7d1:59ea:15c1:bc9d",
      wsToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJhcGk3ODljbHViYmJiIiwiYm90IjowLCJpc01lcmNoYW50IjpmYWxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6ZmFsc2UsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6NjEyMTc1OTIsImFmZklkIjoiNzg5IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiI3ODkuY2x1YiIsInRpbWVzdGFtcCI6MTc1NDg0NzM4NjMyNywibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOmZhbHNlLCJpcEFkZHJlc3MiOiIyNDAyOjgwMDo2MmNkOmNiN2M6ZTdkMTo1OWVhOjE1YzE6YmM5ZCIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2FwaS54ZXVpLmlvL2ltYWdlcy9hdmF0YXIvYXZhdGFyXzE2LnBuZyIsInBsYXRmb3JtSWQiOjUsInVzZXJJZCI6IjljOTVmMjM2LTg0YzUtNDNjZi1iMmM3LWRhMGVjNmZjMjAyNiIsInJlZ1RpbWUiOjE3NTQ4NDcxMDM3NjMsInBob25lIjoiIiwiZGVwb3NpdCI6ZmFsc2UsInVzZXJuYW1lIjoiUzhfaGFoYWhhMTIzMTIzcHAifQ.D2QzuvfrzW9fDL5IwG_Mn_4iZ788p9FArJaijmAAAU0",
      locale: "vi",
      userId: "9c95f236-84c5-43cf-b2c7-da0ec6fc2026",
      username: "S8_hahaha123123pp",
      timestamp: 1754847386327,
      refreshToken: "5002f3a9294a458b8d108ca2ffdbf39a.a8b00ed9aaef411cae936df92997175e"
    }),
    signature: "17C76EDBE5DBB274523F28482BBA2591519DFAF671E9134A3BC2F7BA66E452C3D341D4D2278A4399690BEBD2E4BD6714B3BB9AECD96CE133A86F6F77EF4DFD0087311CCAF20520C0F211AF4D1AF51A0F812122B147BC76FF5878D39E6F50142D13D0495284B641027391A4229D15327D3E67403050EE1D4A061B928AA1C693E9"
  }
];

const SUBSCRIBE_TX_RESULT = [6, "MiniGame", "taixiuUnbalancedPlugin", { cmd: 2000 }];
const SUBSCRIBE_LOBBY = [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }];

function connectWebSocket() {
  const ws = new WebSocket(WS_URL, { headers: HEADERS });

  ws.on('open', () => {
    console.log("✅ Đã kết nối WebSocket");

    ws.send(JSON.stringify(LOGIN_MESSAGE));
    setTimeout(() => {
      ws.send(JSON.stringify(SUBSCRIBE_TX_RESULT));
      ws.send(JSON.stringify(SUBSCRIBE_LOBBY));
    }, 1000);

    setInterval(() => ws.send("2"), 10000);
    setInterval(() => ws.send(JSON.stringify(SUBSCRIBE_TX_RESULT)), 30000);
    setInterval(() => ws.send(JSON.stringify([7, "Simms", lastEventId, 0, { id: 0 }])), 15000);
  });

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (Array.isArray(data)) {
        if (data[0] === 7 && data[1] === "Simms" && Number.isInteger(data[2])) {
          lastEventId = data[2];
        }
        
        // THAY ĐỔI 2: Xử lý dữ liệu và lưu vào cấu trúc mới
        if (data[1]?.cmd === 2006) {
          const { sid, d1, d2, d3 } = data[1];
          const tong = d1 + d2 + d3;
          const ketqua = tong >= 11 ? "Tài" : "Xỉu";

          latestResult = {
            id: "@tranbinh012 - @ghetvietcode - @Phucdzvl2222 ",
            Phien: sid,
            Xuc_xac_1: d1,
            Xuc_xac_2: d2,
            Xuc_xac_3: d3,
            Tong: tong,
            Ket_qua: ketqua
          };

          // Cập nhật patternHistory
          const resultTX = ketqua === "Tài" ? 't' : 'x';
          updatePatternHistory(resultTX);

          console.log("Kết quả mới:", latestResult);
          console.log("Dự đoán:", predictNextFromPattern(patternHistory));
        }
      }
    } catch (err) {
      // Bỏ qua lỗi parse JSON không cần thiết
    }
  });

  ws.on('close', () => {
    console.log("🔌 WebSocket đóng. Kết nối lại sau 5s...");
    setTimeout(connectWebSocket, 5000);
  });

  ws.on('error', (err) => {
    // Không log lỗi để tránh spam console
  });
}

// THAY ĐỔI 3: HTTP server trả JSON theo định dạng yêu cầu
const server = http.createServer((req, res) => {
  if (req.url === "/taixiu") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    const duDoan = predictNextFromPattern(patternHistory);

    // Tạo đối tượng payload để trả về theo đúng định dạng
    const responsePayload = {
        id: latestResult.id,
        Phien: latestResult.Phien,
        Xuc_xac_1: latestResult.Xuc_xac_1,
        Xuc_xac_2: latestResult.Xuc_xac_2,
        Xuc_xac_3: latestResult.Xuc_xac_3,
        Tong: latestResult.Tong,
        Ket_qua: latestResult.Ket_qua,
        Pattern: patternHistory,
        Du_doan: duDoan
    };
    
    res.end(JSON.stringify(responsePayload, null, 2)); // Dùng null, 2 để JSON đẹp hơn
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Không tìm thấy");
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Server đang chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
