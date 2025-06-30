// Script executado nas páginas de dashboard do Superset
console.log("Script de dashboard do Superset carregado");

// Verificar se estamos em uma URL de dashboard específica
function verificarSeEDashboardEspecifico() {
  const url = window.location.href;
  const regexDashboard = /\/superset\/dashboard\/\d+\/\?expand_filters=0/;
  return regexDashboard.test(url);
}

// Verificar se houve redirecionamento para a página de login
if (window.location.href.includes('/login/')) {
  console.log("Redirecionado para login, notificando background script");
  
  // Notificar o background script que o login é necessário
  chrome.runtime.sendMessage({ acao: 'loginNecessario' });
} else if (verificarSeEDashboardEspecifico()) {
  console.log("Dashboard específico carregado:", window.location.href);
  
  // Adicionar classe ao corpo para facilitar identificação visual do dashboard atual
  document.body.classList.add('dashboard-ativo');
  
  // Função para verificar se o dashboard carregou completamente
  function verificarCarregamentoDashboard() {
    // Elementos que indicam que o dashboard está carregado
    const dashboardContainer = document.querySelector('.dashboard');
    const graficos = document.querySelectorAll('.chart-container');
    
    if (dashboardContainer && graficos.length > 0) {
      console.log(`Dashboard carregado com ${graficos.length} gráficos/visualizações`);
      return true;
    }
    return false;
  }
  
  // Função segura para enviar mensagens para o background
  function enviarMensagemSegura(mensagem, callback = null) {
    try {
      // Verificar se a extensão está disponível
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        // Verificar se a extensão está ativa/conectada
        chrome.runtime.sendMessage({ acao: 'ping' }, function(resposta) {
          // Se houver erro na comunicação com a extensão
          if (chrome.runtime.lastError) {
            console.warn('Erro de comunicação com a extensão:', chrome.runtime.lastError.message);
            if (callback) callback(null);
            return;
          }
          
          // Se chegou aqui, a comunicação está funcionando
          chrome.runtime.sendMessage(mensagem, function(resposta) {
            // Verificar novamente por erro neste envio
            if (chrome.runtime.lastError) {
              console.warn('Erro ao enviar mensagem:', chrome.runtime.lastError.message);
              if (callback) callback(null);
              return;
            }
            
            if (callback) callback(resposta);
          });
        });
      } else {
        console.warn('API de extensão não disponível');
        if (callback) callback(null);
      }
    } catch (erro) {
      console.error('Erro ao tentar enviar mensagem:', erro);
      if (callback) callback(null);
    }
  }
  
  // Verificar periodicamente se o dashboard carregou
  let verificacaoCarregamento = setInterval(() => {
    if (verificarCarregamentoDashboard()) {
      clearInterval(verificacaoCarregamento);
      console.log("Dashboard completamente carregado!");
      
      // Notificar o background script que o dashboard está pronto
      enviarMensagemSegura({ 
        acao: 'dashboardCarregado', 
        url: window.location.href 
      });
    }
  }, 1000);  // Verificar a cada segundo
  
  // Parar de verificar após 30 segundos, de qualquer forma
  setTimeout(() => {
    clearInterval(verificacaoCarregamento);
  }, 30000);
  
  // Observar mudanças na URL sem recarregar a página (navegação SPA)
  let urlAnterior = window.location.href;
  setInterval(() => {
    if (window.location.href !== urlAnterior) {
      console.log("URL alterada:", window.location.href);
      urlAnterior = window.location.href;
      
      // Notificar mudança de URL
      enviarMensagemSegura({ 
        acao: 'urlAlterada', 
        url: window.location.href 
      });
    }
  }, 1000);
} else {
  console.log("Não é uma página de dashboard específica, não exibindo popup");
}

// Script para adicionar funcionalidades à página de dashboard do Superset
console.log("Script de dashboard do Superset carregado");

// Variáveis globais
let tempoRestante = 0;
let idInterval = null;
let contadorElemento = null;
let indiceAtual = 0;
let dashboards = [];
let configuracao = null;
let emFullscreen = false;
let tentativasFullscreen = 0;
let maxTentativasFullscreen = 3;

