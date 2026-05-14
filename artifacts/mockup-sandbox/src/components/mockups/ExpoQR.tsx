const EXPO_URL = "exp://93a180ab-f851-4f9e-a4d5-106346b99fa7-00-8qtxl6nehjyn.expo.janeway.replit.dev";
const WEB_URL  = "https://93a180ab-f851-4f9e-a4d5-106346b99fa7-00-8qtxl6nehjyn.expo.janeway.replit.dev";

const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&color=22d3ee&bgcolor=0d0f14&data=${encodeURIComponent(EXPO_URL)}`;

export default function ExpoQR() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0d0f14",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "32px 24px",
      boxSizing: "border-box",
      gap: 24,
    }}>
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#22d3ee", letterSpacing: 0.5 }}>
          maum-alarm
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
          Expo Go 앱으로 스캔하세요
        </p>
      </div>

      {/* QR code */}
      <div style={{
        backgroundColor: "#0d0f14",
        border: "2px solid #22d3ee40",
        borderRadius: 20,
        padding: 8,
        boxShadow: "0 0 40px #22d3ee18",
      }}>
        <img
          src={QR_SRC}
          alt="Expo QR Code"
          width={280}
          height={280}
          style={{ display: "block", borderRadius: 12 }}
        />
      </div>

      {/* Step instructions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
        {[
          { step: "1", text: "스마트폰에 Expo Go 앱 설치" },
          { step: "2", text: "Expo Go 실행 → 카메라로 QR 스캔" },
          { step: "3", text: "maum-alarm 앱이 바로 실행됩니다" },
        ].map(({ step, text }) => (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: "#22d3ee20",
              border: "1px solid #22d3ee50",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#22d3ee",
              flexShrink: 0,
            }}>{step}</div>
            <span style={{ fontSize: 13, color: "#d1d5db" }}>{text}</span>
          </div>
        ))}
      </div>

      {/* URL chip */}
      <div style={{
        backgroundColor: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 10,
        padding: "10px 16px",
        fontSize: 11,
        color: "#6b7280",
        textAlign: "center",
        width: "100%",
        maxWidth: 320,
        boxSizing: "border-box",
        wordBreak: "break-all",
      }}>
        <span style={{ color: "#374151" }}>또는 웹 브라우저: </span>
        <a href={WEB_URL} target="_blank" rel="noreferrer"
          style={{ color: "#22d3ee", textDecoration: "none" }}>
          {WEB_URL.replace("https://", "")}
        </a>
      </div>
    </div>
  );
}
