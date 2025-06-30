/**
 * Utilitário de Armazenamento para Extensão Superset
 * Gerencia todos os dados da extensão usando chrome.storage API
 * 
 * Baseado na documentação oficial: https://developer.chrome.com/docs/extensions/reference/api/storage
 */

class StorageUtils {
  constructor() {
    this.VERSION_ATUAL = '1.0.0';
    this.CHAVE_CONFIGURACAO = 'superset_configuracao';
    this.CHAVE_PREFERENCIAS = 'superset_preferencias';
    this.CHAVE_ESTADO = 'superset_estado';
    this.CHAVE_HISTORICO = 'superset_historico';
    this.CHAVE_VERSION = 'superset_version';
  }

  /**
   * Salvar dados na área de armazenamento local
   * @param {string} chave - Chave para armazenar os dados
   * @param {any} dados - Dados a serem salvos
   * @param {string} area - Área de armazenamento ('local', 'sync', 'session')
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async salvar(chave, dados, area = 'local') {
    try {
      const storageArea = chrome.storage[area];
      if (!storageArea) {
        throw new Error(`Área de armazenamento '${area}' não disponível`);
      }

      const dadosParaSalvar = {
        [chave]: {
          dados: dados,
          timestamp: Date.now(),
          versao: this.VERSION_ATUAL
        }
      };

      await storageArea.set(dadosParaSalvar);
      console.log(`Dados salvos com sucesso na área ${area}:`, chave);
      
      // Disparar evento de mudança
      this.dispararEventoMudanca(chave, dados, area);
      
      return true;
    } catch (erro) {
      console.error(`Erro ao salvar dados na área ${area}:`, erro);
      return false;
    }
  }

  /**
   * Carregar dados da área de armazenamento
   * @param {string} chave - Chave dos dados
   * @param {string} area - Área de armazenamento ('local', 'sync', 'session')
   * @param {any} valorPadrao - Valor padrão se não encontrar dados
   * @returns {Promise<any>} - Dados carregados
   */
  async carregar(chave, area = 'local', valorPadrao = null) {
    try {
      const storageArea = chrome.storage[area];
      if (!storageArea) {
        throw new Error(`Área de armazenamento '${area}' não disponível`);
      }

      const resultado = await storageArea.get(chave);
      const dadosArmazenados = resultado[chave];

      if (!dadosArmazenados) {
        console.log(`Nenhum dado encontrado para a chave: ${chave}`);
        return valorPadrao;
      }

      // Verificar se precisa migrar dados de versão anterior
      if (dadosArmazenados.versao !== this.VERSION_ATUAL) {
        console.log(`Migrando dados da versão ${dadosArmazenados.versao} para ${this.VERSION_ATUAL}`);
        const dadosMigrados = await this.migrarDados(dadosArmazenados, dadosArmazenados.versao);
        await this.salvar(chave, dadosMigrados, area);
        return dadosMigrados;
      }

      console.log(`Dados carregados com sucesso da área ${area}:`, chave);
      return dadosArmazenados.dados;
    } catch (erro) {
      console.error(`Erro ao carregar dados da área ${area}:`, erro);
      return valorPadrao;
    }
  }

  /**
   * Remover dados da área de armazenamento
   * @param {string} chave - Chave dos dados
   * @param {string} area - Área de armazenamento ('local', 'sync', 'session')
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async remover(chave, area = 'local') {
    try {
      const storageArea = chrome.storage[area];
      if (!storageArea) {
        throw new Error(`Área de armazenamento '${area}' não disponível`);
      }

      await storageArea.remove(chave);
      console.log(`Dados removidos com sucesso da área ${area}:`, chave);
      
      // Disparar evento de mudança
      this.dispararEventoMudanca(chave, null, area);
      
      return true;
    } catch (erro) {
      console.error(`Erro ao remover dados da área ${area}:`, erro);
      return false;
    }
  }

  /**
   * Limpar todos os dados da área de armazenamento
   * @param {string} area - Área de armazenamento ('local', 'sync', 'session')
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async limpar(area = 'local') {
    try {
      const storageArea = chrome.storage[area];
      if (!storageArea) {
        throw new Error(`Área de armazenamento '${area}' não disponível`);
      }

      await storageArea.clear();
      console.log(`Área ${area} limpa com sucesso`);
      
      // Disparar evento de mudança
      this.dispararEventoMudanca('*', null, area);
      
      return true;
    } catch (erro) {
      console.error(`Erro ao limpar área ${area}:`, erro);
      return false;
    }
  }

  /**
   * Obter informações sobre o uso do armazenamento
   * @param {string} area - Área de armazenamento ('local', 'sync', 'session')
   * @returns {Promise<object>} - Informações de uso
   */
  async obterInfoUso(area = 'local') {
    try {
      const storageArea = chrome.storage[area];
      if (!storageArea) {
        throw new Error(`Área de armazenamento '${area}' não disponível`);
      }

      const dados = await storageArea.get(null);
      const tamanhoTotal = JSON.stringify(dados).length;
      
      return {
        area: area,
        tamanhoBytes: tamanhoTotal,
        tamanhoKB: (tamanhoTotal / 1024).toFixed(2),
        tamanhoMB: (tamanhoTotal / (1024 * 1024)).toFixed(4),
        numeroItens: Object.keys(dados).length,
        limiteBytes: storageArea.QUOTA_BYTES || 'ilimitado',
        percentualUso: storageArea.QUOTA_BYTES ? 
          ((tamanhoTotal / storageArea.QUOTA_BYTES) * 100).toFixed(2) : 'N/A'
      };
    } catch (erro) {
      console.error(`Erro ao obter informações de uso da área ${area}:`, erro);
      return null;
    }
  }

