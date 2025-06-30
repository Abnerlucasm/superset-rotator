// Status e variáveis
let configuracao = {
  usuario: "",
  senha: "",
  server_url: "",
  intervalo_segundos: 30,
  dashboards: []
};
let emRotacao = false;
let contadorTempo = 0;
let idContadorInterval = null;
let indiceAtual = 0;

// Elementos DOM
const inputIntervalo = document.getElementById('interval');
const inputUsuario = document.getElementById('username');
const inputSenha = document.getElementById('password');
const inputServerURL = document.getElementById('server-url');
const inputNomeDashboard = document.getElementById('dashboard-name');
const inputUrlDashboard = document.getElementById('dashboard-url');
const inputDescDashboard = document.getElementById('dashboard-desc');
const listaDashboards = document.getElementById('dashboard-list');
const statusRotacao = document.getElementById('status-rotation');
const statusLogin = document.getElementById('status-login');
const contadorRegresso = document.getElementById('countdown');
const dashboardAtual = document.getElementById('current-dashboard');
const proximoDashboard = document.getElementById('next-dashboard');
const helpButton = document.getElementById('help-button');
const helpGuide = document.getElementById('help-guide');
const closeGuideButton = document.querySelector('.close-guide');
const apiDashboardsList = document.getElementById('api-dashboards-list');
const apiSearchContainer = document.getElementById('api-search-container');
const inputApiSearch = document.getElementById('api-search');
const addAllContainer = document.getElementById('add-all-container');
const addAllButton = document.getElementById('add-all-dashboards');
const extensionVersion = document.getElementById('extension-version');

// Variáveis para dashboards da API
let dashboardsAPI = [];
let dashboardsAPIFiltrados = [];

// Botões
const botaoIniciar = document.getElementById('start');
const botaoParar = document.getElementById('stop');
const botaoAnterior = document.getElementById('prev');
const botaoProximo = document.getElementById('next');
const botaoLogin = document.getElementById('login');
const botaoAddDashboard = document.getElementById('add-dashboard');
const botaoSalvar = document.getElementById('save-config');
const checkboxSalvarCredenciais = document.getElementById('save-credentials');

// Mostrar/esconder o guia de ajuda
helpButton.addEventListener('click', () => {
  helpGuide.style.display = 'block';
});

closeGuideButton.addEventListener('click', () => {
  helpGuide.style.display = 'none';
});

// Fechar guia quando clicar fora do conteúdo
helpGuide.addEventListener('click', (event) => {
  if (event.target === helpGuide) {
    helpGuide.style.display = 'none';
  }
});

// Fechar guia com a tecla ESC
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && helpGuide.style.display === 'block') {
    helpGuide.style.display = 'none';
  }
});