// Ativar fullscreen
function ativarFullscreen() {
  if (emFullscreen) return;

  const element = document.documentElement;
  
  // Incrementar contador de tentativas
  tentativasFullscreen++;
  
  // Tentar simular uma interação do usuário para habilitar o fullscreen
  try {
    // Criar e disparar um evento de clique no documento para contornar a restrição de gestos
    const eventoClique = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    // Disparar o evento no documento
    document.dispatchEvent(eventoClique);
    
    // Pequeno atraso para deixar o navegador processar o evento
    setTimeout(() => {
      try {
        if (element.requestFullscreen) {
          element.requestFullscreen().then(() => {
            emFullscreen = true;
            tentativasFullscreen = 0; // Resetar contador
            console.log("Modo fullscreen ativado");
          }).catch(err => {
            console.error("Erro ao ativar fullscreen:", err);
            // Tentar abordagem alternativa se a primeira falhar
            tentarMétodosAlternativos();
          });
        } else if (element.mozRequestFullScreen) {
          element.mozRequestFullScreen();
          emFullscreen = true;
          tentativasFullscreen = 0;
        } else if (element.webkitRequestFullscreen) {
          element.webkitRequestFullscreen();
          emFullscreen = true;
          tentativasFullscreen = 0;
        } else if (element.msRequestFullscreen) {
          element.msRequestFullscreen();
          emFullscreen = true;
          tentativasFullscreen = 0;
        }
      } catch (erro) {
        console.error("Erro ao tentar ativar fullscreen:", erro);
        // Tentar abordagem alternativa
        tentarMétodosAlternativos();
      }
    }, 100);
  } catch (erro) {
    console.error("Erro ao simular clique:", erro);
    tentarMétodosAlternativos();
  }
  
  // Função para tentar métodos alternativos de fullscreen
  function tentarMétodosAlternativos() {
    // Tentar novamente após um breve atraso se não atingiu o limite
    if (tentativasFullscreen < maxTentativasFullscreen) {
      console.log(`Tentativa ${tentativasFullscreen} de ${maxTentativasFullscreen} para ativar fullscreen`);
      setTimeout(() => {
        // Em uma nova tentativa, vamos tentar uma estratégia diferente
        try {
          // Tentar interação mais direta
          const botaoAleatorio = document.querySelector('button') || 
                               document.querySelector('a') || 
                               document.querySelector('div');
          
          if (botaoAleatorio) {
            // Simular clique em um elemento da página
            botaoAleatorio.dispatchEvent(new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            }));
            
            // Pequeno atraso e então tentar fullscreen novamente
            setTimeout(() => {
              if (element.requestFullscreen) {
                element.requestFullscreen();
              } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
              } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
              } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
              }
            }, 100);
          } else {
            // Se não encontrar elementos para clicar, tentar diretamente
            if (element.requestFullscreen) {
              element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
              element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
              element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
              element.msRequestFullscreen();
            }
          }
        } catch (erro) {
          console.error("Erro na tentativa alternativa de ativar fullscreen:", erro);
        }
      }, 1000);
    } else {
      console.warn("Máximo de tentativas de fullscreen atingido. O modo fullscreen pode precisar de interação manual do usuário.");
      // Exibir uma mensagem para o usuário
      mostrarMensagemFullscreen();
    }
  }
  
  // Função para mostrar mensagem orientando o usuário a clicar na tela
  function mostrarMensagemFullscreen() {
    // Verificar se a mensagem já existe
    if (document.getElementById('fullscreen-message')) return;
    
    const mensagem = document.createElement('div');
    mensagem.id = 'fullscreen-message';
    mensagem.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-size: 18px;
      text-align: center;
      z-index: 99999;
      cursor: pointer;
    `;
    mensagem.innerHTML = `
      <p><strong>Clique aqui para ativar o modo tela cheia</strong></p>
      <p style="font-size: 14px;">O navegador requer uma interação do usuário</p>
    `;
    
    // Adicionar o evento de clique para tentar fullscreen
    mensagem.addEventListener('click', () => {
      // Tentar fullscreen novamente quando o usuário clicar
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
      
      // Remover a mensagem após o clique
      document.body.removeChild(mensagem);
    });
    
    // Adicionar ao corpo da página
    document.body.appendChild(mensagem);
    
    // Auto-remover após 10 segundos se o usuário não interagir
    setTimeout(() => {
      if (document.getElementById('fullscreen-message')) {
        document.body.removeChild(mensagem);
      }
    }, 10000);
  }
}

// Desativar fullscreen
function desativarFullscreen() {
  if (!emFullscreen) return;
  
  try {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        emFullscreen = false;
        console.log("Modo fullscreen desativado");
      }).catch(err => {
        console.error("Erro ao desativar fullscreen:", err);
      });
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
      emFullscreen = false;
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
      emFullscreen = false;
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
      emFullscreen = false;
    }
  } catch (erro) {
    console.error("Erro ao desativar fullscreen:", erro);
  }
}

// Verificar se saiu do fullscreen sem intenção e restaurar
function verificarFullscreen() {
  // Se deveria estar em fullscreen mas não está
  if (emFullscreen && 
      !document.fullscreenElement && 
      !document.webkitFullscreenElement && 
      !document.mozFullScreenElement && 
      !document.msFullscreenElement) {
    console.log("Detectada saída involuntária do modo fullscreen");
    emFullscreen = false;
  }
}

// Inicialização
function inicializar() {
  console.log("Inicializando funcionalidades no dashboard");
  
  // Criar o contador na interface primeiro
  criarElementoContador();
  
  // Carregar configuração
  carregarConfiguracao();
  
  // Verificar se a rotação está ativa 
  enviarMensagemSegura({ acao: 'getStatusRotacao' }, (resposta) => {
    if (resposta && resposta.emRotacao) {
      console.log("Rotação ativa detectada, iniciando contador...");
      // Obter tempo restante
      atualizarTempoRestante();
      
      // Iniciar contador
      iniciarContadorRegressivo();
    } else {
      console.log("Rotação não está ativa");
      // Mesmo assim, mostrar o contador para permitir navegação manual
      if (contadorElemento) {
        contadorElemento.style.display = 'flex';
      }
    }
  });
  
  // Adicionar ouvinte para mensagens do background
  chrome.runtime.onMessage.addListener((mensagem, remetente, resposta) => {
    console.log("Mensagem recebida no content script:", mensagem);
    
    try {
      if (mensagem.acao === 'atualizarTempo') {
        tempoRestante = mensagem.tempoRestante;
        atualizarContador();
      } else if (mensagem.acao === 'iniciarContador') {
        console.log("Iniciando contador via mensagem...");
        iniciarContadorRegressivo();
      } else if (mensagem.acao === 'pararContador') {
        console.log("Parando contador via mensagem...");
        pararContadorRegressivo();
        if (mensagem.sairFullscreen && emFullscreen) {
          desativarFullscreen();
        }
      } else if (mensagem.acao === 'toggleFullscreen') {
        if (emFullscreen) {
          desativarFullscreen();
        } else {
          ativarFullscreen();
        }
      } else if (mensagem.acao === 'ativarFullscreen') {
        ativarFullscreen();
      } else if (mensagem.acao === 'ping') {
        // Responder a ping para verificar a conexão
        console.log("Ping recebido, respondendo...");
      }
      resposta({ sucesso: true });
    } catch (erro) {
      console.error('Erro ao processar mensagem no content script:', erro);
      resposta({ sucesso: false, mensagem: "Erro interno: " + erro.message });
    }
    
    return true;
  });
  
  // Adicionar botão de fullscreen ao contador
  adicionarBotaoFullscreen();
}

// Adicionar botão de fullscreen ao contador
function adicionarBotaoFullscreen() {
  if (!contadorElemento) return;
  
  const botoesDiv = contadorElemento.querySelector('div > div');
  if (!botoesDiv) return;
  
  const botaoFullscreen = document.createElement('button');
  botaoFullscreen.innerHTML = '&#x26F6;'; // Ícone de fullscreen
  botaoFullscreen.title = 'Alternar tela cheia';
  botaoFullscreen.style.cssText = `
    background-color: #336699;
    color: white;
    border: none;
    border-radius: 3px;
    width: 24px;
    height: 24px;
    margin-left: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  botaoFullscreen.addEventListener('click', () => {
    if (emFullscreen) {
      desativarFullscreen();
    } else {
      ativarFullscreen();
    }
  });
  
  botoesDiv.appendChild(botaoFullscreen);
}

