# Superset Dashboard Rotator v1.4

Extensão para Chrome que automatiza o login e a rotação entre dashboards do Apache Superset.

## Novas Funcionalidades v1.4

- ✅ **Permitir URLs de qualquer origem** - Opção para usar a extensão em qualquer site, não apenas Superset
- ✅ **Suporte a arquivos HTML locais** - Funciona com arquivos file:// da própria máquina
- ✅ **Configuração flexível** - Salva a preferência no JSON de configuração
- ✅ **Validação inteligente** - Adapta a validação de URL baseada na configuração do usuário

## Funcionalidades v1.1

- ✅ **Popup flutuante** aparece apenas em URLs de dashboard específicas (`/superset/dashboard/id/?expand_filters=0`)
- ✅ **Botão "Adicionar Todos"** para incluir todos os dashboards da API de uma vez
- ✅ **Versão da extensão** exibida no popup
- ✅ **Sistema de verificação de atualizações** automática

## Funcionalidades Principais

- Login automático no Superset
- Rotação automática entre dashboards
- Configuração de URL do servidor
- Busca de dashboards via API
- Popup flutuante com controles
- Exportar/Importar configurações
- **Modo flexível**: Funciona em qualquer site (HTTP/HTTPS) ou arquivo HTML local (file://) quando ativado

## Atualizações Automáticas

A extensão verifica automaticamente se há novas versões disponíveis via GitHub. Para configurar:

1. Hospede o código no GitHub
2. Crie um arquivo `version.json` com informações da versão
3. Configure a URL no código da extensão

## Instalação e Uso

1. Carregue a extensão no Chrome (Modo desenvolvedor)
2. Configure URL do servidor e credenciais
3. Adicione dashboards manualmente ou via API
4. Inicie a rotação automática

## Configuração

### 1. Configuração do Servidor

- **URL do Servidor**: Configure a URL completa do seu servidor Superset (ex: `http://192.168.1.100:8080`)
- **Credenciais**: Digite seu usuário e senha do Superset
- **Salvar Credenciais**: Marque para salvar automaticamente as credenciais

### 2. Configuração dos Dashboards

- **Adição Manual**: Digite nome, URL e descrição do dashboard
- **Busca Automática**: Use o botão "Buscar Dashboards da API" para listar dashboards disponíveis
- **Validação**: As URLs devem corresponder ao IP do servidor configurado
- **Modo Flexível**: Marque "Permitir URLs de qualquer origem" para usar URLs de qualquer site ou arquivos HTML locais

### 3. Configuração da Rotação

- **Intervalo**: Defina o tempo em segundos entre as trocas de dashboard
- **Controles**: Use os botões Iniciar/Parar e Anterior/Próximo

## Modo Flexível - URLs de Qualquer Origem

A partir da versão 1.4, a extensão suporta funcionar em qualquer site (HTTP/HTTPS) ou arquivo HTML local (file://), não apenas no Superset.

### Como Ativar

1. Abra a extensão
2. Na seção "Gerenciar Dashboards", marque o checkbox "Permitir URLs de qualquer origem"
3. A configuração é salva automaticamente no JSON

### Como Funciona

- **Checkbox desmarcado (padrão)**: Funciona apenas em URLs do Superset
- **Checkbox marcado**: Funciona em qualquer site (HTTP/HTTPS) ou arquivo HTML local (file://)

### Exemplo de Configuração JSON

```json
{
  "usuario": "admin",
  "senha": "password123",
  "server_url": "http://192.168.1.100:8080",
  "intervalo_segundos": 30,
  "dashboards": [
    {
      "nome": "Google",
      "url": "https://google.com",
      "descricao": "Site do Google"
    },
    {
      "nome": "Dashboard Local",
      "url": "file:///C:/caminho/para/dashboard.html",
      "descricao": "Arquivo HTML local"
    }
  ],
  "permitirQualquerUrl": true
}
```

### Vantagens

- ✅ Rotação entre sites diferentes (HTTP/HTTPS)
- ✅ Suporte a arquivos HTML locais (file://)
- ✅ Monitoramento de múltiplas aplicações
- ✅ Flexibilidade total de URLs
- ✅ Configuração salva automaticamente

### Exemplo de Uso com Arquivos Locais

1. **Crie um arquivo HTML local** (ex: `dashboard.html`)
2. **Abra o arquivo no navegador** para obter a URL file://
3. **Configure na extensão**:
   - Nome: "Meu Dashboard Local"
   - URL: `file:///C:/caminho/para/dashboard.html`
   - Descrição: "Dashboard HTML local"
4. **Ative o modo flexível** marcando o checkbox
5. **Inicie a rotação** normalmente

**Arquivo de exemplo incluído**: `exemplo-arquivo-local.html`

## Estrutura de Arquivos

- `manifest.json`: Configuração da extensão
- `popup.html`: Interface do usuário
- `popup.js`: Lógica da interface
- `background.js`: Script de fundo para rotação
- `content-login.js`: Script para login automático
- `content-dashboard.js`: Script para dashboards
- `exemplo-arquivo-local.html`: Arquivo HTML de exemplo para testar funcionalidade local

## Compatibilidade

- **Chrome**: Versão 88+
- **Superset**: Versões compatíveis com API v1
- **Rede**: Acesso HTTP ao servidor Superset

## Notas Técnicas

- A extensão suporta múltiplos IPs de servidor
- As configurações são salvas localmente no Chrome
- O login é feito via script de conteúdo injetado
- A rotação usa alarms do Chrome para precisão temporal
- **Nova funcionalidade**: A propriedade `permitirQualquerUrl` é salva no JSON de configuração
- **Compatibilidade**: Configurações existentes são preservadas e migradas automaticamente

## Suporte

Para problemas ou sugestões, abra uma issue no repositório.