// Função para verificar atualizações da extensão
async function verificarAtualizacoes() {
  try {
    // URL do arquivo de versão no GitHub (exemplo)
    const urlVersao = 'https://raw.githubusercontent.com/abnerlucasm/superset-rotator/main/version.json';
    
    const resposta = await fetch(urlVersao, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (resposta.ok) {
      const dados = await resposta.json();
      const versaoAtual = chrome.runtime.getManifest().version;
      const versaoNova = dados.version;
      
      if (versaoNova > versaoAtual) {
        // Mostrar notificação de atualização disponível com opção de confirmação
        const notificacao = document.createElement('div');
        notificacao.style.cssText = `
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
          font-size: 12px;
        `;
        notificacao.innerHTML = `
          <div style="margin-bottom: 10px;">
            <i class="fas fa-download"></i> 
            <strong>Nova versão disponível (v${versaoNova})!</strong>
            <br>
            <small>${dados.description || 'Melhorias e correções de bugs'}</small>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="btn-atualizar" style="
              background-color: #28a745;
              color: white;
              border: none;
              padding: 5px 10px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 11px;
            ">
              <i class="fas fa-download"></i> Atualizar Agora
            </button>
            <a href="${dados.download_url}" target="_blank" style="
              color: #007bff; 
              text-decoration: underline;
              font-size: 11px;
            ">
              Baixar Manualmente
            </a>
            <button id="btn-ignorar" style="
              background-color: #6c757d;
              color: white;
              border: none;
              padding: 5px 10px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 11px;
            ">
              Ignorar
            </button>
          </div>
        `;
        
        // Inserir no início do conteúdo
        const content = document.querySelector('.content');
        content.insertBefore(notificacao, content.firstChild);
        
        // Event listeners para os botões
        document.getElementById('btn-atualizar').addEventListener('click', () => {
          if (confirm(`Deseja atualizar a extensão para a versão ${versaoNova}?\n\nA extensão será recarregada após a atualização.`)) {
            // Abrir a página de download em nova aba
            chrome.tabs.create({ url: dados.download_url });
            // Remover a notificação
            notificacao.remove();
          }
        });
        
        document.getElementById('btn-ignorar').addEventListener('click', () => {
          notificacao.remove();
        });
      }
    }
  } catch (erro) {
    console.log('Erro ao verificar atualizações:', erro);
  }
}

// Inicializar os elementos quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Exibir versão da extensão
  extensionVersion.textContent = chrome.runtime.getManifest().version;
  
  carregarConfiguracao();
  atualizarListaDashboards();
  
  // Verificar status de rotação atual
  verificarStatusRotacao();
  
  // Verificar status de login
  verificarStatusLogin();
  
  // Verificar atualizações da extensão
  verificarAtualizacoes();
  
  // Obter o índice atual e atualizar a exibição dos dashboards
  chrome.runtime.sendMessage({ acao: 'getIndiceAtual' }, (resposta) => {
    if (resposta && resposta.indiceAtual !== undefined) {
      indiceAtual = resposta.indiceAtual;
      atualizarExibicaoDashboards();
    }
  });
  
  // Iniciar contador regressivo se a rotação estiver ativa
  chrome.runtime.sendMessage({ acao: 'getTempoRestante' }, (resposta) => {
    if (resposta && resposta.tempoRestante) {
      iniciarContadorRegressivo(resposta.tempoRestante);
    }
  });
});

// Iniciar rotação
botaoIniciar.addEventListener('click', () => {
  if (configuracao.dashboards.length === 0) {
    alert('Nenhum dashboard configurado. Adicione pelo menos um dashboard.');
    return;
  }
  
  if (!inputServerURL.value || !validarFormatoURL(inputServerURL.value)) {
    alert('Configure uma URL válida do servidor Superset (ex: http://192.168.1.100:8080)');
    return;
  }
  
  try {
    chrome.runtime.sendMessage({ acao: 'iniciarRotacao' }, (resposta) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao iniciar rotação:', chrome.runtime.lastError.message);
        alert('Erro ao iniciar rotação. Tente novamente.');
        return;
      }
      
      if (resposta && resposta.sucesso) {
        emRotacao = true;
        iniciarContadorRegressivo(configuracao.intervalo_segundos);
        atualizarStatus();
        
        // Obter o índice atual
        chrome.runtime.sendMessage({ acao: 'getIndiceAtual' }, (resposta) => {
          if (chrome.runtime.lastError) {
            console.warn('Erro ao obter índice atual:', chrome.runtime.lastError.message);
            return;
          }
          
          if (resposta && resposta.indiceAtual !== undefined) {
            indiceAtual = resposta.indiceAtual;
            atualizarExibicaoDashboards();
          }
        });
      }
    });
  } catch (erro) {
    console.error('Erro ao iniciar rotação:', erro);
    alert('Erro ao iniciar rotação. Tente novamente.');
  }
});

// Parar rotação
botaoParar.addEventListener('click', () => {
  try {
    chrome.runtime.sendMessage({ acao: 'pararRotacao' }, (resposta) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao parar rotação:', chrome.runtime.lastError.message);
        alert('Erro ao parar rotação. Tente novamente.');
        return;
      }
      
      if (resposta && resposta.sucesso) {
        emRotacao = false;
        pararContadorRegressivo();
        atualizarStatus();
      }
    });
  } catch (erro) {
    console.error('Erro ao parar rotação:', erro);
    alert('Erro ao parar rotação. Tente novamente.');
  }
});

