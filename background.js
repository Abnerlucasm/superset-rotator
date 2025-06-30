/**
 * Utilitário de Armazenamento para Extensão Superset
 * Gerencia todos os dados da extensão usando chrome.storage API
 */

// Importar o utilitário de armazenamento
importScripts('storage-utils.js');

// Variáveis globais
let configuracao = null;
let dashboards = [];
let intervaloSegundos = 30;
let tempoRestante = intervaloSegundos;
let emRotacao = false;
let indiceAtual = 0;
let ultimoTempo = Date.now();
let loginAutomatico = false;
let configuracaoCarregada = false; // Flag para indicar se a configuração foi carregada

// Ao iniciar a extensão
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extensão Superset Dashboard Rotator instalada');
  carregarConfiguracao();
});

// Quando a extensão é ativada (navegador reaberto)
chrome.runtime.onStartup.addListener(() => {
  console.log('Extensão Superset Dashboard Rotator ativada');
  carregarConfiguracao();
});

// Carregar configuração usando o novo sistema de armazenamento
async function carregarConfiguracao() {
  try {
    console.log('Carregando configuração usando storageUtils...');
    
    // Carregar dados usando o novo sistema
    const dadosExtensao = await storageUtils.carregar('dados_extensao', 'local', {
      configuracao: {
        usuario: '',
        senha: '',
        server_url: '',
        intervalo_segundos: 30,
        dashboards: [],
        auto_login: false,
        fullscreen: false
      },
      preferencias: {
        tema: 'claro',
        idioma: 'pt-BR',
        notificacoes: true,
        auto_salvar: true,
        debounce_tempo: 1000
      },
      estado: {
        em_rotacao: false,
        indice_atual: 0,
        tempo_restante: 30,
        ultima_atualizacao: Date.now(),
        sessao_valida: false
      },
      historico: {
        logins: [],
        dashboards_acessados: [],
        erros: [],
        ultima_limpeza: Date.now()
      }
    });

    // Atualizar variáveis globais
    configuracao = dadosExtensao.configuracao;
    dashboards = configuracao.dashboards || [];
    intervaloSegundos = configuracao.intervalo_segundos || 30;
    indiceAtual = dadosExtensao.estado.indice_atual || 0;
    emRotacao = dadosExtensao.estado.em_rotacao || false;
    tempoRestante = dadosExtensao.estado.tempo_restante || intervaloSegundos;

    console.log('Configuração carregada com sucesso:', {
      usuario: configuracao.usuario ? '***' : 'não configurado',
      server_url: configuracao.server_url,
      dashboards_count: dashboards.length,
      em_rotacao: emRotacao,
      indice_atual: indiceAtual
    });

    return true;
  } catch (erro) {
    console.error('Erro ao carregar configuração:', erro);
    
    // Inicializar com dados padrão em caso de erro
    inicializarDadosPadrao();
    return false;
  }
}

// Salvar configuração usando o novo sistema
async function salvarConfiguracao() {
  try {
    console.log('Salvando configuração usando storageUtils...');
    
    // Atualizar estado antes de salvar
    const estadoAtualizado = {
      em_rotacao: emRotacao,
      indice_atual: indiceAtual,
      tempo_restante: tempoRestante,
      ultima_atualizacao: Date.now(),
      sessao_valida: false // Será atualizado quando verificar sessão
    };

    // Preparar dados para salvar
    const dadosParaSalvar = {
      configuracao: configuracao,
      estado: estadoAtualizado
    };

    // Salvar usando o novo sistema
    const sucesso = await storageUtils.salvar('dados_extensao', dadosParaSalvar, 'local');
    
    if (sucesso) {
      console.log('Configuração salva com sucesso');
      
      // Adicionar ao histórico
      await storageUtils.adicionarAoHistorico('configuracao', {
        acao: 'salvar',
        dashboards_count: dashboards.length,
        intervalo: intervaloSegundos,
        em_rotacao: emRotacao
      });
    } else {
      console.error('Erro ao salvar configuração');
    }

    return sucesso;
  } catch (erro) {
    console.error('Erro ao salvar configuração:', erro);
    return false;
  }
}

// Inicializar dados padrão
function inicializarDadosPadrao() {
  console.log('Inicializando dados padrão...');
  
  configuracao = {
    usuario: '',
    senha: '',
    server_url: '',
    intervalo_segundos: 30,
    dashboards: [],
    auto_login: false,
    fullscreen: false
  };
  
  dashboards = [];
  intervaloSegundos = 30;
  indiceAtual = 0;
  emRotacao = false;
  tempoRestante = intervaloSegundos;
  ultimoTempo = Date.now();
  
  // Salvar dados padrão
  salvarConfiguracao();
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
  return configuracao && configuracao.usuario && configuracao.senha && configuracao.server_url;
}

