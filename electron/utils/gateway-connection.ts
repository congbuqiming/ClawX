import { buildOpenClawControlUiUrl } from './openclaw-control-ui';
import type { AppSettings } from './store';

export type GatewayConnectionMode = 'local' | 'remote';

export interface GatewayConnectionInfo {
  mode: GatewayConnectionMode;
  port: number;
  token: string;
  endpoint: string;
  httpBaseUrl: string;
  wsUrl: string;
  controlUiUrl: string;
}

type GatewayConnectionSettings = Pick<
  AppSettings,
  'gatewayPort' | 'gatewayToken' | 'useRemoteOpenClaw' | 'remoteOpenClawUrl' | 'remoteOpenClawToken'
>;

function withDefaultProtocol(input: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
    return input;
  }
  return `http://${input}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeRemoteBaseUrl(input: string): URL {
  const raw = input.trim();
  if (!raw) {
    throw new Error('Remote OpenClaw URL is required when remote mode is enabled');
  }

  const parsed = new URL(withDefaultProtocol(raw));
  parsed.hash = '';
  parsed.search = '';
  return parsed;
}

function buildRemoteHttpBaseUrl(parsed: URL): string {
  const protocol = parsed.protocol === 'wss:' ? 'https:' : parsed.protocol === 'ws:' ? 'http:' : parsed.protocol;
  const base = new URL(`${protocol}//${parsed.host}`);
  const trimmedPath = trimTrailingSlash(parsed.pathname);
  const pathname = trimmedPath.endsWith('/ws')
    ? (trimTrailingSlash(trimmedPath.slice(0, -3)) || '/')
    : (parsed.pathname === '/' ? '/' : trimmedPath || '/');
  base.pathname = pathname;
  return pathname === '/' ? base.origin : trimTrailingSlash(base.toString());
}

function buildRemoteWsUrl(parsed: URL): string {
  const protocol = parsed.protocol === 'https:' ? 'wss:' : parsed.protocol === 'http:' ? 'ws:' : parsed.protocol;
  const wsUrl = new URL(`${protocol}//${parsed.host}`);
  const trimmedPath = trimTrailingSlash(parsed.pathname);
  const pathname = trimmedPath.endsWith('/ws')
    ? trimmedPath
    : `${trimmedPath || ''}/ws`;
  wsUrl.pathname = pathname || '/ws';
  return wsUrl.toString();
}

function parsePortFromUrl(urlValue: string): number {
  const parsed = new URL(urlValue);
  if (parsed.port) {
    const explicitPort = Number(parsed.port);
    if (Number.isFinite(explicitPort) && explicitPort > 0) {
      return explicitPort;
    }
  }
  if (parsed.protocol === 'https:' || parsed.protocol === 'wss:') {
    return 443;
  }
  return 80;
}

export function resolveGatewayConnectionInfo(
  settings: GatewayConnectionSettings,
  fallbackPort?: number,
): GatewayConnectionInfo {
  if (settings.useRemoteOpenClaw) {
    const parsed = normalizeRemoteBaseUrl(settings.remoteOpenClawUrl);
    const httpBaseUrl = buildRemoteHttpBaseUrl(parsed);
    const wsUrl = buildRemoteWsUrl(parsed);
    const token = settings.remoteOpenClawToken.trim();
    return {
      mode: 'remote',
      port: parsePortFromUrl(httpBaseUrl),
      token,
      endpoint: httpBaseUrl,
      httpBaseUrl,
      wsUrl,
      controlUiUrl: buildOpenClawControlUiUrl(httpBaseUrl, token),
    };
  }

  const port = settings.gatewayPort || fallbackPort || 18789;
  const httpBaseUrl = `http://127.0.0.1:${port}`;
  const token = settings.gatewayToken.trim();
  return {
    mode: 'local',
    port,
    token,
    endpoint: httpBaseUrl,
    httpBaseUrl,
    wsUrl: `ws://127.0.0.1:${port}/ws`,
    controlUiUrl: buildOpenClawControlUiUrl(httpBaseUrl, token),
  };
}
