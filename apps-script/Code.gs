const CONFIG = {
  projectId: 'gen-lang-client-0150709110',
  databaseId: 'ai-studio-sipadusmpislamal-6c38b5b8-a9ba-49da-8bdd-3764317c8ef1',
  apiKey: 'AIzaSyC7Xq-asMHPPi_a-Rwn4ID0mPWi0oTzJWw'
};

function doGet() {
  return output_({ success: true, service: 'SIMPATIK_AUTO_GRADING', version: 2 });
}

function normalizeKeyIndex_(rawAnswer) {
  if (rawAnswer === undefined || rawAnswer === null) return null;
  if (typeof rawAnswer === 'number') {
    return Number.isInteger(rawAnswer) && rawAnswer >= 0 ? rawAnswer : null;
  }
  const text = String(rawAnswer).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const parsed = Number(text);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }
  const upper = text.toUpperCase();
  if (/^[A-Z]$/.test(upper)) {
    return upper.charCodeAt(0) - 65;
  }
  return null;
}

function normalizeStudentAnswer_(rawGiven) {
  if (rawGiven === undefined || rawGiven === null) return null;
  if (typeof rawGiven === 'number') {
    return Number.isInteger(rawGiven) && rawGiven >= 0 ? rawGiven : null;
  }
  const text = String(rawGiven).trim();
  if (!text || !/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Permintaan kosong.');
    const body = JSON.parse(e.postData.contents);
    const idToken = String(body.idToken || '');
    const attemptId = String(body.attemptId || '');
    if (!idToken || !attemptId || attemptId.length > 160) throw new Error('Token atau ID pengerjaan tidak lengkap.');

    const identity = verifyFirebaseToken_(idToken);
    if (!identity.uid) throw new Error('Identitas Firebase tidak valid.');

    if (!lock.tryLock(15000)) throw new Error('Penilaian sedang diproses. Silakan tunggu sebentar.');
    const attempt = getDocument_('examAttempts', attemptId);
    if (!attempt) throw new Error('Data pengerjaan tidak ditemukan.');
    if (attempt.ownerUid !== identity.uid) throw new Error('Akses pengerjaan ditolak.');
    if (attempt.status !== 'Selesai') throw new Error('Siswa belum menyelesaikan ujian.');

    if (typeof attempt.score === 'number' && typeof attempt.total === 'number' && attempt.total > 0 && !attempt.gradingIssue) {
      return output_({ success: true, alreadyGraded: true, score: attempt.score, total: attempt.total, percent: attempt.percent, gradingIssue: '' });
    }

    const examId = String(attempt.examId || '');
    if (!examId) throw new Error('Data ujian tidak lengkap.');
    const exam = getDocument_('exams', examId);
    if (!exam || !Array.isArray(exam.questionIds) || !exam.questionIds.length) throw new Error('Paket soal tidak ditemukan.');

    let score = 0;
    let total = 0;
    const missing = [];
    exam.questionIds.forEach(function(questionId) {
      const qid = String(questionId);
      let key = getDocument_('examAnswerKeys', qid);
      let keyIndex = key ? normalizeKeyIndex_(key.answer) : null;
      if (keyIndex === null) {
        const legacy = getDocument_('examQuestions', qid);
        if (legacy) {
          key = legacy;
          keyIndex = normalizeKeyIndex_(legacy.answer);
        }
      }
      if (keyIndex === null) {
        missing.push(qid);
        return;
      }
      const rawPoints = Number(key && key.points);
      const points = Number.isFinite(rawPoints) && rawPoints > 0 ? rawPoints : 1;
      total += points;
      const given = normalizeStudentAnswer_(attempt.answers && attempt.answers[qid]);
      if (given !== null && given === keyIndex) score += points;
    });

    const gradedCount = exam.questionIds.length - missing.length;
    const issue = gradedCount === 0
      ? 'Belum ada kunci jawaban untuk soal pada ujian ini. Menunggu kunci jawaban dari guru.'
      : missing.length
        ? missing.length + ' dari ' + exam.questionIds.length + ' soal belum memiliki kunci jawaban. Nilai sementara hanya menghitung ' + gradedCount + ' soal yang sudah memiliki kunci.'
        : '';

    const result = {
      score: score,
      total: total,
      percent: total > 0 ? Math.round((score / total) * 100) : 0,
      gradingIssue: issue,
      gradedAt: new Date().toISOString()
    };
    patchDocument_('examAttempts', attemptId, result);
    return output_(Object.assign({ success: true }, result));
  } catch (error) {
    return output_({ success: false, message: error && error.message ? error.message : String(error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function authorizeAccess() {
  const token = getFirestoreAccessToken_();
  if (!token) throw new Error('Izin Google belum diberikan.');
  return 'Izin Apps Script berhasil disiapkan dengan scope Firestore.';
}

function setServiceAccountJson(jsonString) {
  const parsed = JSON.parse(String(jsonString || ''));
  if (!parsed || !parsed.client_email || !parsed.private_key) {
    throw new Error('JSON Service Account tidak valid (client_email / private_key kosong).');
  }
  PropertiesService.getScriptProperties().setProperty('FIREBASE_SERVICE_ACCOUNT', JSON.stringify(parsed));
  CacheService.getScriptCache().remove('sa_firestore_token');
  return 'Service account berhasil disimpan di Script Properties.';
}

function getFirestoreAccessToken_() {
  const saRaw = PropertiesService.getScriptProperties().getProperty('FIREBASE_SERVICE_ACCOUNT');
  if (saRaw) {
    return getServiceAccountToken_(saRaw);
  }

  const token = ScriptApp.getOAuthToken();
  if (!token) throw new Error('Token OAuth Apps Script tidak tersedia.');

  const infoRes = UrlFetchApp.fetch(
    'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true }
  );
  if (infoRes.getResponseCode() === 200) {
    const info = JSON.parse(infoRes.getContentText() || '{}');
    const scopes = String(info.scope || '').split(/\s+/);
    const hasFirestoreScope = scopes.some(function(scope) {
      return scope === 'https://www.googleapis.com/auth/datastore' ||
        scope === 'https://www.googleapis.com/auth/cloud-platform';
    });
    if (!hasFirestoreScope) {
      throw new Error(
        'Token OAuth Apps Script belum memiliki scope datastore. Pastikan appsscript.json mencantumkan "https://www.googleapis.com/auth/datastore", jalankan ulang authorizeAccess(), lalu buat deployment versi baru—atau simpan JSON Service Account di Script Properties (FIREBASE_SERVICE_ACCOUNT).'
      );
    }
  }
  return token;
}

function getServiceAccountToken_(saRaw) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('sa_firestore_token');
  if (cached) return cached;

  const sa = JSON.parse(saRaw);
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Konfigurasi FIREBASE_SERVICE_ACCOUNT di Script Properties tidak lengkap.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode_(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64UrlEncode_(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600
  }));
  const signingInput = header + '.' + claim;
  const privateKey = String(sa.private_key).replace(/\\n/g, '\n');
  const signatureBytes = Utilities.computeRsaSha256Signature(signingInput, privateKey);
  const assertion = signingInput + '.' + base64UrlEncodeBytes_(signatureBytes);

  const response = UrlFetchApp.fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion
    },
    muteHttpExceptions: true
  });
  const data = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() !== 200 || !data.access_token) {
    throw new Error('Gagal memperoleh access token Service Account: ' + (data.error_description || response.getContentText()));
  }
  cache.put('sa_firestore_token', data.access_token, 3000);
  return data.access_token;
}