// Navegar para o dashboard anterior
botaoAnterior.addEventListener('click', () => {
  try {
    chrome.runtime.sendMessage({ acao: 'dashboardAnterior' }, (resposta) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao navegar para dashboard anterior:', chrome.runtime.lastError.message);
        alert('Erro ao navegar. Tente novamente.');
        return;
      }
      
      if (resposta && resposta.indiceAtual !== undefined) {
        indiceAtual = resposta.indiceAtual;
        atualizarExibicaoDashboards();
      }
    });
  } catch (erro) {
    console.error('Erro ao navegar para dashboard anterior:', erro);
    alert('Erro ao navegar. Tente novamente.');
  }
  // Reiniciar contador
  iniciarContadorRegressivo(configuracao.intervalo_segundos);
});

// Navegar para o próximo dashboard
botaoProximo.addEventListener('click', () => {
  try {
    chrome.runtime.sendMessage({ acao: 'proximoDashboard' }, (resposta) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao navegar para próximo dashboard:', chrome.runtime.lastError.message);
        alert('Erro ao navegar. Tente novamente.');
        return;
      }
      
      if (resposta && resposta.indiceAtual !== undefined) {
        indiceAtual = resposta.indiceAtual;
        atualizarExibicaoDashboards();
      }
    });
  } catch (erro) {
    console.error('Erro ao navegar para próximo dashboard:', erro);
    alert('Erro ao navegar. Tente novamente.');
  }
  // Reiniciar contador
  iniciarContadorRegressivo(configuracao.intervalo_segundos);
});

// Fazer login
botaoLogin.addEventListener('click', () => {
  if (!inputUsuario.value || !inputSenha.value) {
    alert('Preencha o usuário e senha');
    return;
  }
  
  if (!inputServerURL.value || !validarFormatoURL(inputServerURL.value)) {
    alert('Configure uma URL válida do servidor Superset (ex: http://192.168.1.100:8080)');
    return;
  }
  
  // Atualizar configuração
  configuracao.usuario = inputUsuario.value;
  configuracao.senha = inputSenha.value;
  configuracao.server_url = inputServerURL.value;
  
  // Salvar e fazer login
  salvarConfiguracao(() => {
    try {
      chrome.runtime.sendMessage({ acao: 'fazerLogin' }, (resposta) => {
        if (chrome.runtime.lastError) {
          console.warn('Erro ao fazer login:', chrome.runtime.lastError.message);
          alert('Erro ao fazer login. Tente novamente.');
          return;
        }
        
        statusLogin.textContent = 'Login: Autenticando...';
        
        // Verificar status do login após um tempo
        setTimeout(() => {
          verificarStatusLogin();
        }, 3000);
      });
    } catch (erro) {
      console.error('Erro ao fazer login:', erro);
      alert('Erro ao fazer login. Tente novamente.');
    }
  });
});

// Verificar status de login
function verificarStatusLogin() {
  // Tentar abrir uma página do Superset para verificar se está logado
  chrome.tabs.query({}, (tabs) => {
    let encontrouSuperset = false;
    
    for (const tab of tabs) {
      if (tab.url && tab.url.includes(configuracao.server_url) && !tab.url.includes('/login/')) {
        encontrouSuperset = true;
        break;
      }
    }
    
    if (encontrouSuperset) {
      statusLogin.textContent = 'Login: Conectado';
      statusLogin.classList.add('active');
    } else {
      statusLogin.textContent = 'Login: Não verificado';
      statusLogin.classList.remove('active');
    }
  });
}

// Listener para mensagens do content script
chrome.runtime.onMessage.addListener((mensagem, remetente, resposta) => {
  try {
    if (mensagem.acao === 'loginSucesso') {
      console.log('Login bem-sucedido detectado');
      statusLogin.textContent = 'Login: Conectado';
      statusLogin.classList.add('active');
    }
  } catch (erro) {
    console.error('Erro ao processar mensagem no popup:', erro);
  }
  return true;
});

