"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Curated company → primary web domain map for logo lookup.
 * Anything not listed falls back to `<normalized-name>.com`, which resolves
 * correctly for the large majority of single-word brand names.
 */
const DOMAINS: Record<string, string> = {
  meta: "meta.com",
  facebook: "facebook.com",
  google: "google.com",
  alphabet: "abc.xyz",
  amazon: "amazon.com",
  amazonwebservices: "aws.amazon.com",
  aws: "aws.amazon.com",
  microsoft: "microsoft.com",
  apple: "apple.com",
  netflix: "netflix.com",
  linkedin: "linkedin.com",
  bloomberg: "bloomberg.com",
  yelp: "yelp.com",
  airbnb: "airbnb.com",
  uber: "uber.com",
  lyft: "lyft.com",
  twitter: "x.com",
  x: "x.com",
  salesforce: "salesforce.com",
  oracle: "oracle.com",
  ibm: "ibm.com",
  adobe: "adobe.com",
  spotify: "spotify.com",
  snap: "snap.com",
  snapchat: "snapchat.com",
  pinterest: "pinterest.com",
  dropbox: "dropbox.com",
  stripe: "stripe.com",
  robinhood: "robinhood.com",
  doordash: "doordash.com",
  instacart: "instacart.com",
  wayfair: "wayfair.com",
  walmart: "walmart.com",
  target: "target.com",
  visa: "visa.com",
  mastercard: "mastercard.com",
  paypal: "paypal.com",
  americanexpress: "americanexpress.com",
  amex: "americanexpress.com",
  goldmansachs: "goldmansachs.com",
  goldman: "goldmansachs.com",
  jpmorgan: "jpmorganchase.com",
  jpmorganchase: "jpmorganchase.com",
  jpmorganchaseco: "jpmorganchase.com",
  morganstanley: "morganstanley.com",
  capitalone: "capitalone.com",
  citadel: "citadel.com",
  twosigma: "twosigma.com",
  deloitte: "deloitte.com",
  accenture: "accenture.com",
  cognizant: "cognizant.com",
  infosys: "infosys.com",
  wipro: "wipro.com",
  capgemini: "capgemini.com",
  tcs: "tcs.com",
  tataconsultancyservices: "tcs.com",
  techmahindra: "techmahindra.com",
  hcl: "hcltech.com",
  hcltech: "hcltech.com",
  ey: "ey.com",
  ernstyoung: "ey.com",
  kpmg: "kpmg.com",
  pwc: "pwc.com",
  mckinsey: "mckinsey.com",
  intel: "intel.com",
  nvidia: "nvidia.com",
  amd: "amd.com",
  cisco: "cisco.com",
  qualcomm: "qualcomm.com",
  sap: "sap.com",
  servicenow: "servicenow.com",
  atlassian: "atlassian.com",
  twilio: "twilio.com",
  databricks: "databricks.com",
  snowflake: "snowflake.com",
  mongodb: "mongodb.com",
  reddit: "reddit.com",
  tiktok: "tiktok.com",
  bytedance: "bytedance.com",
  tesla: "tesla.com",
  samsung: "samsung.com",
  ebay: "ebay.com",
  etsy: "etsy.com",
  expedia: "expedia.com",
  booking: "booking.com",
  bookingcom: "booking.com",
  tripadvisor: "tripadvisor.com",
  flipkart: "flipkart.com",
  zomato: "zomato.com",
  swiggy: "swiggy.com",
  paytm: "paytm.com",
  ola: "olacabs.com",
  olacabs: "olacabs.com",
  byjus: "byjus.com",
  razorpay: "razorpay.com",
  freshworks: "freshworks.com",
  zoho: "zoho.com",
  phonepe: "phonepe.com",
  nike: "nike.com",
  github: "github.com",
  gitlab: "gitlab.com",
  shopify: "shopify.com",
  square: "squareup.com",
  block: "block.xyz",
  coinbase: "coinbase.com",
  verizon: "verizon.com",
  att: "att.com",
  comcast: "comcast.com",
  disney: "disney.com",
  hulu: "hulu.com",
  twitch: "twitch.tv",
  zoom: "zoom.us",
  slack: "slack.com",
  asana: "asana.com",
  notion: "notion.so",
  figma: "figma.com",
  grab: "grab.com",
  goldmansach: "goldmansachs.com",
  intuit: "intuit.com",
  vmware: "vmware.com",
  dell: "dell.com",
  hp: "hp.com",
  hewlettpackard: "hp.com",
  sony: "sony.com",
  philips: "philips.com",
  spacex: "spacex.com",
  palantir: "palantir.com",
  datadog: "datadoghq.com",
  cloudflare: "cloudflare.com",
  okta: "okta.com",
  box: "box.com",
  yahoo: "yahoo.com",
  quora: "quora.com",
  medium: "medium.com",
  wish: "wish.com",
  grubhub: "grubhub.com",
  opendoor: "opendoor.com",
  affirm: "affirm.com",
  chewy: "chewy.com",
  rivian: "rivian.com",
  americanairlines: "aa.com",
  delta: "delta.com",
  fedex: "fedex.com",
  ups: "ups.com",
  starbucks: "starbucks.com",
  mcdonalds: "mcdonalds.com",
  cocacola: "coca-cola.com",
  pepsico: "pepsico.com",
  nestle: "nestle.com",
  unilever: "unilever.com",
  procterandgamble: "pg.com",
  pg: "pg.com",
};

export function domainFor(name: string): string {
  const key = normalize(name);
  return DOMAINS[key] ?? `${key}.com`;
}

const sizes = {
  sm: { box: "size-5 rounded-[4px]", text: "text-[10px]", px: 20 },
  md: { box: "size-8 rounded-md", text: "text-xs", px: 32 },
  lg: { box: "size-10 rounded-md", text: "text-sm", px: 40 },
} as const;

type Size = keyof typeof sizes;

/** Neutral monogram tile for a company — the fallback when no logo resolves. */
export function CompanyMonogram({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-line bg-surface-2 font-semibold text-fg-muted",
        sizes[size].box,
        sizes[size].text,
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/**
 * Real company logo on a clean chip, with graceful degradation:
 * DuckDuckGo icon service → Google favicon → initials monogram.
 * Logos are drawn for light backgrounds, so the chip stays light in both themes.
 */
export function CompanyLogo({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  const [stage, setStage] = useState(0);
  const domain = domainFor(name);
  const sources = [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];

  if (stage >= sources.length) {
    return <CompanyMonogram name={name} size={size} className={className} />;
  }

  const s = sizes[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-white",
        s.box,
        className
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources[stage]}
        alt=""
        width={s.px}
        height={s.px}
        loading="lazy"
        onError={() => setStage((x) => x + 1)}
        className="size-full object-contain p-[14%]"
      />
    </span>
  );
}

/** Small clickable company chip used on a problem. */
export function CompanyChip({ name, onClick }: { name: string; onClick?: () => void }) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border border-line bg-surface-2 pl-1 pr-2 text-xs font-medium text-fg-muted",
        onClick && "transition-colors hover:border-line-strong hover:text-fg"
      )}
    >
      <CompanyLogo name={name} size="sm" className="border-0" />
      {name}
    </Comp>
  );
}
