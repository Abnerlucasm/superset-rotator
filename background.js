// Variáveis globais
let dashboards = [];
let indiceAtual = 0;
let intervaloSegundos = 30;
let configuracao = null;
let emRotacao = false;
let tempoRestante = 0; // Tempo restante para a próxima troca
let ultimoTempo = Date.now(); // Registra quando foi a última verificação de tempo
let loginAutomatico = false; // Controle para login automático

// Ao iniciar a extensão
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extensão Superset Dashboard Rotator instalada');
  carregarConfiguracao();
});

// Carregar configuração
async function carregarConfiguracao() {
  try {
    // Tentar obter da storage
    chrome.storage.local.get(['configuracao'], (result) => {
      if (result.configuracao) {
        configuracao = result.configuracao;
        console.log('Configuração carregada da storage');
        dashboards = configuracao.dashboards || [];
        intervaloSegundos = configuracao.intervalo_segundos || 30;
        tempoRestante = intervaloSegundos; // Inicializa o tempo restante
      } else {
        // Valores padrão
        configuracao = {
          usuario: "",
          senha: "",
          server_url: "",
          intervalo_segundos: 30,
          dashboards: []
        };
        console.log('Configuração padrão criada');
      }
    });
  } catch (erro) {
    console.error('Erro ao carregar configuração:', erro);
  }
}

// Salvar configuração
function salvarConfiguracao() {
  chrome.storage.local.set({ configuracao });
  console.log('Configuração salva');
}

// Atualizar tempo restante
function atualizarTempoRestante() {
  const agora = Date.now();
  const tempoPassado = Math.floor((agora - ultimoTempo) / 1000);
  ultimoTempo = agora;
  
  tempoRestante = Math.max(0, tempoRestante - tempoPassado);
  
  // Se o tempo chegou a zero e estamos em rotação, avançar para o próximo dashboard
  if (tempoRestante <= 0 && emRotacao) {
    proximoDashboard();
    tempoRestante = intervaloSegundos;
  }
}

// Verificar se as credenciais estão salvas
function temCredenciaisSalvas() {
  return configuracao && configuracao.usuario && configuracao.senha;
}

// Iniciar rotação de dashboards
function iniciarRotacao() {
  if (emRotacao) {
    return { sucesso: false, mensagem: "Já está em rotação" }; // Já está em rotação
  }
  
  if (!dashboards || dashboards.length === 0) {
    console.error('Não há dashboards configurados');
    return { sucesso: false, mensagem: "Sem dashboards" };
  }
  
  // Se temos credenciais, vamos verificar o login ou carregar o dashboard diretamente
  if (temCredenciaisSalvas()) {
    loginAutomatico = true;
    
    // Verificar se já tem uma aba do superset aberta
    chrome.tabs.query({}, (tabs) => {
      let supersetAberto = false;
      let dashboardEncontrado = false;
      
      for (const tab of tabs) {
        if (tab.url && tab.url.includes(configuracao.server_url)) {
          supersetAberto = true;
          
          // Verificar se está na página de login
          if (tab.url.includes('/login/')) {
            // Está na página de login, precisamos fazer login
            chrome.tabs.update(tab.id, { active: true });
            break;
          } else if (tab.url.includes('/superset/dashboard/')) {
            // Já está em um dashboard, podemos iniciar a rotação diretamente
            dashboardEncontrado = true;
            emRotacao = true;
            ultimoTempo = Date.now();
            tempoRestante = intervaloSegundos;
            
            // Notificar a tab atual para iniciar o contador
            verificarTabPronta(tab.id, (pronta) => {
              if (pronta) {
                enviarMensagemSegura(tab.id, { 
                  acao: 'iniciarContador'
                });
              } else {
                console.log('Tab não está pronta para receber mensagens');
              }
            });
            
            // Criar alarmes
            criarAlarmes();
            
            // Definir o índice atual com base na URL
            for (let i = 0; i < dashboards.length; i++) {
              if (tab.url === dashboards[i].url) {
                indiceAtual = i;
                break;
              }
            }
            
            return;
          } else if (tab.url.includes('/superset/welcome/')) {
            // Está na página de boas-vindas, vamos atualizar para o dashboard
            chrome.tabs.update(tab.id, { url: dashboards[indiceAtual].url, active: true });
            
            // Iniciar rotação após breve atraso para carregar
            setTimeout(() => {
              emRotacao = true;
              ultimoTempo = Date.now();
              tempoRestante = intervaloSegundos;
              criarAlarmes();
            }, 1000);
            
            return;
          }
        }
      }
      
      // Se não encontrou uma tab de dashboard mas encontrou outra página do Superset
      if (supersetAberto && !dashboardEncontrado) {
        // Procurar por qualquer tab do Superset para atualizar
        for (const tab of tabs) {
          if (tab.url && tab.url.includes(configuracao.server_url)) {
            chrome.tabs.update(tab.id, { url: dashboards[indiceAtual].url, active: true });
            
            // Iniciar rotação após breve atraso para carregar
            setTimeout(() => {
              emRotacao = true;
              ultimoTempo = Date.now();
              tempoRestante = intervaloSegundos;
              criarAlarmes();
            }, 1000);
            
            return;
          }
        }
      }
      
      // Se não encontrou nenhuma aba aberta, criar nova aba com o dashboard
      if (!supersetAberto) {
        // Abrir diretamente o primeiro dashboard
        chrome.tabs.create({ url: dashboards[indiceAtual].url }, (tab) => {
          // Iniciar rotação após breve atraso para carregar
          setTimeout(() => {
            emRotacao = true;
            ultimoTempo = Date.now();
            tempoRestante = intervaloSegundos;
            criarAlarmes();
          }, 1500);
        });
      }
    });
    
    return { sucesso: true, mensagem: "Iniciando rotação" };
  }
  
  // Se não tem credenciais, iniciar diretamente
  iniciarRotacaoDireta();
  return { sucesso: true, indiceAtual: indiceAtual };
}

