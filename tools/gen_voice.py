"""Pre-generate Thai voice clips with Gemini TTS. Key is read from env GEMINI_API_KEY or ~/../.pk_gemini_key (never stored in repo)."""
import json, os, base64, subprocess, time, urllib.request, urllib.error, re, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ.get('GEMINI_API_KEY') or open('/workspace/.pk_gemini_key').read().strip()
MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts']
OUT = os.path.join(R, 'assets', 'voice'); lines = json.load(open(os.path.join(R, 'tools', 'voice_lines.json')))
log = open('/tmp/voicegen.log', 'a')
def P(*a): print(*a, flush=True); print(*a, file=log, flush=True)
def tts(model, text, voice, style):
    body = {"contents": [{"parts": [{"text": f"พูดเป็นภาษาไทย ด้วยน้ำเสียง{style} แบบนักพากย์ตัวละครเกมอนิเมะ: {text}"}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
    with urllib.request.urlopen(req, timeout=90) as r: j = json.load(r)
    part = next(p for p in j['candidates'][0]['content']['parts'] if 'inlineData' in p)
    rate = int((re.search(r'rate=(\d+)', part['inlineData'].get('mimeType', '')) or [0, 24000])[1])
    return base64.b64decode(part['inlineData']['data']), rate
mi = 0; stats = {'ok': 0, 'fail': 0, 'r429': 0}
for L in lines:
    dst = os.path.join(OUT, L['key'] + '.mp3')
    if os.path.exists(dst): continue
    for attempt in range(6):
        try:
            pcm, rate = tts(MODELS[mi], L['text'], L['voice'] or 'Kore', L['style'] or '')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(rate), '-ac', '1', '-i', '-', '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16',
                            '-ar', '24000', '-b:a', '40k', dst], input=pcm, check=True)
            stats['ok'] += 1; P('OK', MODELS[mi], L['key'], os.path.getsize(dst)); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:400]
            if e.code == 429:
                stats['r429'] += 1
                if 'PerDay' in msg or 'per_day' in msg.lower():
                    P('DAILY QUOTA on', MODELS[mi], msg[:200])
                    if mi + 1 < len(MODELS): mi += 1; continue
                    json.dump(stats, sys.stdout); sys.exit(2)
                d = re.search(r'"retryDelay":\s*"(\d+)', msg); w = int(d.group(1)) + 2 if d else 25
                P('429 wait', w, L['key']); time.sleep(w)
            else:
                P('HTTP', e.code, L['key'], msg[:200]); time.sleep(3)
                if e.code in (400, 404) and mi + 1 < len(MODELS) and 'model' in msg.lower(): mi += 1
        except Exception as e:
            P('ERR', L['key'], repr(e)[:200]); time.sleep(3)
    else:
        stats['fail'] += 1
P('DONE', stats)
