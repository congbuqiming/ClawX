/**
 * Dynamic imports for openclaw plugin-sdk subpath exports.
 *
 * openclaw is NOT in the asar's node_modules — it lives at resources/openclaw/
 * (extraResources).  Static `import ... from 'openclaw/plugin-sdk/...'` would
 * produce a runtime require() that fails inside the asar.
 *
 * Instead, we create a require context from the openclaw directory itself.
 * Node.js package self-referencing allows a package to require its own exports
 * by name, so `openclawRequire('openclaw/plugin-sdk/discord')` resolves via the
 * exports map in openclaw's package.json.
 *
 * In dev mode (pnpm), the resolved path is in the pnpm virtual store where
 * self-referencing also works.  The projectRequire fallback covers edge cases.
 */
import { createRequire } from 'module';
import { join } from 'node:path';
import { getOpenClawDir, getOpenClawResolvedDir, isOpenClawPresent } from './paths';
import { logger } from './logger';

function createOpenClawRequire(packageRoot: string): NodeRequire | null {
  try {
    return createRequire(join(packageRoot, 'package.json'));
  } catch {
    return null;
  }
}

const _openclawPath = getOpenClawDir();
const _openclawResolvedPath = getOpenClawResolvedDir();
const _openclawSdkRequire = isOpenClawPresent()
  ? createOpenClawRequire(_openclawResolvedPath)
  : null;
const _projectSdkRequire = isOpenClawPresent()
  ? createOpenClawRequire(_openclawPath)
  : null;

function requireOpenClawSdk(subpath: string): Record<string, unknown> {
  if (_openclawSdkRequire) {
    try {
      return _openclawSdkRequire(subpath);
    } catch {
      // Fall through to the secondary resolver.
    }
  }
  if (_projectSdkRequire) {
    return _projectSdkRequire(subpath);
  }
  throw new Error(`Bundled OpenClaw SDK is unavailable for ${subpath}`);
}

function createSdkFallback<T extends Record<string, unknown>>(subpath: string, fallback: T): T {
  try {
    return requireOpenClawSdk(subpath) as T;
  } catch (error) {
    logger.warn(String(error));
    return fallback;
  }
}

// --- Channel SDK dynamic imports ---
const _discordSdk = createSdkFallback('openclaw/plugin-sdk/discord', {
  listDiscordDirectoryGroupsFromConfig: async () => [],
  listDiscordDirectoryPeersFromConfig: async () => [],
  normalizeDiscordMessagingTarget: () => undefined,
}) as {
  listDiscordDirectoryGroupsFromConfig: (...args: unknown[]) => Promise<unknown[]>;
  listDiscordDirectoryPeersFromConfig: (...args: unknown[]) => Promise<unknown[]>;
  normalizeDiscordMessagingTarget: (target: string) => string | undefined;
};

const _telegramSdk = createSdkFallback('openclaw/plugin-sdk/telegram', {
  listTelegramDirectoryGroupsFromConfig: async () => [],
  listTelegramDirectoryPeersFromConfig: async () => [],
  normalizeTelegramMessagingTarget: () => undefined,
}) as {
  listTelegramDirectoryGroupsFromConfig: (...args: unknown[]) => Promise<unknown[]>;
  listTelegramDirectoryPeersFromConfig: (...args: unknown[]) => Promise<unknown[]>;
  normalizeTelegramMessagingTarget: (target: string) => string | undefined;
};

const _slackSdk = createSdkFallback('openclaw/plugin-sdk/slack', {
  listSlackDirectoryGroupsFromConfig: async () => [],
  listSlackDirectoryPeersFromConfig: async () => [],
  normalizeSlackMessagingTarget: () => undefined,
}) as {
  listSlackDirectoryGroupsFromConfig: (...args: unknown[]) => Promise<unknown[]>;
  listSlackDirectoryPeersFromConfig: (...args: unknown[]) => Promise<unknown[]>;
  normalizeSlackMessagingTarget: (target: string) => string | undefined;
};

const _whatsappSdk = createSdkFallback('openclaw/plugin-sdk/whatsapp-shared', {
  normalizeWhatsAppMessagingTarget: () => undefined,
}) as {
  normalizeWhatsAppMessagingTarget: (target: string) => string | undefined;
};

export const {
  listDiscordDirectoryGroupsFromConfig,
  listDiscordDirectoryPeersFromConfig,
  normalizeDiscordMessagingTarget,
} = _discordSdk;

export const {
  listTelegramDirectoryGroupsFromConfig,
  listTelegramDirectoryPeersFromConfig,
  normalizeTelegramMessagingTarget,
} = _telegramSdk;

export const {
  listSlackDirectoryGroupsFromConfig,
  listSlackDirectoryPeersFromConfig,
  normalizeSlackMessagingTarget,
} = _slackSdk;

export const { normalizeWhatsAppMessagingTarget } = _whatsappSdk;
