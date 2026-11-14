import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp, applicationDefault, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { gradeExamAttemptWithAdmin } from './server/examGradingService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as FirebaseAppletConfig;
  return parsed;
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    '';
  if (!raw.trim()) return null;

  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (!trimmed.startsWith('{')) {
    try {
      candidates.push(Buffer.from(trimmed, 'base64').toString('utf8'));
    } catch {
      // Ignore invalid base64
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ServiceAccount & {
        private_key?: string;
        client_email?: string;
        project_id?: string;
      };
      if (parsed && parsed.client_email && parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        return parsed;
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}

function getAdminServices() {
  const config = loadFirebaseConfig();
  const serviceAccount = parseServiceAccountFromEnv();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const hasExplicitCredsFile = Boolean(credentialsPath && fs.existsSync(credentialsPath));
  const useAdc = process.env.FIREBASE_USE_ADC === 'true';

  if (!serviceAccount && !hasExplicitCredsFile && !useAdc) {
    return null;
  }

  const existing = getApps()[0];
  const app =
    existing ||
    initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
      projectId: config.projectId,
    });

  return {
    adminAuth: getAuth(app),
    adminDb: getFirestore(app, config.firestoreDatabaseId),
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    const services = getAdminServices();
    res.json({
      ok: true,
      service: 'SIMPATIK_BACKEND',
      adminGradingConfigured: Boolean(services),
    });
  });

  app.post('/api/grade-exam', async (req, res) => {
    try {
      const services = getAdminServices();
      if (!services) {
        res.status(503).json({
          success: false,
          fallback: true,
          code: 'BACKEND_ADMIN_NOT_CONFIGURED',
          message:
            'Kredensial Firebase Admin SDK server belum dikonfigurasi. Dialihkan ke Web App penilaian.',
        });
        return;
      }

      const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken : '';
      const attemptId = typeof req.body?.attemptId === 'string' ? req.body.attemptId : '';

      const outcome = await gradeExamAttemptWithAdmin({
        idToken,
        attemptId,
        adminAuth: services.adminAuth,
        adminDb: services.adminDb,
      });
      res.status(outcome.status).json(outcome.body);
    } catch (error) {
      console.error('Gagal memproses penilaian otomatis backend:', error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat menilai ujian di server.',
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SIMPATIK server berjalan di http://0.0.0.0:${port}`);
  });
}

void startServer();