// Adicionar dashboard
botaoAddDashboard.addEventListener('click', () => {
  const nome = inputNomeDashboard.value.trim();
  const url = inputUrlDashboard.value.trim();
  const descricao = inputDescDashboard.value.trim();
  
  if (!nome || !url) {
    alert('Preencha os campos obrigatórios: Nome e URL do dashboard');
    return;
  }
  
  // Validar formato da URL
  if (!validarFormatoURL(configuracao.server_url)) {
    alert('Configure uma URL válida do servidor Superset (ex: http://192.168.1.100:8080)');
    return;
  }
  
  if (!url.includes(configuracao.server_url)) {
    alert(`A URL deve ser do Superset em ${configuracao.server_url}`);
    return;
  }
  
  // Adicionar à lista
  configuracao.dashboards.push({ nome, url, descricao });
  
  // Limpar campos
  inputNomeDashboard.value = '';
  inputUrlDashboard.value = '';
  inputDescDashboard.value = '';
  
  // Atualizar lista visual
  atualizarListaDashboards();
  
  // Atualizar exibição de dashboards atual/próximo
  atualizarExibicaoDashboards();
});

// Salvar configuração
botaoSalvar.addEventListener('click', () => {
  // Verificar campos obrigatórios
  if (!inputIntervalo.value) {
    alert('Defina um intervalo de rotação');
    return;
  }
  
  if (!inputServerURL.value || !validarFormatoURL(inputServerURL.value)) {
    alert('Configure uma URL válida do servidor Superset (ex: http://192.168.1.100:8080)');
    return;
  }
  
  // Atualizar dados de formulário
  configuracao.usuario = inputUsuario.value;
  configuracao.senha = inputSenha.value;
  configuracao.server_url = inputServerURL.value;
  configuracao.intervalo_segundos = parseInt(inputIntervalo.value) || 30;
  
  salvarConfiguracao(() => {
    alert('Configuração salva com sucesso!');
  });
});

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

// Função para validar formato da URL
function validarFormatoURL(url) {
  if (!url) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (erro) {
    return false;
  }
}

// Auto-salvar credenciais quando digitar
inputUsuario.addEventListener('change', salvarCredenciais);
inputSenha.addEventListener('change', salvarCredenciais);
inputServerURL.addEventListener('change', () => {
  // Atualizar placeholder do campo URL
  if (inputServerURL.value) {
    inputUrlDashboard.placeholder = `${inputServerURL.value}/superset/dashboard/...`;
  } else {
    inputUrlDashboard.placeholder = 'http://[URL_SERVIDOR]/superset/dashboard/...';
  }
  
  // Validar formato
  if (inputServerURL.value && !validarFormatoURL(inputServerURL.value)) {
    inputServerURL.style.borderColor = '#dc3545';
    inputServerURL.title = 'Formato inválido. Use http://[IP_SERVIDOR]/superset/dashboard/...';
  } else {
    inputServerURL.style.borderColor = '#ced4da';
    inputServerURL.title = '';
  }
  
  salvarCredenciais();
});

// Salvar credenciais imediatamente ao digitar
function salvarCredenciais() {
  if (checkboxSalvarCredenciais && checkboxSalvarCredenciais.checked) {
    configuracao.usuario = inputUsuario.value;
    configuracao.senha = inputSenha.value;
    configuracao.server_url = inputServerURL.value;
    salvarConfiguracao();
  }
}

// Carregar configuração
function carregarConfiguracao() {
  chrome.storage.local.get(['configuracao'], (result) => {
    if (result.configuracao) {
      configuracao = result.configuracao;
      
      // Preencher formulário
      inputUsuario.value = configuracao.usuario || '';
      inputSenha.value = configuracao.senha || '';
      inputIntervalo.value = configuracao.intervalo_segundos || 30;
      inputServerURL.value = configuracao.server_url || '';
      
      // Marcar checkbox se tiver credenciais salvas
      if (configuracao.usuario && configuracao.senha && checkboxSalvarCredenciais) {
        checkboxSalvarCredenciais.checked = true;
      }
      
      // Atualizar lista de dashboards
      atualizarListaDashboards();
      
      // Atualizar exibição de dashboards atual/próximo
      atualizarExibicaoDashboards();
      
      // Atualizar placeholder do campo URL
      inputUrlDashboard.placeholder = `${configuracao.server_url}/superset/dashboard/...`;
    }
  });
}

