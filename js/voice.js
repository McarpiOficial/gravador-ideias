// Reconhecimento de fala (Web Speech API). O reconhecedor só entrega texto;
// nunca grava nem transmite áudio.
//
// NÃO usamos `continuous: true`: no Chrome for Android existe um bug
// conhecido em que o próprio serviço de reconhecimento, ao retomar depois de
// uma pausa na fala, repete a última palavra (ou frase) já reconhecida antes
// de continuar — é isso que causava o texto vindo com trechos duplicados.
// Em vez disso, cada "frase" usa uma instância nova em modo `continuous:
// false` (mais confiável), e encadeamos uma instância atrás da outra
// enquanto o usuário não pedir para parar — o texto final vai sendo
// concatenado aqui fora, sob nosso controle.

export function speechSupported() {
  return typeof window !== 'undefined'
    && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognizer({ onInterim, onFinal, onError, onEnd } = {}) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;

  let finalText = '';
  let ativo = false; // true enquanto o usuário não tocou em parar
  let recAtual = null;

  function iniciarNovaInstancia() {
    const rec = new Ctor();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Com `continuous: false`, o navegador para sozinho após a primeira
    // frase reconhecida — então event.results desta instância nunca chega a
    // acumular resultados antigos, e somar os finais aqui não duplica nada.
    rec.onresult = (event) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText = (finalText + ' ' + chunk.trim()).trim();
        else interim += chunk;
      }
      onInterim?.((finalText + ' ' + interim).trim());
    };

    rec.onerror = (event) => {
      // Acontecem no meio normal dos reinícios automáticos (silêncio bem na
      // hora da troca de instância, ou o abort que nós mesmos disparamos ao
      // trocar) — não é um erro para mostrar ao usuário.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      ativo = false;
      onError?.(event.error);
    };

    rec.onend = () => {
      if (ativo) {
        iniciarNovaInstancia();
      } else {
        onFinal?.(finalText.trim());
        onEnd?.();
      }
    };

    recAtual = rec;
    try {
      rec.start();
    } catch (err) {
      ativo = false;
      onError?.(String(err));
    }
  }

  return {
    start() {
      finalText = '';
      ativo = true;
      iniciarNovaInstancia();
    },
    stop() {
      ativo = false;
      if (recAtual) { try { recAtual.stop(); } catch { /* já parado */ } }
    },
    abort() {
      ativo = false;
      if (recAtual) { try { recAtual.abort(); } catch { /* já parado */ } }
    },
  };
}