  /**
   * Migrar dados de versão anterior para a versão atual
   * @param {object} dadosAntigos - Dados da versão anterior
   * @param {string} versaoAntiga - Versão anterior dos dados
   * @returns {Promise<any>} - Dados migrados
   */
  async migrarDados(dadosAntigos, versaoAntiga) {
    try {
      console.log(`Iniciando migração de dados da versão ${versaoAntiga} para ${this.VERSION_ATUAL}`);
      
      let dadosMigrados = dadosAntigos.dados;

      // Migrações específicas por versão
      if (versaoAntiga === '0.9.0') {
        dadosMigrados = await this.migrarV090ParaV100(dadosMigrados);
      } else if (versaoAntiga === '0.8.0') {
        dadosMigrados = await this.migrarV080ParaV100(dadosMigrados);
      }

      console.log('Migração concluída com sucesso');
      return dadosMigrados;
    } catch (erro) {
      console.error('Erro durante migração de dados:', erro);
      return dadosAntigos.dados; // Retornar dados originais em caso de erro
    }
  }

  /**
   * Migração da versão 0.9.0 para 1.0.0
   */
  async migrarV090ParaV100(dados) {
    // Implementar migrações específicas se necessário
    return dados;
  }

  /**
   * Migração da versão 0.8.0 para 1.0.0
   */
  async migrarV080ParaV100(dados) {
    // Implementar migrações específicas se necessário
    return dados;
  }

  /**
   * Salvar configuração completa da extensão
   * @param {object} configuracao - Configuração a ser salva
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async salvarConfiguracao(configuracao) {
    return await this.salvar(this.CHAVE_CONFIGURACAO, configuracao, 'local');
  }

  /**
   * Carregar configuração da extensão
   * @returns {Promise<object>} - Configuração carregada
   */
  async carregarConfiguracao() {
    const configPadrao = {
      usuario: '',
      senha: '',
      server_url: '',
      intervalo_segundos: 30,
      dashboards: [],
      auto_login: false,
      fullscreen: false
    };
    
    return await this.carregar(this.CHAVE_CONFIGURACAO, 'local', configPadrao);
  }

  /**
   * Salvar preferências do usuário
   * @param {object} preferencias - Preferências a serem salvas
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async salvarPreferencias(preferencias) {
    return await this.salvar(this.CHAVE_PREFERENCIAS, preferencias, 'local');
  }

  /**
   * Carregar preferências do usuário
   * @returns {Promise<object>} - Preferências carregadas
   */
  async carregarPreferencias() {
    const preferenciasPadrao = {
      tema: 'claro',
      idioma: 'pt-BR',
      notificacoes: true,
      auto_salvar: true,
      debounce_tempo: 1000
    };
    
    return await this.carregar(this.CHAVE_PREFERENCIAS, 'local', preferenciasPadrao);
  }

  /**
   * Salvar estado atual da extensão
   * @param {object} estado - Estado a ser salvo
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async salvarEstado(estado) {
    return await this.salvar(this.CHAVE_ESTADO, estado, 'local');
  }

  /**
   * Carregar estado atual da extensão
   * @returns {Promise<object>} - Estado carregado
   */
  async carregarEstado() {
    const estadoPadrao = {
      em_rotacao: false,
      indice_atual: 0,
      tempo_restante: 30,
      ultima_atualizacao: Date.now(),
      sessao_valida: false
    };
    
    return await this.carregar(this.CHAVE_ESTADO, 'local', estadoPadrao);
  }

  /**
   * Salvar histórico de atividades
   * @param {object} historico - Histórico a ser salvo
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async salvarHistorico(historico) {
    return await this.salvar(this.CHAVE_HISTORICO, historico, 'local');
  }

  /**
   * Carregar histórico de atividades
   * @returns {Promise<object>} - Histórico carregado
   */
  async carregarHistorico() {
    const historicoPadrao = {
      logins: [],
      dashboards_acessados: [],
      erros: [],
      ultima_limpeza: Date.now()
    };
    
    return await this.carregar(this.CHAVE_HISTORICO, 'local', historicoPadrao);
  }

