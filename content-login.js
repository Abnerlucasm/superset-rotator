// Script para realizar login automaticamente
console.log('Script de login automático ativado');

// Verificar se estamos na página correta antes de executar
if (!window.location.href.includes('/login/') && !window.location.href.includes('/superset/welcome/')) {
  console.log('Não estamos na página de login ou welcome. Saindo...');
  // Não executar nada se não estivermos na página correta
} else {
  // Função para aguardar um elemento
  function aguardarElemento(seletores, tempoLimite = 15000) {
    return new Promise((resolve, reject) => {
      // Tentar múltiplos seletores - isso aumenta a robustez
      if (typeof seletores === 'string') {
        seletores = [seletores];
      }
      
      // Verificar se algum dos elementos já existe
      for (const seletor of seletores) {
        const elementoExistente = document.querySelector(seletor);
        if (elementoExistente) {
          console.log(`Elemento encontrado imediatamente: ${seletor}`);
          return resolve(elementoExistente);
        }
      }
      
      const inicioTempo = Date.now();
      const intervalo = setInterval(() => {
        for (const seletor of seletores) {
          const elemento = document.querySelector(seletor);
          if (elemento) {
            clearInterval(intervalo);
            console.log(`Elemento encontrado após espera: ${seletor}`);
            resolve(elemento);
            return;
          }
        }
        
        if (Date.now() - inicioTempo > tempoLimite) {
          clearInterval(intervalo);
          console.error(`Tempo limite excedido ao buscar elementos: ${seletores.join(', ')}`);
          reject(new Error(`Tempo limite excedido ao buscar elementos: ${seletores.join(', ')}`));
        }
      }, 100);
    });
  }

  // Função para enviar mensagens de forma segura
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

  // Função para verificar se há sessão válida
  async function verificarSessaoValida() {
    try {
      // Verificar se estamos na página de welcome (indica que já está logado)
      if (window.location.href.includes('/superset/welcome/')) {
        console.log('Detectada página de welcome - usuário já está logado');
        return true;
      }
      
      // Verificar se há elementos que indicam que o usuário está logado
      const elementosLogado = [
        '.navbar', // Barra de navegação do Superset
        '.ant-layout-header', // Header do Ant Design
        '[data-test="navbar"]', // Teste de navbar
        '.user-info', // Informações do usuário
        '.logout', // Botão de logout
        '.user-dropdown' // Dropdown do usuário
      ];
      
      for (const seletor of elementosLogado) {
        const elemento = document.querySelector(seletor);
        if (elemento) {
          console.log(`Elemento de sessão válida encontrado: ${seletor}`);
          return true;
        }
      }
      
      // Verificar se não estamos na página de login
      if (!window.location.href.includes('/login/')) {
        console.log('Não estamos na página de login - possível sessão válida');
        return true;
      }
      
      return false;
    } catch (erro) {
      console.error('Erro ao verificar sessão válida:', erro);
      return false;
    }
  }

  // Função principal para fazer login
  async function fazerLogin() {
    try {
      console.log('Verificando se estamos na página de login...');
      
      // Verifica se estamos na página de login
      if (!window.location.href.includes('/login/')) {
        console.log('Não estamos na página de login.');
        return;
      }
      
      console.log('Estamos na página de login. Obtendo credenciais...');
      
      // Obter as credenciais da configuração
      chrome.storage.local.get(['configuracao'], async (result) => {
        if (!result.configuracao || !result.configuracao.usuario || !result.configuracao.senha) {
          console.error('Credenciais não encontradas na configuração.');
          return;
        }
        
        const usuario = result.configuracao.usuario;
        const senha = result.configuracao.senha;
        
        console.log('Credenciais obtidas. Preenchendo formulário...');
        
        try {
          // Aguardar os campos de login com múltiplas opções de seletores
          const campoUsuario = await aguardarElemento([
            'input[name="username"]', 
            'input#username', 
            'input[type="text"]',
            'input[placeholder*="username" i]',
            'input[placeholder*="usuário" i]',
            'input[autofocus]',
            'input[type="email"]'
          ]);
          
          const campoSenha = await aguardarElemento([
            'input[name="password"]', 
            'input#password', 
            'input[type="password"]',
            'input[placeholder*="password" i]',
            'input[placeholder*="senha" i]'
          ]);
          
          const botaoLogin = await aguardarElemento([
            'input[type="submit"][value="Sign In"]',
            'input[type="submit"]',
            'button[type="submit"]', 
            'button.btn-primary',
            'button:contains("Login")',
            'button:contains("Sign In")',
            'button:contains("Entrar")',
            'form button',
            'button[class*="btn"]',
            'input[value*="Sign"]',
            'input[value*="Login"]'
          ]);
          
          console.log('Campos encontrados, preenchendo...');
          
          // Limpar campos primeiro
          campoUsuario.value = '';
          campoSenha.value = '';
          
          // Preencher os campos
          campoUsuario.value = usuario;
          campoSenha.value = senha;
          
          // Disparar eventos para garantir que o formulário reconheça as alterações
          campoUsuario.dispatchEvent(new Event('input', { bubbles: true }));
          campoUsuario.dispatchEvent(new Event('change', { bubbles: true }));
          campoUsuario.dispatchEvent(new Event('blur', { bubbles: true }));
          campoSenha.dispatchEvent(new Event('input', { bubbles: true }));
          campoSenha.dispatchEvent(new Event('change', { bubbles: true }));
          campoSenha.dispatchEvent(new Event('blur', { bubbles: true }));
          
          // Dar tempo para o formulário processar
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          console.log('Campos preenchidos. Enviando formulário...');
          
          // Tentar submeter o formulário de várias maneiras
          const submeterFormulario = () => {
            try {
              // Método 1: Clicar no botão de submit
              if (botaoLogin) {
                console.log('Tentando clicar no botão de login...');
                botaoLogin.click();
                console.log('Clique no botão de login executado');
              }
              
              // Método 2: Submeter o formulário diretamente
              const formulario = document.querySelector('form');
              if (formulario) {
                console.log('Tentando submeter formulário diretamente...');
                formulario.submit();
                console.log('Formulário submetido diretamente');
              }
              
              // Método 3: Simular evento de submit
              if (formulario) {
                console.log('Tentando disparar evento de submit...');
                formulario.dispatchEvent(new Event('submit', { bubbles: true }));
                console.log('Evento de submit disparado');
              }
              
              // Método 4: Simular pressionar enter no campo de senha
              console.log('Tentando simular pressionar Enter...');
              campoSenha.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
              }));
              console.log('Evento de teclado Enter disparado');
              
              // Método 5: Simular pressionar enter no campo de usuário
              campoUsuario.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
              }));
              console.log('Evento de teclado Enter no usuário disparado');
              
              // Método 6: Tentar submeter via JavaScript
              if (formulario && formulario.onsubmit) {
                console.log('Tentando submeter via onsubmit...');
                formulario.onsubmit();
              }
              
            } catch (erro) {
              console.error('Erro ao tentar submeter formulário:', erro);
            }
          };
          
          // Executar submissão
          submeterFormulario();
          
          // Verificar o resultado do login
          const verificacaoLogin = setInterval(() => {
            // Verificar se fomos redirecionados
            if (!window.location.href.includes('/login/')) {
              clearInterval(verificacaoLogin);
              console.log('Login bem-sucedido! Redirecionado para:', window.location.href);
              
              // Notificar o background script
              enviarMensagemSegura({ acao: 'loginSucesso' });
              
              // Verificar se estamos na página de boas-vindas
              if (window.location.href.includes('/superset/welcome/')) {
                verificarWelcomePage();
              }
            }
          }, 2000);
          
          // Parar verificação após 30 segundos
          setTimeout(() => {
            clearInterval(verificacaoLogin);
            console.log('Verificação de login finalizada');
          }, 30000);
          
        } catch (erro) {
          console.error('Erro ao preencher formulário de login:', erro);
        }
      });
    } catch (erro) {
      console.error('Erro na função fazerLogin:', erro);
    }
  }

  // Detectar redirecionamento para a página de login a partir de um dashboard
  function verificarRedirecionamentoLogin() {
    if (window.location.href.includes('/login/')) {
      // Verificar se estava tentando acessar um dashboard
      const urlAnterior = document.referrer;
      if (urlAnterior && urlAnterior.includes('/superset/dashboard/')) {
        console.log('Redirecionado para login a partir de um dashboard');
        enviarMensagemSegura({ acao: 'loginNecessario' });
      }
    }
  }

  // Verificar se estamos na página de welcome e redirecionar para o dashboard (só quando solicitado)
  function verificarWelcomePage() {
    if (window.location.href.includes('/superset/welcome/')) {
      console.log('Estamos na página de welcome. Verificando se há dashboards para redirecionar...');
      
      chrome.storage.local.get(['configuracao'], (result) => {
        if (result.configuracao && result.configuracao.dashboards && result.configuracao.dashboards.length > 0) {
          const primeiroDashboard = result.configuracao.dashboards[0];
          console.log('Redirecionando da página welcome para:', primeiroDashboard.url);
          window.location.href = primeiroDashboard.url;
        }
      });
    }
  }

  // Listener para mensagens do background script
  chrome.runtime.onMessage.addListener((mensagem, remetente, resposta) => {
    console.log('Mensagem recebida no content-login:', mensagem);
    
    try {
      if (mensagem.acao === 'fazerLogin') {
        console.log('Recebida mensagem para fazer login automático');
        fazerLogin();
        resposta({ sucesso: true });
      } else if (mensagem.acao === 'verificarSessao') {
        console.log('Recebida mensagem para verificar sessão');
        verificarSessaoValida().then(sessaoValida => {
          resposta({ sucesso: true, sessaoValida: sessaoValida });
        });
      } else if (mensagem.acao === 'redirecionarWelcome') {
        console.log('Recebida mensagem para redirecionar da página welcome');
        verificarWelcomePage();
        resposta({ sucesso: true });
      } else if (mensagem.acao === 'ping') {
        // Responder a ping para verificar a conexão
        console.log('Ping recebido, respondendo...');
        resposta({ sucesso: true, mensagem: "pong" });
      }
    } catch (erro) {
      console.error('Erro ao processar mensagem no content-login:', erro);
      resposta({ sucesso: false, mensagem: "Erro interno: " + erro.message });
    }
    
    return true;
  });

  // Executar apenas verificações básicas ao carregar (sem redirecionamento automático)
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado. Verificando redirecionamentos...');
    verificarRedirecionamentoLogin();
    
    // Não executar verificarWelcomePage automaticamente
    // Só será executada quando solicitada via mensagem
  });

  // Em alguns casos, DOMContentLoaded já pode ter sido disparado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM carregado (verificação secundária)');
      verificarRedirecionamentoLogin();
    });
  } else {
    console.log('DOM já carregado. Verificando redirecionamentos imediatamente...');
    verificarRedirecionamentoLogin();
  }
} 