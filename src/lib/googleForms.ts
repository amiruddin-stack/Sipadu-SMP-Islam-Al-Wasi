type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleTokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;
let activeAccessToken = '';

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
      const script = existing || document.createElement('script');
      const fail = () => reject(new Error('Layanan login Google gagal dimuat. Periksa koneksi internet.'));
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
    }).catch(error => {
      googleScriptPromise = null;
      throw error;
    });
  }
  return googleScriptPromise;
}

export async function authorizeGoogleForms(clientId: string): Promise<void> {
  if (!clientId) throw new Error('Google Client ID belum dipasang pada konfigurasi aplikasi.');
  await loadGoogleIdentity();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('Layanan otorisasi Google belum siap.');
  await new Promise<void>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/forms.body.readonly',
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Izin Google tidak diberikan.'));
          return;
        }
        activeAccessToken = response.access_token;
        resolve();
      },
      error_callback: error => reject(new Error(error.message || 'Jendela izin Google tidak dapat dibuka.'))
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function hasGoogleFormsAccess(): boolean {
  return Boolean(activeAccessToken);
}

export function getGoogleFormId(value: string): string {
  const match = value.trim().match(/docs\.google\.com\/forms\/d\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!match?.[1]) throw new Error('Tautan tidak dikenali. Gunakan tautan Google Form yang memiliki akses edit.');
  return match[1];
}

export type ImportedGoogleQuestion = {
  prompt: string;
  options: string[];
  answer?: number;
  points: number;
};

export async function readGoogleForm(value: string): Promise<{ title: string; isQuiz: boolean; questions: ImportedGoogleQuestion[] }> {
  if (!activeAccessToken) throw new Error('Hubungkan akun Google terlebih dahulu.');
  const formId = getGoogleFormId(value);
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, {
    headers: { Authorization: `Bearer ${activeAccessToken}` }
  });
  if (response.status === 401) {
    activeAccessToken = '';
    throw new Error('Izin Google telah kedaluwarsa. Hubungkan ulang akun Google.');
  }
  if (response.status === 403) throw new Error('Akun Google ini tidak memiliki izin membaca formulir, atau Google Forms API belum diaktifkan.');
  if (response.status === 404) throw new Error('Formulir tidak ditemukan. Pastikan tautan benar dan akun memiliki akses.');
  if (!response.ok) throw new Error('Google Forms API gagal membaca formulir (' + response.status + ').');
  const form = await response.json();
  const questions: ImportedGoogleQuestion[] = [];
  for (const item of form.items || []) {
    const question = item.questionItem?.question;
    const choice = question?.choiceQuestion;
    if (!question || !choice?.options?.length) continue;
    const options = choice.options.map((option: { value?: string }) => String(option.value || '').trim()).filter(Boolean);
    if (options.length < 2) continue;
    const correctValue = question.grading?.correctAnswers?.answers?.[0]?.value;
    const answerIndex = correctValue === undefined ? -1 : options.findIndex((option: string) => option === String(correctValue));
    questions.push({
      prompt: String(item.title || '').trim(),
      options,
      ...(answerIndex >= 0 ? { answer: answerIndex } : {}),
      points: Math.max(1, Number(question.grading?.pointValue || 1))
    });
  }
  if (!questions.length) throw new Error('Tidak ditemukan soal pilihan ganda yang dapat diimpor. Soal paragraf, unggah file, dan kisi-kisi belum didukung.');
  return { title: String(form.info?.title || 'Google Form'), isQuiz: Boolean(form.settings?.quizSettings?.isQuiz), questions };
}