// Criar elemento do contador na interface
function criarElementoContador() {
  console.log("Tentando criar elemento do contador...");
  
  // Verificar se já existe
  if (document.getElementById('superset-rotator-countdown')) {
    console.log("Elemento do contador já existe");
    return;
  }
  
  console.log("Criando novo elemento do contador...");
  
  // Criar o elemento
  contadorElemento = document.createElement('div');
  contadorElemento.id = 'superset-rotator-countdown';
  contadorElemento.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 6px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    min-width: 200px;
  `;
  
  // Adicionar informações sobre o dashboard atual
  const dashboardInfoDiv = document.createElement('div');
  dashboardInfoDiv.style.marginBottom = '8px';
  dashboardInfoDiv.style.fontWeight = 'bold';
  dashboardInfoDiv.id = 'superset-rotator-dashboard-info';
  dashboardInfoDiv.textContent = 'Dashboard: Carregando...';
  contadorElemento.appendChild(dashboardInfoDiv);
  
  // Adicionar o contador
  const contadorDiv = document.createElement('div');
  contadorDiv.style.display = 'flex';
  contadorDiv.style.alignItems = 'center';
  contadorDiv.style.justifyContent = 'space-between';
  contadorDiv.style.width = '100%';
  
  const tempoSpan = document.createElement('span');
  tempoSpan.id = 'superset-rotator-time';
  tempoSpan.textContent = 'Próximo em: --:--';
  tempoSpan.style.fontSize = '13px';
  contadorDiv.appendChild(tempoSpan);
  
  // Botões de controle
  const botoesDiv = document.createElement('div');
  botoesDiv.style.marginLeft = '10px';
  botoesDiv.style.display = 'flex';
  botoesDiv.style.gap = '5px';
  
  const botaoAnterior = document.createElement('button');
  botaoAnterior.innerHTML = '&lt;';
  botaoAnterior.title = 'Dashboard anterior';
  botaoAnterior.style.cssText = `
    background-color: #336699;
    color: white;
    border: none;
    border-radius: 3px;
    width: 26px;
    height: 26px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
  `;
  botaoAnterior.addEventListener('click', () => {
    console.log("Botão anterior clicado");
    enviarMensagemSegura({ acao: 'dashboardAnterior' });
  });
  
  const botaoProximo = document.createElement('button');
  botaoProximo.innerHTML = '&gt;';
  botaoProximo.title = 'Próximo dashboard';
  botaoProximo.style.cssText = botaoAnterior.style.cssText;
  botaoProximo.addEventListener('click', () => {
    console.log("Botão próximo clicado");
    enviarMensagemSegura({ acao: 'proximoDashboard' });
  });
  
  botoesDiv.appendChild(botaoAnterior);
  botoesDiv.appendChild(botaoProximo);
  contadorDiv.appendChild(botoesDiv);
  
  contadorElemento.appendChild(contadorDiv);
  
  // Adicionar ao corpo da página
  document.body.appendChild(contadorElemento);
  
  console.log("Elemento do contador criado e adicionado ao DOM");
  console.log("Contador visível:", contadorElemento.style.display);
  
  // Forçar exibição
  contadorElemento.style.display = 'flex';
  
  // Atualizar informações
  atualizarInformacoesDashboard();
}

// Carregar configuração
function carregarConfiguracao() {
  try {
    chrome.storage.local.get(['configuracao'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao carregar configuração:', chrome.runtime.lastError.message);
        return;
      }
      
      if (result.configuracao) {
        configuracao = result.configuracao;
        dashboards = configuracao.dashboards || [];
        
        // Obter índice atual
        enviarMensagemSegura({ acao: 'getIndiceAtual' }, (resposta) => {
          if (resposta && resposta.indiceAtual !== undefined) {
            indiceAtual = resposta.indiceAtual;
            atualizarInformacoesDashboard();
          }
        });
      }
    });
  } catch (erro) {
    console.error('Erro ao tentar carregar configuração:', erro);
  }
}

// Atualizar informações sobre o dashboard atual
function atualizarInformacoesDashboard() {
  if (!contadorElemento || !dashboards || dashboards.length === 0) return;
  
  const infoElement = document.getElementById('superset-rotator-dashboard-info');
  if (!infoElement) return;
  
  // Dashboard atual
  if (indiceAtual >= 0 && indiceAtual < dashboards.length && dashboards[indiceAtual]) {
    const dashAtual = dashboards[indiceAtual];
    const nome = dashAtual && dashAtual.nome ? dashAtual.nome : 'Atual';
    infoElement.textContent = `Dashboard: ${nome}`;
  } else {
    infoElement.textContent = 'Dashboard: Desconhecido';
  }
}

// Obter tempo restante do background
function atualizarTempoRestante() {
  enviarMensagemSegura({ acao: 'getTempoRestante' }, (resposta) => {
    if (resposta && resposta.tempoRestante !== undefined) {
      tempoRestante = resposta.tempoRestante;
      atualizarContador();
    }
  });
}

// Iniciar contador regressivo
function iniciarContadorRegressivo() {
  pararContadorRegressivo();
  
  // Obter valor inicial
  atualizarTempoRestante();
  
  // Mostrar o contador
  if (contadorElemento) {
    contadorElemento.style.display = 'flex';
  }
  
  // Iniciar o intervalo
  idInterval = setInterval(() => {
    tempoRestante--;
    
    if (tempoRestante <= 0) {
      // Quando o tempo chegar a zero, apenas obter o novo tempo restante
      // A troca de dashboard será feita pelo background script
      atualizarTempoRestante();
    } else {
      atualizarContador();
    }
  }, 1000);
}

// Parar contador regressivo
function pararContadorRegressivo() {
  if (idInterval) {
    clearInterval(idInterval);
    idInterval = null;
  }
  
  // Não ocultar o contador, apenas parar o intervalo
  // O contador deve permanecer visível para navegação manual
}

// Atualizar o contador na interface
function atualizarContador() {
  if (!contadorElemento) return;
  
  const tempoElement = document.getElementById('superset-rotator-time');
  if (!tempoElement) return;
  
  const minutos = Math.floor(tempoRestante / 60);
  const segundos = tempoRestante % 60;
  tempoElement.textContent = `Próximo em: ${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}

// Detectar alterações no estado do fullscreen
document.addEventListener("fullscreenchange", () => {
  emFullscreen = !!document.fullscreenElement;
  console.log(`Estado do fullscreen alterado: ${emFullscreen ? "Ativado" : "Desativado"}`);
  verificarFullscreen();
});
document.addEventListener("webkitfullscreenchange", () => {
  emFullscreen = !!document.webkitFullscreenElement;
  verificarFullscreen();
});
document.addEventListener("mozfullscreenchange", () => {
  emFullscreen = !!document.mozFullScreenElement;
  verificarFullscreen();
});
document.addEventListener("MSFullscreenChange", () => {
  emFullscreen = !!document.msFullscreenElement;
  verificarFullscreen();
});

// Garantir que o contador seja removido ao descarregar a página
window.addEventListener('beforeunload', () => {
  if (contadorElemento && contadorElemento.parentNode) {
    contadorElemento.parentNode.removeChild(contadorElemento);
  }
}); 