function base64UrlEncode_(text) {
  return Utilities.base64EncodeWebSafe(text).replace(/=+$/, '');
}

function base64UrlEncodeBytes_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function verifyFirebaseToken_(idToken) {
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(CONFIG.apiKey);
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const data = JSON.parse(response.getContentText() || '{}');
  if (status !== 200 || !data.users || !data.users.length || data.users[0].disabled) {
    throw new Error('Token login siswa tidak sah atau sudah kedaluwarsa.');
  }
  return { uid: data.users[0].localId };
}

function getDocument_(collectionName, documentId) {
  const url = firestoreDocumentUrl_(collectionName, documentId);
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + getFirestoreAccessToken_() },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() === 404) return null;
  if (response.getResponseCode() !== 200) {
    throw new Error('Gagal membaca ' + collectionName + ': ' + response.getContentText());
  }
  const document = JSON.parse(response.getContentText());
  return decodeFields_(document.fields || {});
}

function patchDocument_(collectionName, documentId, values) {
  const fields = {};
  Object.keys(values).forEach(function(key) {
    fields[key] = encodeValue_(values[key]);
  });
  const masks = Object.keys(values).map(function(key) {
    return 'updateMask.fieldPaths=' + encodeURIComponent(key);
  }).join('&');
  const url = firestoreDocumentUrl_(collectionName, documentId) + '?' + masks;
  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getFirestoreAccessToken_() },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Gagal menyimpan nilai: ' + response.getContentText());
  }
}

function firestoreDocumentUrl_(collectionName, documentId) {
  return 'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(CONFIG.projectId) + '/databases/' +
    encodeURIComponent(CONFIG.databaseId) + '/documents/' +
    encodeURIComponent(collectionName) + '/' + encodeURIComponent(documentId);
}

function decodeFields_(fields) {
  const result = {};
  Object.keys(fields).forEach(function(key) {
    const value = fields[key];
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = Number(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = Number(value.doubleValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.nullValue !== undefined) result[key] = null;
    else if (value.arrayValue !== undefined) result[key] = (value.arrayValue.values || []).map(decodeValue_);
    else if (value.mapValue !== undefined) result[key] = decodeFields_(value.mapValue.fields || {});
  });
  return result;
}

function decodeValue_(value) {
  return decodeFields_({ value: value }).value;
}

function encodeValue_(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue_) } };
  if (typeof value === 'object') {
    const fields = {};
    Object.keys(value).forEach(function(key) { fields[key] = encodeValue_(value[key]); });
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(value) };
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
