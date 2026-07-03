import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

const DEBUG_PORT = 9333;

interface DevToolsTab {
  webSocketDebuggerUrl: string;
}

interface CdpMessage {
  id?: number;
  method?: string;
  result?: unknown;
  error?: { message?: string };
}

interface BulletinReadiness {
  status: "ready" | "error" | "timeout";
  overflowingSections: string[];
}

class BulletinOverflowError extends Error {
  constructor(readonly overflowingSections: string[]) {
    super(`Content does not fit: ${overflowingSections.join(", ")}`);
  }
}

const IS_WINDOWS = process.platform === "win32";
const CHROME_BIN = IS_WINDOWS ? "chrome.exe" : "google-chrome";
const PATH_SEP = IS_WINDOWS ? ";" : ":";

function getChromeDirectory(): string {
  if (process.env.CHROME_DIRECTORY) return process.env.CHROME_DIRECTORY;
  if (!IS_WINDOWS) return "/usr/bin";
  const programFiles =
    process.env.ProgramFiles ?? `${process.env.SystemDrive ?? "C:"}\\Program Files`;
  return `${programFiles}\\Google\\Chrome\\Application`;
}

function getPrintUrl(request: Request, lang?: string): string {
  const configuredBaseUrl = process.env.BULLETIN_BASE_URL?.trim();
  const url = new URL("/print", configuredBaseUrl || request.url);
  if (lang) url.searchParams.set("lang", lang);
  return url.toString();
}

function waitForChrome(timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (res.ok) return resolve();
      } catch {
        // not up yet
      }
      if (Date.now() - start > timeoutMs) return reject(new Error("Chrome devtools port never came up"));
      setTimeout(tick, 150);
    };
    tick();
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") ?? "en";

  const tmpDir = join(process.cwd(), ".next", "tmp");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const profileDir = join(tmpDir, "chrome-pdf-profile");
  // Fresh profile each run avoids Chrome forwarding the request into an existing
  // user session (which silently ignores headless/devtools flags).
  if (existsSync(profileDir)) rmSync(profileDir, { recursive: true, force: true });

  const chromeDirectory = getChromeDirectory();
  const printUrl = getPrintUrl(request, lang);
  const chrome = spawn(CHROME_BIN, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
  ], {
    stdio: "ignore",
    env: {
      ...process.env,
      PATH: `${chromeDirectory}${PATH_SEP}${process.env.PATH ?? ""}`,
    },
  });

  const chromeStartError = new Promise<never>((_, reject) => {
    chrome.once("error", (error) => {
      reject(
        new Error(
          `Chrome could not start from ${chromeDirectory}. Set CHROME_DIRECTORY to its folder. ${error.message}`
        )
      );
    });
  });

  try {
    await Promise.race([waitForChrome(), chromeStartError]);

    const newTabRes = await fetch(
      `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(printUrl)}`,
      { method: "PUT" }
    );
    if (!newTabRes.ok) {
      throw new Error(`Chrome could not open the print page (${newTabRes.status})`);
    }

    const tab = (await newTabRes.json()) as DevToolsTab;
    if (!tab.webSocketDebuggerUrl) {
      throw new Error("Chrome did not return a DevTools WebSocket URL");
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    const pdfBase64: string = await new Promise((resolve, reject) => {
      let msgId = 0;
      let printStarted = false;
      const pending = new Map<
        number,
        { resolve: (result: unknown) => void; reject: (error: Error) => void }
      >();

      const send = <T,>(method: string, params: Record<string, unknown> = {}) => {
        const id = ++msgId;
        return new Promise<T>((resolveMessage, rejectMessage) => {
          pending.set(id, {
            resolve: (result) => resolveMessage(result as T),
            reject: rejectMessage,
          });
          ws.send(JSON.stringify({ id, method, params }));
        });
      };

      ws.onopen = async () => {
        try {
          await send("Page.enable");
          await send("Runtime.enable");
          await send("Page.navigate", { url: printUrl });
        } catch (error) {
          reject(error);
        }
      };

      ws.onmessage = async (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data as string) as CdpMessage;
        if (msg.id !== undefined && pending.has(msg.id)) {
          const request = pending.get(msg.id)!;
          pending.delete(msg.id);
          if (msg.error) {
            request.reject(new Error(msg.error.message || "Chrome DevTools command failed"));
          } else {
            request.resolve(msg.result);
          }
        }
        if (msg.method === "Page.loadEventFired" && !printStarted) {
          printStarted = true;
          try {
            const readinessResult = await send<{
              result?: { value?: BulletinReadiness };
            }>("Runtime.evaluate", {
              expression: `new Promise((resolve) => {
                const root = document.getElementById("bulletin-preview");
                const read = () => {
                  const status = root?.dataset.fitStatus;
                  if (status === "ready" || status === "error") {
                    resolve({
                      status,
                      overflowingSections: (root.dataset.overflowingSections || "")
                        .split(",")
                        .filter(Boolean),
                    });
                    return true;
                  }
                  return false;
                };
                if (read()) return;
                const observer = new MutationObserver(() => {
                  if (read()) observer.disconnect();
                });
                if (root) observer.observe(root, { attributes: true });
                setTimeout(() => {
                  observer.disconnect();
                  resolve({ status: "timeout", overflowingSections: [] });
                }, 10000);
              })`,
              awaitPromise: true,
              returnByValue: true,
            });
            const readiness = readinessResult.result?.value;
            if (!readiness || readiness.status === "timeout") {
              throw new Error("Bulletin layout did not become ready for printing");
            }
            if (readiness.status === "error") {
              throw new BulletinOverflowError(readiness.overflowingSections);
            }

            const result = await send<{ data?: string }>("Page.printToPDF", {
              preferCSSPageSize: true,
              printBackground: true,
              // The bulletin is always exactly 2 pages; total content height lands on
              // an exact multiple of the page height, which trips a Chromium pagination
              // quirk that appends one extra blank page. Pin the range to suppress it.
              pageRanges: "1-2",
            });
            if (!result.data) throw new Error("Chrome returned an empty PDF");
            resolve(result.data);
          } catch (e) {
            reject(e);
          }
        }
      };
      ws.onerror = (e) => reject(new Error("WebSocket error: " + JSON.stringify(e)));
      setTimeout(() => reject(new Error("printToPDF timed out")), 20_000);
    });

    ws.close();
    const outPath = join(tmpDir, "bulletin-export.pdf");
    writeFileSync(outPath, Buffer.from(pdfBase64, "base64"));

    return new NextResponse(Buffer.from(pdfBase64, "base64"), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bulletin-${lang}.pdf"`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof BulletinOverflowError) {
      return NextResponse.json(
        {
          error: err.message,
          overflowingSections: err.overflowingSections,
        },
        { status: 422 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    chrome.kill();
  }
}
