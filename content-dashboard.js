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


// Inicializar funcionalidades
function inicializar() {
  console.log("Inicializando funcionalidades no dashboard");
  
  // Adicionar ouvinte para mensagens do background
  chrome.runtime.onMessage.addListener((mensagem, remetente, resposta) => {
    console.log("Mensagem recebida no content script:", mensagem);
    return true;
  });
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}