// Criar alarmes para a rotação
function criarAlarmes() {
  // Criar alarme para alternar os dashboards
  chrome.alarms.create('trocarDashboard', {
    periodInMinutes: intervaloSegundos / 60
  });
  
  // Criar alarme para atualizar o tempo restante
  chrome.alarms.create('atualizarTempo', {
    periodInMinutes: 1/60 // 1 segundo
  });
  
  console.log(`Rotação iniciada com intervalo de ${intervaloSegundos} segundos`);
}

// Iniciar rotação diretamente (sem verificar login)
function iniciarRotacaoDireta() {
  emRotacao = true;
  ultimoTempo = Date.now();
  tempoRestante = intervaloSegundos;
  
  // Criar alarmes
  criarAlarmes();
  
  // Carregar o primeiro dashboard
  carregarDashboard(indiceAtual);
}

// Parar rotação
function pararRotacao() {
  chrome.alarms.clear('trocarDashboard');
  chrome.alarms.clear('atualizarTempo');
  emRotacao = false;
  
  // Notificar todas as tabs para parar o contador
  try {
    // Construir URL pattern de forma segura
    const urlPattern = construirURL(configuracao.server_url, '/superset/dashboard/*');
    
    chrome.tabs.query({url: urlPattern}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao buscar tabs:', chrome.runtime.lastError.message);
        return;
      }
      
      if (tabs && Array.isArray(tabs)) {
        tabs.forEach(tab => {
          enviarMensagemSegura(tab.id, { 
            acao: 'pararContador',
            sairFullscreen: false
          });
        });
      } else {
        console.log('Nenhuma tab encontrada ou resultado inválido');
      }
    });
  } catch (erro) {
    console.error('Erro ao notificar tabs:', erro);
  }
  
  console.log('Rotação parada');
  return { sucesso: true };
}

// Alternar para o próximo dashboard
function proximoDashboard() {
  indiceAtual = (indiceAtual + 1) % dashboards.length;
  carregarDashboard(indiceAtual);
  // Reiniciar o tempo restante
  tempoRestante = intervaloSegundos;
  ultimoTempo = Date.now();
  return { sucesso: true, indiceAtual: indiceAtual };
}

