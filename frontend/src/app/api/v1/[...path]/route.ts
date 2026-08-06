import { NextRequest, NextResponse } from "next/server";

function backendOrigin(): string {
  const raw =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
    "http://localhost:4000";
  return raw.replace(/\/$/, "");
}

function isSelfProxy(origin: string, req: NextRequest): boolean {
  try {
    const backendHost = new URL(origin).hostname;
    const requestHost =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";
    const siteHost = requestHost.split(":")[0].toLowerCase();
    if (!backendHost || !siteHost) return false;
    if (backendHost === siteHost) return true;
    // www.uniktrades.com ↔ uniktrades.com
    const stripWww = (h: string) => h.replace(/^www\./, "");
    return stripWww(backendHost) === stripWww(siteHost);
  } catch {
    return false;
  }
}

async function proxyRequest(req: NextRequest, path: string[]) {
  const origin = backendOrigin();

  if (isSelfProxy(origin, req)) {
    return NextResponse.json(
      {
        message:
          "API_URL points at this website (proxy loop). On the frontend Render service set API_URL=https://uniktrades-api.onrender.com and NEXT_PUBLIC_API_URL=https://uniktrades-api.onrender.com/api/v1, then redeploy.",
      },
      { status: 502 },
    );
  }

  const target = `${origin}/api/v1/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") {
      return;
    }
    headers.set(key, value);
  });

  const clientIp =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  headers.set("x-forwarded-for", clientIp);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Backend API unreachable. On Render set API_URL=https://uniktrades-api.onrender.com (not the website URL).",
      },
      { status: 502 },
    );
  }

  if (res.status === 508) {
    return NextResponse.json(
      {
        message:
          "API proxy loop (508). Set frontend API_URL to https://uniktrades-api.onrender.com and redeploy the website.",
      },
      { status: 502 },
    );
  }

  const body = await res.arrayBuffer();

  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "transfer-encoding" ||
      lower === "content-length" ||
      lower === "content-encoding"
    ) {
      return;
    }
    responseHeaders.set(key, value);
  });

  return new NextResponse(body, {
    status: res.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
