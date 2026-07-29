import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/guards";

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 96_000;

export async function GET(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawUrl = new URL(request.url).searchParams.get("url");
  const url = parseHttpUrl(rawUrl);
  if (!url) {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  try {
    const title = await fetchPageTitle(url);
    return NextResponse.json(
      { title: title || fallbackTitle(url) },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch {
    return NextResponse.json({ title: fallbackTitle(url) });
  }
}

async function fetchPageTitle(initialUrl: URL) {
  let url = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "RoadtripPlanner/1.0 link preview",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) return null;
      const redirectedUrl = parseHttpUrl(new URL(location, url).toString());
      if (!redirectedUrl) return null;
      url = redirectedUrl;
      continue;
    }

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (contentType && !contentType.includes("text/html")) return null;

    const html = await readLimitedText(response, MAX_HTML_BYTES);
    const titleMatch = html.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
    return titleMatch
      ? decodeHtmlEntities(titleMatch[1])
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100)
      : null;
  }

  return null;
}

async function assertPublicUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Private host");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new Error("Private address");
  }
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

async function readLimitedText(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let result = "";
  let bytesRead = 0;
  while (bytesRead < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = value.subarray(0, limit - bytesRead);
    bytesRead += remaining.byteLength;
    result += decoder.decode(remaining, { stream: true });
  }
  void reader.cancel();
  return result + decoder.decode();
}

function parseHttpUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function fallbackTitle(url: URL) {
  return url.hostname.replace(/^www\./, "");
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      }
      return named[code.toLowerCase()] ?? entity;
    },
  );
}
