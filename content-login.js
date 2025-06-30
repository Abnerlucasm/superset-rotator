// Script para realizar login automaticamente
console.log('Script de login automático ativado');

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
          'input[autofocus]'
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
          'form button'
        ]);
        
        console.log('Campos encontrados, preenchendo...');
        
        // Preencher os campos diretamente
        campoUsuario.value = usuario;
        campoSenha.value = senha;
        
        // Disparar eventos para garantir que o formulário reconheça as alterações
        campoUsuario.dispatchEvent(new Event('input', { bubbles: true }));
        campoUsuario.dispatchEvent(new Event('change', { bubbles: true }));
        campoSenha.dispatchEvent(new Event('input', { bubbles: true }));
        campoSenha.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Dar tempo para o formulário processar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Campos preenchidos. Enviando formulário...');
        
        // Tentar submeter o formulário de várias maneiras
        const submeterFormulario = () => {
          try {
            // Método 1: Clicar no botão de submit
            if (botaoLogin) {
              botaoLogin.click();
              console.log('Clique no botão de login executado');
            }
            
            // Método 2: Submeter o formulário diretamente
            const formulario = document.querySelector('form');
            if (formulario) {
              formulario.submit();
              console.log('Formulário submetido diretamente');
            }
            
            // Método 3: Simular evento de submit
            if (formulario) {
              formulario.dispatchEvent(new Event('submit', { bubbles: true }));
              console.log('Evento de submit disparado');
            }
            
            // Método 4: Simular pressionar enter no campo de senha
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
          } catch (erro) {
            console.error('Erro ao tentar submeter formulário:', erro);
          }
        };
        
        // Executar submissão
        submeterFormulario();
        
        // Verificar o resultado do login
        const verificacaoLogin = setInterval(() => {
          console.log('Verificando se o login foi bem-sucedido...');
          
          if (!window.location.href.includes('/login/')) {
            clearInterval(verificacaoLogin);
            console.log('Login bem-sucedido!');
            
            // Notificar o popup sobre o sucesso do login
            enviarMensagemSegura({ acao: 'loginSucesso' });
            
            // Verificar se estamos na página de welcome e redirecionar para o dashboard se necessário
            if (window.location.href.includes('/superset/welcome/')) {
              console.log('Redirecionando da página welcome para o dashboard configurado...');
              
              // Obter o primeiro dashboard da lista para redirecionar
              chrome.storage.local.get(['configuracao'], (result) => {
                if (result.configuracao && result.configuracao.dashboards && result.configuracao.dashboards.length > 0) {
                  const primeiroDashboard = result.configuracao.dashboards[0];
                  console.log('Redirecionando para:', primeiroDashboard.url);
                  // Redirecionar para o primeiro dashboard da lista
                  window.location.href = primeiroDashboard.url;
                }
              });
            } else {
              // Notificar o background script sobre o sucesso do login
              enviarMensagemSegura({ 
                acao: 'loginSucesso',
                fullscreen: false
              });
            }
          }
        }, 500);
        
        // Timeout para a verificação de login
        setTimeout(() => {
          clearInterval(verificacaoLogin);
          
          // Se ainda estamos na página de login, tentar novamente com outra abordagem
          if (window.location.href.includes('/login/')) {
            console.log('Tentativa de login inicial falhou. Tentando abordagem alternativa...');
            
            // Tentar novamente com uma abordagem diferente
            setTimeout(() => {
              submeterFormulario();
              
              // Verificar novamente
              const segundaVerificacao = setInterval(() => {
                if (!window.location.href.includes('/login/')) {
                  clearInterval(segundaVerificacao);
                  console.log('Login bem-sucedido na segunda tentativa!');
                  
                  // Verificar se estamos na página de welcome e redirecionar para o dashboard se necessário
                  if (window.location.href.includes('/superset/welcome/')) {
                    console.log('Redirecionando da página welcome para o dashboard configurado...');
                    
                    // Obter o primeiro dashboard da lista para redirecionar
                    chrome.storage.local.get(['configuracao'], (result) => {
                      if (result.configuracao && result.configuracao.dashboards && result.configuracao.dashboards.length > 0) {
                        const primeiroDashboard = result.configuracao.dashboards[0];
                        console.log('Redirecionando para:', primeiroDashboard.url);
                        // Redirecionar para o primeiro dashboard da lista
                        window.location.href = primeiroDashboard.url;
                      }
                    });
                  } else {
                    // Notificar o background script sobre o sucesso do login
                    enviarMensagemSegura({ 
                      acao: 'loginSucesso',
                      fullscreen: false
                    });
                  }
                }
              }, 500);
              
              // Timeout final
              setTimeout(() => {
                clearInterval(segundaVerificacao);
                if (window.location.href.includes('/login/')) {
                  console.error('Falha no login após múltiplas tentativas.');
                }
              }, 5000);
            }, 1000);
          }
        }, 5000);
      } catch (erro) {
        console.error('Erro ao interagir com os elementos do formulário:', erro);
      }
    });
  } catch (erro) {
    console.error('Erro no processo de login:', erro);
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

// Verificar se estamos na página de welcome e redirecionar para o dashboard
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

// Executar login imediatamente para não perder tempo
fazerLogin();

// Verificar se estamos na página de welcome
verificarWelcomePage();

// Garantir que o login será tentado quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado. Iniciando processo de login...');
  verificarRedirecionamentoLogin();
  fazerLogin();
  verificarWelcomePage();
});

// Em alguns casos, DOMContentLoaded já pode ter sido disparado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado (verificação secundária)');
    verificarRedirecionamentoLogin();
    fazerLogin();
    verificarWelcomePage();
  });
} else {
  console.log('DOM já carregado. Iniciando processo de login imediatamente...');
  verificarRedirecionamentoLogin();
  fazerLogin();
  verificarWelcomePage();
} 