// Verificar se há sessão válida antes de redirecionar
async function verificarSessaoValida() {
  try {
    // Verificar se já tem uma aba do superset aberta
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (tab.url && tab.url.includes(configuracao.server_url)) {
        // Verificar se está na página de login
        if (tab.url.includes('/login/')) {
          console.log('Encontrada aba na página de login');
          return { valida: false, tab: tab };
        } else if (tab.url.includes('/superset/dashboard/') || tab.url.includes('/superset/welcome/')) {
          console.log('Encontrada aba com sessão válida:', tab.url);
          return { valida: true, tab: tab };
        }
      }
    }
    
    console.log('Nenhuma aba do Superset encontrada');
    return { valida: false, tab: null };
  } catch (erro) {
    console.error('Erro ao verificar sessão válida:', erro);
    return { valida: false, tab: null };
  }
}

// Iniciar rotação de dashboards
async function iniciarRotacao(configTemp = null) {
  // Aguardar carregamento da configuração se necessário
  if (!configuracaoCarregada) {
    console.log('Aguardando carregamento da configuração...');
    await carregarConfiguracao();
  }
  
  // Usar configuração temporária se fornecida, senão usar a salva
  const configAtual = configTemp || configuracao;
  
  if (emRotacao) {
    return { sucesso: false, mensagem: "Já está em rotação" }; // Já está em rotação
  }
  
  if (!dashboards || dashboards.length === 0) {
    console.error('Não há dashboards configurados');
    return { sucesso: false, mensagem: "Sem dashboards" };
  }
  
  // Verificar se configuracao e server_url existem
  if (!configAtual || !configAtual.server_url) {
    console.error('Configuração ou server_url não encontrados');
    return { sucesso: false, mensagem: "Configuração incompleta" };
  }
  
  // Se temos credenciais, vamos verificar o login ou carregar o dashboard diretamente
  if (temCredenciaisSalvasComConfig(configAtual)) {
    loginAutomatico = true;
    
    // Verificar se já tem uma aba do superset aberta
    chrome.tabs.query({}, (tabs) => {
      let supersetAberto = false;
      let dashboardEncontrado = false;
      
      for (const tab of tabs) {
        if (tab.url && tab.url.includes(configAtual.server_url)) {
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
          if (tab.url && tab.url.includes(configAtual.server_url)) {
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
      
      // Se não encontrou nenhuma aba aberta, NÃO criar nova aba automaticamente
      // Apenas marcar como em rotação e aguardar ação do usuário
      if (!supersetAberto) {
        console.log('Nenhuma aba do Superset encontrada. Iniciando rotação sem criar nova aba.');
            emRotacao = true;
            ultimoTempo = Date.now();
            tempoRestante = intervaloSegundos;
            criarAlarmes();
      }
    });
    
    return { sucesso: true, mensagem: "Iniciando rotação" };
  }
  
  // Se não tem credenciais, iniciar diretamente
  iniciarRotacaoDireta();
  return { sucesso: true, indiceAtual: indiceAtual };
}

// Verificar se as credenciais estão salvas com configuração específica
function temCredenciaisSalvasComConfig(configTemp) {
  return configTemp && configTemp.usuario && configTemp.senha && configTemp.server_url;
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
            acao: 'pararContador'
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

// Fazer login
async function fazerLogin(configTemp = null) {
  // Aguardar carregamento da configuração se necessário
  if (!configuracaoCarregada) {
    console.log('Aguardando carregamento da configuração...');
    await carregarConfiguracao();
  }
  
  // Usar configuração temporária se fornecida, senão usar a salva
  const configAtual = configTemp || configuracao;
  
  if (!temCredenciaisSalvasComConfig(configAtual)) {
    console.error('Credenciais não configuradas');
    return { sucesso: false, mensagem: "Credenciais não configuradas" };
  }
  
  try {
    // Verificar se já há sessão válida
    const sessaoInfo = await verificarSessaoValida();
    
    if (sessaoInfo.valida && sessaoInfo.tab) {
      console.log('Sessão válida encontrada, ativando aba existente');
      chrome.tabs.update(sessaoInfo.tab.id, { active: true });
      return { sucesso: true, mensagem: "Sessão válida encontrada" };
    }
    
    // Se não há sessão válida, verificar se já está na página de login
    if (sessaoInfo.tab && sessaoInfo.tab.url.includes('/login/')) {
      console.log('Já está na página de login, ativando aba');
      chrome.tabs.update(sessaoInfo.tab.id, { active: true });
      
      // Enviar mensagem para fazer login
      setTimeout(() => {
        enviarMensagemSegura(sessaoInfo.tab.id, { acao: 'fazerLogin' });
      }, 1000);
      
      return { sucesso: true, mensagem: "Página de login ativada" };
    }
    
    // Se não há sessão válida, abrir página de login
    console.log('Nenhuma sessão válida encontrada, abrindo página de login');
    const loginUrl = construirURL(configAtual.server_url, '/login/');
    
    // Abrir a página de login
    chrome.tabs.create({ url: loginUrl }, (tab) => {
      // Aguardar um pouco para a página carregar e o content script ser injetado
      setTimeout(() => {
        // Enviar mensagem para o content script executar o login
        enviarMensagemSegura(tab.id, { acao: 'fazerLogin' });
      }, 2000);
    });
  } catch (erro) {
    console.error('Erro ao abrir página de login:', erro);
    return { sucesso: false, mensagem: "Erro ao abrir página de login" };
  }
  
  return { sucesso: true };
}

// Verificar se já está logado tentando abrir um dashboard
async function verificarLogin() {
  if (!dashboards || dashboards.length === 0) {
    console.error('Não há dashboards configurados');
    return { sucesso: false, mensagem: "Sem dashboards" };
  }
  
  try {
    // Verificar se já há sessão válida
    const sessaoInfo = await verificarSessaoValida();
    
    if (sessaoInfo.valida && sessaoInfo.tab) {
      console.log('Sessão válida encontrada, ativando aba existente');
      chrome.tabs.update(sessaoInfo.tab.id, { active: true });
      return { sucesso: true, mensagem: "Sessão válida encontrada" };
    }
    
    // Se não há sessão válida, tentar abrir o primeiro dashboard
  const primeiroUrl = dashboards[0].url;
    console.log('Nenhuma sessão válida encontrada, tentando abrir dashboard:', primeiroUrl);
  
  // Tentar abrir o primeiro dashboard
  chrome.tabs.create({ url: primeiroUrl }, (tab) => {
    // Verificaremos no script de conteúdo se fomos redirecionados para a tela de login
    // Se for redirecionado, o script content-login.js será acionado
  });
  
    return { sucesso: true, mensagem: "Tentando acessar dashboard" };
  } catch (erro) {
    console.error('Erro ao verificar login:', erro);
    return { sucesso: false, mensagem: "Erro ao verificar login" };
  }
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
        // Usar configuração temporária se fornecida
        const configTempInicio = mensagem.configuracao || null;
        const resultadoInicio = iniciarRotacao(configTempInicio);
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
        const configTempLogin = mensagem.configuracao || null;
        fazerLogin(configTempLogin).then(resultado => {
          resposta(resultado);
        });
        return true; // Manter canal aberto para resposta assíncrona
        break;
        
      case 'verificarLogin':
        // Usar configuração temporária se fornecida, senão usar a salva
        const configTemp = mensagem.configuracao || configuracao;
        const resultadoVerificar = verificarLoginComConfig(configTemp);
        resposta(resultadoVerificar);
        break;
        
      case 'verificarSessaoSemRedirecionar':
        // Verificar sessão sem redirecionar
        const configTempSessao = mensagem.configuracao || configuracao;
        verificarSessaoSemRedirecionar(configTempSessao).then(resultado => {
          resposta(resultado);
        });
        return true; // Manter canal aberto para resposta assíncrona
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
        const configTempLoginNecessario = mensagem.configuracao || null;
        const resultadoLoginNecessario = fazerLogin(configTempLoginNecessario);
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

// Verificar sessão sem redirecionar
async function verificarSessaoSemRedirecionar(configTemp) {
  try {
    // Verificar se já tem uma aba do superset aberta
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (tab.url && tab.url.includes(configTemp.server_url)) {
        // Verificar se está na página de login
        if (tab.url.includes('/login/')) {
          console.log('Encontrada aba na página de login - sessão inválida');
          return { sessaoValida: false, tab: tab };
        } else if (tab.url.includes('/superset/dashboard/') || tab.url.includes('/superset/welcome/')) {
          console.log('Encontrada aba com sessão válida:', tab.url);
          return { sessaoValida: true, tab: tab };
        }
      }
    }
    
    console.log('Nenhuma aba do Superset encontrada - sessão inválida');
    return { sessaoValida: false, tab: null };
  } catch (erro) {
    console.error('Erro ao verificar sessão:', erro);
    return { sessaoValida: false, tab: null };
  }
}

// Função para verificar login com configuração específica
function verificarLoginComConfig(configTemp) {
  if (!configTemp || !configTemp.usuario || !configTemp.senha || !configTemp.server_url) {
    return { sucesso: false, mensagem: "Configuração incompleta" };
  }
  
  // Tentar fazer login com a configuração fornecida
  return fazerLoginComConfig(configTemp);
}

// Função para fazer login com configuração específica
function fazerLoginComConfig(configTemp) {
  try {
    // Construir URL de login
    const loginUrl = construirURL(configTemp.server_url, '/login/');
    
    // Abrir página de login
    chrome.tabs.create({ url: loginUrl }, (tab) => {
      // Aguardar um pouco para a página carregar e o content script ser injetado
      setTimeout(() => {
        // Enviar mensagem para o content script executar o login
        enviarMensagemSegura(tab.id, { acao: 'fazerLogin' });
      }, 2000);
    });
    
    return { sucesso: true, mensagem: "Tentativa de login iniciada" };
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    return { sucesso: false, mensagem: "Erro ao fazer login: " + erro.message };
  }
}

// Responder ao alarme para trocar dashboards
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'trocarDashboard') {
    proximoDashboard();
  } else if (alarm.name === 'atualizarTempo') {
    atualizarTempoRestante();
  }
}); 