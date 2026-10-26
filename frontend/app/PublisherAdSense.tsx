const ADSENSE_CLIENT_ID = "ca-pub-9705526044129947";

export function PublisherAdSense() {
  return (
    <script
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
    />
  );
}
