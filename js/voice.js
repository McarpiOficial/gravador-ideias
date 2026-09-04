// Reconhecimento de fala (Web Speech API), no mesmo espírito do voice.js do
// app Gastos — mas em modo `continuous`, porque aqui a fala costuma ser mais
// longa que uma única frase (descrever uma ideia ou um problema com calma).
// O reconhecedor só entrega texto; nunca grava nem transmite áudio.

export function speechSupported() {
  return typeof window !== 'undefined'
    && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognizer({ onInterim, onFinal, onError, onEnd } = {}) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';
  rec.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText = (finalText + ' ' + chunk).trim();
      } else {
        interim += chunk;
      }
    }
    onInterim?.((finalText + ' ' + interim).trim());
  };
  rec.onerror = (event) => onError?.(event.error);
  // `continuous` ainda assim termina sozinho depois de um silêncio longo ou
  // por limite do navegador — onEnd cobre tanto isso quanto o Parar manual.
  rec.onend = () => {
    onFinal?.(finalText.trim());
    onEnd?.();
  };

  return {
    start() {
      finalText = '';
      try { rec.start(); } catch (err) { onError?.(String(err)); }
    },
    stop() { try { rec.stop(); } catch { /* já parado */ } },
    abort() { try { rec.abort(); } catch { /* já parado */ } },
  };
}