// Verificar status da rotação
function verificarStatusRotacao() {
  try {
    chrome.runtime.sendMessage({ acao: 'getStatusRotacao' }, (resposta) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao verificar status da rotação:', chrome.runtime.lastError.message);
        return;
      }
      
      if (resposta && typeof resposta.emRotacao !== 'undefined') {
        emRotacao = resposta.emRotacao;
        atualizarStatus();
        
        // Se estiver em rotação, iniciar o contador
        if (emRotacao) {
          chrome.runtime.sendMessage({ acao: 'getTempoRestante' }, (resposta) => {
            if (chrome.runtime.lastError) {
              console.warn('Erro ao obter tempo restante:', chrome.runtime.lastError.message);
              return;
            }
            
            if (resposta && resposta.tempoRestante) {
              iniciarContadorRegressivo(resposta.tempoRestante);
            }
          });
          
          // Atualizar o índice atual
          chrome.runtime.sendMessage({ acao: 'getIndiceAtual' }, (resposta) => {
            if (chrome.runtime.lastError) {
              console.warn('Erro ao obter índice atual:', chrome.runtime.lastError.message);
              return;
            }
            
            if (resposta && resposta.indiceAtual !== undefined) {
              indiceAtual = resposta.indiceAtual;
              atualizarExibicaoDashboards();
            }
          });
        }
      }
    });
  } catch (erro) {
    console.error('Erro ao verificar status da rotação:', erro);
  }
}

// Salvar configuração
function salvarConfiguracao(callback) {
  try {
    chrome.runtime.sendMessage({ 
      acao: 'salvarConfiguracao', 
      configuracao 
    }, (resposta) => {
      if (chrome.runtime.lastError) {
        console.warn('Erro ao salvar configuração:', chrome.runtime.lastError.message);
        if (callback) callback();
        return;
      }
      
      if (resposta && resposta.sucesso && callback) {
        callback();
      }
    });
  } catch (erro) {
    console.error('Erro ao salvar configuração:', erro);
    if (callback) callback();
  }
}

// Contador regressivo
function iniciarContadorRegressivo(segundos) {
  pararContadorRegressivo();
  
  contadorTempo = segundos;
  atualizarExibicaoContador();
  
  idContadorInterval = setInterval(() => {
    contadorTempo--;
    if (contadorTempo < 0) {
      contadorTempo = configuracao.intervalo_segundos;
      // Atualizar o índice atual após o tempo acabar
      chrome.runtime.sendMessage({ acao: 'getIndiceAtual' }, (resposta) => {
        if (resposta && resposta.indiceAtual !== undefined) {
          indiceAtual = resposta.indiceAtual;
          atualizarExibicaoDashboards();
        }
      });
    }
    atualizarExibicaoContador();
  }, 1000);
}

// Parar contador
function pararContadorRegressivo() {
  if (idContadorInterval) {
    clearInterval(idContadorInterval);
    idContadorInterval = null;
  }
  contadorRegresso.textContent = '';
}