// Alternar para o dashboard anterior
function dashboardAnterior() {
  indiceAtual = (indiceAtual - 1 + dashboards.length) % dashboards.length;
  carregarDashboard(indiceAtual);
  // Reiniciar o tempo restante
  tempoRestante = intervaloSegundos;
  ultimoTempo = Date.now();
  return { sucesso: true, indiceAtual: indiceAtual };
}

// Carregar dashboard pelo índice
function carregarDashboard(indice) {
  if (!dashboards || !dashboards[indice]) {
    return { sucesso: false, mensagem: "Dashboard não encontrado" };
  }
  
  const dashboard = dashboards[indice];
  console.log(`Carregando dashboard: ${dashboard.nome}`);
  
  // Procurar se a aba já existe
  chrome.tabs.query({}, (tabs) => {
    let encontrado = false;
    
    for (const tab of tabs) {
      // Verificar se a URL corresponde a um dashboard do Superset
      if (tab.url && tab.url.includes('superset/dashboard')) {
        // Atualizar a aba existente para o novo dashboard
        chrome.tabs.update(tab.id, { url: dashboard.url, active: true });
        encontrado = true;
        break;
      } else if (tab.url && tab.url.includes(configuracao.server_url)) {
        // Se não encontrou dashboard, mas tem qualquer página do Superset aberta,
        // atualizar essa página para o dashboard
        chrome.tabs.update(tab.id, { url: dashboard.url, active: true });
        encontrado = true;
        break;
      }
    }
    
    // Se não encontrar uma aba, criar uma nova
    if (!encontrado) {
      chrome.tabs.create({ url: dashboard.url });
    }
  });
  
  return { sucesso: true, indiceAtual: indice };
}

// Realizar login no Superset
function fazerLogin() {
  if (!configuracao.usuario || !configuracao.senha) {
    console.error('Usuário ou senha não configurados');
    return { sucesso: false, mensagem: "Credenciais não configuradas" };
  }
  
  try {
    // Construir URL de login de forma segura
    const loginUrl = construirURL(configuracao.server_url, '/login/');
    
    // Abrir a página de login
    chrome.tabs.create({ url: loginUrl }, (tab) => {
      // O script content-login.js será injetado automaticamente
      // e fará o login usando as credenciais
    });
  } catch (erro) {
    console.error('Erro ao abrir página de login:', erro);
    return { sucesso: false, mensagem: "Erro ao abrir página de login" };
  }
  
  return { sucesso: true };
}

// Verificar se já está logado tentando abrir um dashboard
function verificarLogin() {
  if (!dashboards || dashboards.length === 0) {
    console.error('Não há dashboards configurados');
    return { sucesso: false, mensagem: "Sem dashboards" };
  }
  
  const primeiroUrl = dashboards[0].url;
  
  // Tentar abrir o primeiro dashboard
  chrome.tabs.create({ url: primeiroUrl }, (tab) => {
    // Verificaremos no script de conteúdo se fomos redirecionados para a tela de login
    // Se for redirecionado, o script content-login.js será acionado
  });
  
  return { sucesso: true };
}

// Função para construir URL de forma segura
function construirURL(baseUrl, path = '') {
  try {
    if (!baseUrl) {
      throw new Error('URL base não fornecida');
    }
    
    // Se já tem protocolo, usar como está
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      return `${baseUrl}${path}`;
    }
    
    // Se não tem protocolo, adicionar http://
    return `http://${baseUrl}${path}`;
  } catch (erro) {
    console.error('Erro ao construir URL:', erro);
    throw erro;
  }
}

// Função segura para enviar mensagens para content scripts
function enviarMensagemSegura(tabId, mensagem, callback = null) {
  try {
    chrome.tabs.sendMessage(tabId, mensagem, (resposta) => {
      if (chrome.runtime.lastError) {
        console.log('Erro ao enviar mensagem para tab:', chrome.runtime.lastError.message);
        if (callback) callback(null);
        return;
      }
      if (callback) callback(resposta);
    });
  } catch (erro) {
    console.error('Erro ao tentar enviar mensagem:', erro);
    if (callback) callback(null);
  }
}

