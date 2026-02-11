/**
 * Server-side Firebase Admin SDK initialization (lazy singleton)
 *
 * On Firebase App Hosting, Application Default Credentials (ADC) are
 * automatically available — no service account JSON required.
 * When running locally without ADC, admin features gracefully degrade.
 */
import {
  type App,
  getApps,
  initializeApp,
  applicationDefault,
} from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { logger } from '~/lib/logger';

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  try {
    adminApp = initializeApp({ credential: applicationDefault() });
    return adminApp;
  } catch (error) {
    logger.debug(
      'Firebase Admin SDK initialization skipped (no ADC available):',
      error,
    );
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  return getAuth(app);
}