// Atualizar exibição do contador
function atualizarExibicaoContador() {
  if (emRotacao) {
    const minutos = Math.floor(contadorTempo / 60);
    const segundos = contadorTempo % 60;
    contadorRegresso.textContent = `Próximo em: ${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
  } else {
    contadorRegresso.textContent = '';
  }
}

// Atualizar lista visual de dashboards
function atualizarListaDashboards() {
  listaDashboards.innerHTML = '';
  
  if (!configuracao.dashboards || configuracao.dashboards.length === 0) {
    listaDashboards.innerHTML = '<div class="dashboard-item">Nenhum dashboard configurado</div>';
    return;
  }
  
  configuracao.dashboards.forEach((dashboard, indice) => {
    const item = document.createElement('div');
    item.className = 'dashboard-item';
    
    const info = document.createElement('div');
    info.className = 'dashboard-info';
    info.textContent = dashboard.nome + (dashboard.descricao ? ` (${dashboard.descricao})` : '');
    
    const btnRemover = document.createElement('button');
    btnRemover.textContent = 'Remover';
    btnRemover.onclick = () => {
      configuracao.dashboards.splice(indice, 1);
      atualizarListaDashboards();
      atualizarExibicaoDashboards();
    };
    
    item.appendChild(info);
    item.appendChild(btnRemover);
    listaDashboards.appendChild(item);
  });
}

// Atualizar indicadores de status
function atualizarStatus() {
  if (emRotacao) {
    statusRotacao.textContent = `Rotação: Ativa (a cada ${configuracao.intervalo_segundos}s)`;
    statusRotacao.classList.add('active');
  } else {
    statusRotacao.textContent = 'Rotação: Parada';
    statusRotacao.classList.remove('active');
    pararContadorRegressivo();
  }
}

// Atualizar a exibição dos dashboards atual e próximo
function atualizarExibicaoDashboards() {
  if (!configuracao.dashboards || configuracao.dashboards.length === 0) {
    dashboardAtual.textContent = 'Nenhum dashboard configurado';
    proximoDashboard.textContent = 'Nenhum dashboard configurado';
    return;
  }
  
  // Dashboard atual
  const dashAtual = configuracao.dashboards[indiceAtual];
  dashboardAtual.textContent = dashAtual ? dashAtual.nome : 'Desconhecido';
  
  // Próximo dashboard
  const proximoIndice = (indiceAtual + 1) % configuracao.dashboards.length;
  const dashProximo = configuracao.dashboards[proximoIndice];
  proximoDashboard.textContent = dashProximo ? dashProximo.nome : 'Desconhecido';
}

// Ao fechar o popup, envia o tempo restante para o background
window.addEventListener('beforeunload', () => {
  if (emRotacao && contadorTempo > 0) {
    chrome.runtime.sendMessage({ 
      acao: 'setTempoRestante', 
      tempoRestante: contadorTempo 
    });
  }
});

// Implementar funcionalidades de exportação e importação de configurações

// Botão de exportar configurações
const botaoExportar = document.getElementById('export-config');
botaoExportar.addEventListener('click', exportarConfiguracoes);

// Botão de importar configurações
const botaoImportar = document.getElementById('import-config');
const inputArquivo = document.getElementById('import-file');
botaoImportar.addEventListener('click', () => {
  // Acionar o seletor de arquivo
  inputArquivo.click();
});

// Processar o arquivo quando for selecionado
inputArquivo.addEventListener('change', importarConfiguracoes);

// Função para exportar configurações para um arquivo JSON
function exportarConfiguracoes() {
  // Verificar se há configurações para exportar
  if (!configuracao || !configuracao.dashboards || configuracao.dashboards.length === 0) {
    alert('Não há configurações para exportar. Adicione ao menos um dashboard.');
    return;
  }
  
  // Criar uma cópia da configuração para exportação
  // Opcionalmente, remover informações sensíveis como senhas
  const configExport = {
    ...configuracao,
    // Descomentar a linha abaixo se quiser remover a senha da exportação
    // senha: ""
  };
  
  // Converter para string JSON
  const jsonString = JSON.stringify(configExport, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Criar um link para download e acionar automaticamente
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dashboard_rotator_config.json';
  document.body.appendChild(a);
  a.click();
  
  // Limpar
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// Função para importar configurações de um arquivo JSON
function importarConfiguracoes(evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  
  const leitor = new FileReader();
  
  leitor.onload = (e) => {
    try {
      // Converter o JSON para objeto
      const configImportada = JSON.parse(e.target.result);
      
      // Validar a estrutura básica da configuração
      if (!configImportada || !Array.isArray(configImportada.dashboards)) {
        throw new Error('Formato inválido: o arquivo não contém uma configuração válida.');
      }
      
      // Preservar a senha atual se o arquivo importado não a tiver
      if (!configImportada.senha && configuracao.senha) {
        configImportada.senha = configuracao.senha;
      }
      
      // Atualizar a configuração
      configuracao = configImportada;
      
      // Atualizar a interface com a nova configuração
      inputUsuario.value = configuracao.usuario || '';
      inputSenha.value = configuracao.senha || '';
      inputIntervalo.value = configuracao.intervalo_segundos || 30;
      inputServerURL.value = configuracao.server_url || '';
      
      // Atualizar a lista de dashboards
      atualizarListaDashboards();
      
      // Salvar a configuração
      salvarConfiguracao(() => {
        alert('Configuração importada com sucesso!');
      });
      
    } catch (erro) {
      alert('Erro ao importar configuração: ' + erro.message);
      console.error('Erro ao importar configuração:', erro);
    }
  };
  
  leitor.readAsText(arquivo);
  
  // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
  evento.target.value = '';
}

// Botão para buscar dashboards da API
const botaoFetchDashboards = document.getElementById('fetch-dashboards');

botaoFetchDashboards.addEventListener('click', async () => {
  // Verificar se tem credenciais salvas
  if (!configuracao.usuario || !configuracao.senha) {
    alert('Preencha o usuário e senha para buscar dashboards da API');
    return;
  }
  
  // Validar formato da URL do servidor
  if (!validarFormatoURL(configuracao.server_url)) {
    alert('Configure uma URL válida do servidor Superset (ex: http://192.168.1.100:8080)');
    return;
  }
  
  try {
    botaoFetchDashboards.disabled = true;
    botaoFetchDashboards.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    
    // Obter token de acesso
    const token = await obterTokenAPI(configuracao.usuario, configuracao.senha);
    
    // Listar dashboards
    const dashboards = await listarDashboardsAPI(token);
    
    // Exibir na interface
    exibirDashboardsAPI(dashboards);
    
  } catch (erro) {
    alert('Erro ao buscar dashboards: ' + erro.message);
  } finally {
    botaoFetchDashboards.disabled = false;
    botaoFetchDashboards.innerHTML = '<i class="fas fa-sync"></i> Buscar Dashboards da API';
  }
});

// Função para exibir dashboards da API na interface
function exibirDashboardsAPI(dashboards) {
  if (!dashboards || dashboards.length === 0) {
    apiDashboardsList.innerHTML = '<div class="api-item">Nenhum dashboard encontrado</div>';
    apiDashboardsList.style.display = 'block';
    apiSearchContainer.style.display = 'none';
    addAllContainer.style.display = 'none';
    return;
  }
  
  // Ordenar dashboards por nome em ordem crescente
  dashboardsAPI = dashboards.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  dashboardsAPIFiltrados = [...dashboardsAPI];
  
  // Mostrar barra de pesquisa
  apiSearchContainer.style.display = 'block';
  
  // Mostrar botão de adicionar todos
  addAllContainer.style.display = 'block';
  
  // Limpar campo de pesquisa
  inputApiSearch.value = '';
  
  // Exibir dashboards
  renderizarDashboardsAPI();
}

// Função para renderizar dashboards da API
function renderizarDashboardsAPI() {
  apiDashboardsList.innerHTML = '';
  
  if (dashboardsAPIFiltrados.length === 0) {
    apiDashboardsList.innerHTML = '<div class="api-item">Nenhum dashboard encontrado</div>';
    return;
  }
  
  dashboardsAPIFiltrados.forEach(dashboard => {
    const item = document.createElement('div');
    item.className = 'api-dashboard-item';
    item.style.cssText = `
      padding: 10px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: white;
      margin-bottom: 2px;
      border-radius: 4px;
    `;
    
    const info = document.createElement('div');
    info.className = 'api-dashboard-info';
    info.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 10px;
    `;
    info.textContent = dashboard.nome + (dashboard.descricao ? ` (${dashboard.descricao})` : '');
    
    const btnAdicionar = document.createElement('button');
    btnAdicionar.innerHTML = '<i class="fas fa-plus"></i> Adicionar';
    btnAdicionar.style.cssText = `
      background-color: #17a2b8;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    `;
    
    btnAdicionar.onclick = () => {
      // Preencher os campos com as informações do dashboard
      inputNomeDashboard.value = dashboard.nome;
      inputUrlDashboard.value = dashboard.url;
      inputDescDashboard.value = dashboard.descricao;
      
      // Destacar o botão de adicionar dashboard
      botaoAddDashboard.style.animation = 'pulse 1s';
      setTimeout(() => {
        botaoAddDashboard.style.animation = '';
      }, 1000);
      
      // Opcional: scroll para o botão de adicionar
      botaoAddDashboard.scrollIntoView({ behavior: 'smooth' });
    };
    
    item.appendChild(info);
    item.appendChild(btnAdicionar);
    apiDashboardsList.appendChild(item);
  });
  
  // Mostrar a lista
  apiDashboardsList.style.display = 'block';
}