// Função para verificar se uma tab está pronta para receber mensagens
function verificarTabPronta(tabId, callback) {
  try {
    chrome.tabs.sendMessage(tabId, { acao: 'ping' }, (resposta) => {
      if (chrome.runtime.lastError) {
        console.log('Tab não está pronta:', chrome.runtime.lastError.message);
        callback(false);
        return;
      }
      callback(true);
    });
  } catch (erro) {
    console.error('Erro ao verificar tab:', erro);
    callback(false);
  }
}

// Eventos de mensagens da extensão
chrome.runtime.onMessage.addListener((mensagem, remetente, resposta) => {
  console.log('Mensagem recebida:', mensagem);
  
  try {
    switch (mensagem.acao) {
      case 'iniciarRotacao':
        const resultadoInicio = iniciarRotacao();
        resposta(resultadoInicio);
        break;
        
      case 'pararRotacao':
        const resultadoParada = pararRotacao();
        resposta(resultadoParada);
        break;
        
      case 'proximoDashboard':
        const resultadoProximo = proximoDashboard();
        resposta(resultadoProximo);
        break;
        
      case 'dashboardAnterior':
        const resultadoAnterior = dashboardAnterior();
        resposta(resultadoAnterior);
        break;
        
      case 'fazerLogin':
        const resultadoLogin = fazerLogin();
        resposta(resultadoLogin);
        break;
        
      case 'verificarLogin':
        const resultadoVerificar = verificarLogin();
        resposta(resultadoVerificar);
        break;
        
      case 'salvarConfiguracao':
        configuracao = mensagem.configuracao;
        dashboards = configuracao.dashboards || [];
        intervaloSegundos = configuracao.intervalo_segundos || 30;
        tempoRestante = intervaloSegundos; // Atualizar o tempo restante
        salvarConfiguracao();
        resposta({ sucesso: true });
        break;
        
      case 'getConfiguracao':
        carregarConfiguracao();
        resposta({ configuracao });
        break;
        
      case 'getStatusRotacao':
        resposta({ emRotacao: emRotacao });
        break;
        
      case 'getTempoRestante':
        atualizarTempoRestante();
        resposta({ tempoRestante: tempoRestante });
        break;
        
      case 'setTempoRestante':
        tempoRestante = mensagem.tempoRestante;
        ultimoTempo = Date.now();
        resposta({ sucesso: true });
        break;
        
      case 'getIndiceAtual':
        resposta({ indiceAtual: indiceAtual });
        break;
        
      case 'irParaDashboard':
        if (mensagem.indice !== undefined && mensagem.indice >= 0 && mensagem.indice < dashboards.length) {
          const resultado = carregarDashboard(mensagem.indice);
          indiceAtual = mensagem.indice;
          resposta(resultado);
        } else {
          resposta({ sucesso: false, mensagem: "Índice inválido" });
        }
        break;
        
      case 'loginNecessario':
        // Redirecionado para login, então vamos tentar fazer login
        const resultadoLoginNecessario = fazerLogin();
        resposta(resultadoLoginNecessario);
        break;
        
      case 'loginSucesso':
        // Login bem-sucedido
        resposta({ sucesso: true });
        
        // Se estiver esperando o login para iniciar a rotação
        if (loginAutomatico) {
          loginAutomatico = false;
          setTimeout(() => {
            // Iniciar rotação após um breve atraso
            iniciarRotacaoDireta();
          }, 1000);
        }
        break;
        
      case 'ping':
        // Responder a solicitação de ping para verificar a conexão
        resposta({ sucesso: true, mensagem: "pong" });
        break;
        
      default:
        console.log('Ação desconhecida:', mensagem.acao);
        resposta({ sucesso: false, mensagem: "Ação desconhecida" });
    }
  } catch (erro) {
    console.error('Erro ao processar mensagem:', erro);
    resposta({ sucesso: false, mensagem: "Erro interno: " + erro.message });
  }
  
  return true; // Manter o canal de comunicação aberto para respostas assíncronas
});

// Responder ao alarme para trocar dashboards
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'trocarDashboard') {
    proximoDashboard();
  } else if (alarm.name === 'atualizarTempo') {
    atualizarTempoRestante();
  }
}); 