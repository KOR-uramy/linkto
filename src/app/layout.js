import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "LinkTo - 스마트 링크 라우터",
  description: "유튜브/SNS 영상 링크와 쿠팡 파트너스 링크만 넣으면 영상 썸네일 카드가 자동으로 만들어집니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="ambient-bg">
          <div className="glow-blob-1"></div>
          <div className="glow-blob-2"></div>
        </div>
        {children}
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      </body>
    </html>
  );
}