  /**
   * Adicionar entrada ao histórico
   * @param {string} tipo - Tipo de entrada ('login', 'dashboard', 'erro')
   * @param {object} dados - Dados da entrada
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async adicionarAoHistorico(tipo, dados) {
    try {
      const historico = await this.carregarHistorico();
      
      const entrada = {
        tipo: tipo,
        dados: dados,
        timestamp: Date.now()
      };

      switch (tipo) {
        case 'login':
          historico.logins.unshift(entrada);
          // Manter apenas os últimos 50 logins
          historico.logins = historico.logins.slice(0, 50);
          break;
        case 'dashboard':
          historico.dashboards_acessados.unshift(entrada);
          // Manter apenas os últimos 100 acessos
          historico.dashboards_acessados = historico.dashboards_acessados.slice(0, 100);
          break;
        case 'erro':
          historico.erros.unshift(entrada);
          // Manter apenas os últimos 20 erros
          historico.erros = historico.erros.slice(0, 20);
          break;
      }

      return await this.salvarHistorico(historico);
    } catch (erro) {
      console.error('Erro ao adicionar ao histórico:', erro);
      return false;
    }
  }

  /**
   * Limpar histórico antigo (mais de 30 dias)
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async limparHistoricoAntigo() {
    try {
      const historico = await this.carregarHistorico();
      const trintaDiasAtras = Date.now() - (30 * 24 * 60 * 60 * 1000);

      historico.logins = historico.logins.filter(entrada => entrada.timestamp > trintaDiasAtras);
      historico.dashboards_acessados = historico.dashboards_acessados.filter(entrada => entrada.timestamp > trintaDiasAtras);
      historico.erros = historico.erros.filter(entrada => entrada.timestamp > trintaDiasAtras);

      historico.ultima_limpeza = Date.now();
      
      return await this.salvarHistorico(historico);
    } catch (erro) {
      console.error('Erro ao limpar histórico antigo:', erro);
      return false;
    }
  }

  /**
   * Fazer backup de todos os dados
   * @returns {Promise<object>} - Dados de backup
   */
  async fazerBackup() {
    try {
      const backup = {
        timestamp: Date.now(),
        versao: this.VERSION_ATUAL,
        configuracao: await this.carregarConfiguracao(),
        preferencias: await this.carregarPreferencias(),
        estado: await this.carregarEstado(),
        historico: await this.carregarHistorico()
      };

      console.log('Backup criado com sucesso');
      return backup;
    } catch (erro) {
      console.error('Erro ao criar backup:', erro);
      return null;
    }
  }

  /**
   * Restaurar dados de backup
   * @param {object} backup - Dados de backup
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async restaurarBackup(backup) {
    try {
      if (!backup || !backup.timestamp) {
        throw new Error('Backup inválido');
      }

      const resultados = await Promise.all([
        this.salvarConfiguracao(backup.configuracao || {}),
        this.salvarPreferencias(backup.preferencias || {}),
        this.salvarEstado(backup.estado || {}),
        this.salvarHistorico(backup.historico || {})
      ]);

      const sucesso = resultados.every(resultado => resultado === true);
      
      if (sucesso) {
        console.log('Backup restaurado com sucesso');
      } else {
        console.error('Alguns dados não puderam ser restaurados');
      }

      return sucesso;
    } catch (erro) {
      console.error('Erro ao restaurar backup:', erro);
      return false;
    }
  }

  /**
   * Disparar evento de mudança personalizado
   * @param {string} chave - Chave que mudou
   * @param {any} novoValor - Novo valor
   * @param {string} area - Área de armazenamento
   */
  dispararEventoMudanca(chave, novoValor, area) {
    try {
      // Verificar se estamos em um contexto que suporta eventos DOM
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const evento = new CustomEvent('storageChanged', {
          detail: {
            chave: chave,
            novoValor: novoValor,
            area: area,
            timestamp: Date.now()
          }
        });
        
        window.dispatchEvent(evento);
      } else {
        // Em service workers, usar postMessage para comunicar mudanças
        if (typeof self !== 'undefined' && self.clients) {
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                tipo: 'storageChanged',
                chave: chave,
                novoValor: novoValor,
                area: area,
                timestamp: Date.now()
              });
            });
          });
        }
      }
    } catch (erro) {
      console.error('Erro ao disparar evento de mudança:', erro);
    }
  }

  /**
   * Verificar se a API de armazenamento está disponível
   * @returns {boolean} - Disponibilidade da API
   */
  verificarDisponibilidade() {
    return !!(chrome && chrome.storage && chrome.storage.local);
  }

  /**
   * Obter estatísticas de armazenamento
   * @returns {Promise<object>} - Estatísticas completas
   */
  async obterEstatisticas() {
    try {
      const [infoLocal, infoSync, infoSession] = await Promise.all([
        this.obterInfoUso('local'),
        this.obterInfoUso('sync'),
        this.obterInfoUso('session')
      ]);

      return {
        local: infoLocal,
        sync: infoSync,
        session: infoSession,
        timestamp: Date.now()
      };
    } catch (erro) {
      console.error('Erro ao obter estatísticas:', erro);
      return null;
    }
  }
}

// Criar instância global automaticamente
const storageUtils = new StorageUtils();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = storageUtils;
} else if (typeof window !== 'undefined') {
  window.storageUtils = storageUtils;
}

// Para service workers (background script)
if (typeof self !== 'undefined') {
  self.storageUtils = storageUtils;
} 