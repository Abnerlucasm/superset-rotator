# Guia de Solução de Problemas - Superset Dashboard Rotator

## Erro: "Could not establish connection. Receiving end does not exist."

Este erro indica que há um problema de comunicação entre os scripts da extensão. Aqui estão as soluções:

### Causas Comuns

1. **Content Script não carregado**: O script de conteúdo pode não ter sido injetado corretamente
2. **Background Script não disponível**: O service worker pode ter sido descarregado
3. **Timing de comunicação**: Tentativa de comunicação antes dos scripts estarem prontos
4. **Permissões insuficientes**: Falta de permissões para acessar determinadas páginas

### Soluções Implementadas

#### 1. Tratamento de Erro Robusto
- Adicionado `try-catch` em todos os listeners de mensagens
- Verificação de `chrome.runtime.lastError` em todas as comunicações
- Funções seguras para envio de mensagens

#### 2. Verificação de Disponibilidade
- Função `verificarTabPronta()` para verificar se a tab está pronta
- Função `enviarMensagemSegura()` para envio seguro de mensagens
- Sistema de ping/pong para verificar conectividade

#### 3. Inicialização Melhorada
- Verificação de disponibilidade antes de enviar mensagens
- Retry automático em caso de falha
- Logs detalhados para debug

## Erro: "TypeError: Cannot read properties of undefined (reading 'forEach')"

Este erro ocorre quando o resultado de `chrome.tabs.query()` é `undefined` ou não é um array.

### Solução Implementada

```javascript
chrome.tabs.query({url: urlPattern}, (tabs) => {
  if (chrome.runtime.lastError) {
    console.warn('Erro ao buscar tabs:', chrome.runtime.lastError.message);
    return;
  }
  
  if (tabs && Array.isArray(tabs)) {
    tabs.forEach(tab => {
      // Processar tab
    });
  } else {
    console.log('Nenhuma tab encontrada ou resultado inválido');
  }
});
```

## Erro: "Invalid url pattern 'http://http://192.168.1.14:8080/superset/dashboard/*'"

Este erro ocorre quando a URL do servidor já contém o protocolo `http://` e o código adiciona outro `http://`.

### Solução Implementada

Função `construirURL()` que verifica se a URL já tem protocolo:

```javascript
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
```

### Como Usar

#### Verificar se a Extensão está Funcionando

1. **Abrir o Console do Navegador** (F12)
2. **Verificar logs da extensão**:
   ```
   Extensão Superset Dashboard Rotator instalada
   Configuração carregada da storage
   ```

3. **Testar comunicação**:
   - Abrir o popup da extensão
   - Verificar se não há erros no console
   - Tentar fazer login ou iniciar rotação

#### Se o Erro Persistir

1. **Recarregar a Extensão**:
   - Ir para `chrome://extensions/`
   - Clicar no botão de recarregar na extensão

2. **Verificar Permissões**:
   - Confirmar que a extensão tem permissão para acessar o site
   - Verificar se o site está na lista de permissões

3. **Limpar Cache**:
   - Limpar dados da extensão
   - Reconfigurar as credenciais

4. **Verificar URLs**:
   - Confirmar que a URL do servidor está correta
   - Verificar se o servidor está acessível

### Debug Avançado

#### Logs Úteis

```javascript
// No console do navegador, verificar:
chrome.runtime.getManifest() // Deve retornar o manifest
chrome.storage.local.get(['configuracao']) // Deve retornar configuração
```

#### Teste de Comunicação

```javascript
// Testar comunicação com background script
chrome.runtime.sendMessage({ acao: 'ping' }, (resposta) => {
  console.log('Resposta:', resposta);
});
```

### Prevenção

1. **Sempre usar tratamento de erro** em comunicações
2. **Verificar disponibilidade** antes de enviar mensagens
3. **Implementar retry logic** para operações críticas
4. **Manter logs detalhados** para debug
5. **Usar função construirURL()** para URLs seguras
6. **Verificar arrays antes de usar forEach**

### Arquivos Modificados

- `background.js`: Adicionado tratamento de erro e funções seguras
- `popup.js`: Implementado tratamento de erro em todas as comunicações
- `content-dashboard.js`: Adicionado try-catch nos listeners

### Versão Mínima

Esta solução requer Chrome 88+ ou navegador compatível com Manifest V3. 