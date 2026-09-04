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
  // Reconstrói o texto final inteiro a partir de event.results a cada
  // chamada, em vez de acumular a partir de event.resultIndex: em modo
  // `continuous`, o navegador às vezes reemite um resultado que já tinha
  // ficado final com um resultIndex mais antigo, e acumular fazia essa fala
  // ser colada de novo no final, repetindo trechos a cada pausa.
  rec.onresult = (event) => {
    let texto = '';
    let interim = '';
    for (let i = 0; i < event.results.length; i += 1) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) texto += (texto ? ' ' : '') + chunk.trim();
      else interim += chunk;
    }
    finalText = texto;
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