// Função para filtrar dashboards da API
function filtrarDashboardsAPI(termo) {
  if (!termo || termo.trim() === '') {
    dashboardsAPIFiltrados = [...dashboardsAPI];
  } else {
    const termoLower = termo.toLowerCase();
    dashboardsAPIFiltrados = dashboardsAPI.filter(dashboard => 
      dashboard.nome.toLowerCase().includes(termoLower) ||
      (dashboard.descricao && dashboard.descricao.toLowerCase().includes(termoLower))
    );
  }
  
  renderizarDashboardsAPI();
}

// Função para obter token de acesso da API do Superset
async function obterTokenAPI(usuario, senha) {
  try {
    const loginUrl = construirURL(configuracao.server_url, '/api/v1/security/login');
    
    const resposta = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: usuario,
        password: senha,
        provider: 'db'
      })
    });
    
    const dados = await resposta.json();
    if (dados.access_token) {
      return dados.access_token;
    } else {
      throw new Error('Falha ao obter token de acesso');
    }
  } catch (erro) {
    console.error('Erro na autenticação com a API:', erro);
    throw erro;
  }
}

// Função para listar dashboards via API
async function listarDashboardsAPI(token) {
  try {
    const dashboardUrl = construirURL(configuracao.server_url, '/api/v1/dashboard/');
    
    const resposta = await fetch(dashboardUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const dados = await resposta.json();
    if (dados.result) {
      return dados.result.map(dash => ({
        id: dash.id,
        nome: dash.dashboard_title,
        url: construirURL(configuracao.server_url, `/superset/dashboard/${dash.id}/?expand_filters=0`),
        descricao: dash.description || ''
      }));
    } else {
      throw new Error('Falha ao obter lista de dashboards');
    }
  } catch (erro) {
    console.error('Erro ao listar dashboards:', erro);
    throw erro;
  }
}

// Evento de pesquisa nos dashboards da API
inputApiSearch.addEventListener('input', (evento) => {
  filtrarDashboardsAPI(evento.target.value);
});

// Adicionar todos os dashboards da API
addAllButton.addEventListener('click', async () => {
  // Verificar se tem credenciais salvas
  if (!configuracao.usuario || !configuracao.senha) {
    alert('Preencha o usuário e senha para adicionar todos os dashboards da API');
    return;
  }
  
  // Validar formato da URL do servidor
  if (!validarFormatoURL(configuracao.server_url)) {
    alert('Configure uma URL válida do servidor Superset (ex: http://192.168.1.100:8080)');
    return;
  }
  
  try {
    addAllButton.disabled = true;
    addAllButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
    
    // Obter token de acesso
    const token = await obterTokenAPI(configuracao.usuario, configuracao.senha);
    
    // Listar dashboards
    const dashboards = await listarDashboardsAPI(token);
    
    // Adicionar dashboards à lista
    dashboards.forEach(dash => {
      configuracao.dashboards.push({
        nome: dash.nome,
        url: dash.url,
        descricao: dash.descricao
      });
    });
    
    // Atualizar lista visual
    atualizarListaDashboards();
    
    // Atualizar exibição de dashboards atual/próximo
    atualizarExibicaoDashboards();
    
  } catch (erro) {
    alert('Erro ao adicionar dashboards: ' + erro.message);
  } finally {
    addAllButton.disabled = false;
    addAllButton.innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar Todos os Dashboards da API';
  }
}); 