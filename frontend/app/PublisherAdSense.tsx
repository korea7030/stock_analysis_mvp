import Script from "next/script";

const ADSENSE_CLIENT_ID = "ca-pub-9705526044129947";

export function PublisherAdSense() {
  return (
    <Script
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
