# 🎨 Guia de Integração com Figma para Design

## 📋 Sobre Integração de Design

Este guia explica como usar **Figma** (e outras ferramentas) para criar designs das tabelas de classificação e integrá-los ao código React.

---

## 🎯 Por Que Usar Figma?

### Vantagens:
- ✅ **Design Visual**: Ver o resultado antes de codificar
- ✅ **Colaboração**: Trabalhar com designers em tempo real
- ✅ **Prototipagem**: Testar diferentes layouts rapidamente
- ✅ **Exportação**: Plugins podem exportar código CSS/React
- ✅ **Consistência**: Manter design system unificado

### Limitações:
- ⚠️ Exportação automática não é perfeita (requer ajustes manuais)
- ⚠️ Alguns estilos precisam ser implementados manualmente
- ⚠️ Animações e interações precisam ser codificadas

---

## 🔧 Opção 1: Figma para Design + Implementação Manual

### Passo 1: Criar Design no Figma

1. **Criar novo arquivo** no Figma
2. **Designar tabela de classificação**:
   - Fotos dos pilotos: **85px × 85px** (ou maior)
   - Altura das linhas: **100px+** (para acomodar fotos maiores)
   - Espaçamento adequado entre elementos
   - Cores e gradientes do tema
   - Tipografia consistente

3. **Criar componentes reutilizáveis**:
   - Componente "Driver Row" (linha do piloto)
   - Componente "Driver Photo" (foto do piloto)
   - Componente "Team Badge" (badge da equipe)

### Passo 2: Exportar Especificações

1. **Selecionar elementos** no Figma
2. **Ver propriedades CSS** no painel direito:
   - Cores (hex, rgba)
   - Tamanhos (width, height, padding, margin)
   - Tipografia (font-size, font-weight, line-height)
   - Bordas (border-radius, border-width)
   - Sombras (box-shadow)

3. **Copiar valores** e aplicar no CSS

### Passo 3: Implementar no Código

```css
/* Exemplo baseado no design do Figma */
.driver-photo-small {
  width: 85px;        /* Do Figma */
  height: 85px;      /* Do Figma */
  border-radius: 16px; /* Do Figma */
  border: 2px solid rgba(255,255,255,0.25); /* Do Figma */
  box-shadow: 0 4px 12px rgba(0,0,0,0.4); /* Do Figma */
}
```

---

## 🔌 Opção 2: Plugins do Figma para Exportação

### Plugin: "Figma to React"

1. **Instalar plugin**:
   - No Figma: Plugins → Browse all plugins
   - Buscar: "Figma to React" ou "html.to.design"

2. **Selecionar componentes** no Figma
3. **Executar plugin**: Plugins → Figma to React
4. **Copiar código gerado**
5. **Ajustar manualmente** (o código gerado precisa de refinamento)

### Plugin: "Figma to CSS"

1. **Instalar**: "Figma to CSS" ou "CSS Gen"
2. **Selecionar frame** com o design
3. **Exportar CSS**
4. **Integrar ao projeto**

### Plugin: "Anima"

1. **Instalar**: "Anima" (converte Figma para código React/Vue)
2. **Configurar projeto**
3. **Exportar componentes**
4. **Importar no projeto**

**⚠️ Nota**: Código gerado por plugins geralmente precisa de ajustes manuais.

---

## 📐 Opção 3: Design System no Figma

### Criar Design System

1. **Criar arquivo "Design System"** no Figma
2. **Definir tokens de design**:
   - Cores (variáveis CSS)
   - Tipografia (fontes, tamanhos)
   - Espaçamento (padding, margin, gap)
   - Componentes (botões, cards, tabelas)

3. **Usar no design das tabelas**
4. **Exportar tokens** para CSS variables

### Exemplo de Tokens:

```css
:root {
  /* Cores do Design System */
  --f1-redbull: #1E41FF;
  --f1-ferrari: #DC143C;
  --f1-mercedes: #00D2BE;
  
  /* Espaçamento */
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 20px;
  --spacing-lg: 30px;
  
  /* Tipografia */
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.3rem;
  --font-size-xl: 2.2rem;
}
```

---

## 🎨 Workflow Recomendado

### 1. Design no Figma
```
Figma
├── Criar design da tabela
├── Definir tamanhos (fotos 85px+)
├── Aplicar cores e estilos
└── Exportar especificações
```

### 2. Implementação
```
Código
├── Copiar valores do Figma
├── Aplicar no CSS
├── Ajustar responsividade
└── Testar no navegador
```

### 3. Iteração
```
Loop
├── Ajustar no Figma
├── Atualizar código
└── Testar novamente
```

---

## 🛠️ Ferramentas Alternativas

### Google Material Design
- **Material Design 3**: https://m3.material.io
- Componentes prontos para tabelas
- Código disponível

### Tailwind CSS + Figma
- **Plugin**: "Figma to Tailwind"
- Exporta classes Tailwind diretamente
- Integração fácil

### Storybook + Figma
- **Plugin**: "Figma to Storybook"
- Cria componentes React automaticamente
- Documentação automática

---

## 📝 Checklist de Integração

### Design no Figma
- [ ] Tabela de classificação desenhada
- [ ] Fotos com tamanho adequado (85px+)
- [ ] Cores e estilos definidos
- [ ] Componentes reutilizáveis criados
- [ ] Design responsivo (mobile/desktop)

### Exportação
- [ ] Especificações CSS copiadas
- [ ] Valores de cores exportados
- [ ] Tamanhos e espaçamentos anotados
- [ ] Tipografia definida

### Implementação
- [ ] CSS atualizado com valores do Figma
- [ ] Componentes React ajustados
- [ ] Responsividade testada
- [ ] Animações implementadas (se houver)

---

## 💡 Dicas Práticas

### 1. Usar Variáveis CSS
```css
/* Em vez de valores fixos */
.driver-photo-small {
  width: var(--photo-size, 85px);
  height: var(--photo-size, 85px);
}
```

### 2. Manter Consistência
- Usar mesmas cores do Figma
- Seguir espaçamento do design system
- Manter tipografia consistente

### 3. Testar Responsividade
- Verificar mobile no Figma
- Ajustar breakpoints no CSS
- Testar em diferentes tamanhos de tela

### 4. Documentar Mudanças
- Anotar alterações do design
- Manter histórico de versões
- Comunicar mudanças à equipe

---

## 🚀 Próximos Passos

### Para Começar:
1. ✅ Criar design no Figma
2. ✅ Exportar especificações
3. ✅ Aplicar no código
4. ✅ Testar e ajustar

### Para Evoluir:
1. ✅ Criar design system completo
2. ✅ Automatizar exportação (plugins)
3. ✅ Integrar com Storybook
4. ✅ Documentar componentes

---

## 📚 Recursos Úteis

- **Figma**: https://figma.com
- **Figma to React Plugin**: Buscar no marketplace do Figma
- **Material Design**: https://m3.material.io
- **Tailwind CSS**: https://tailwindcss.com
- **Storybook**: https://storybook.js.org

---

**Nota sobre "Stitch do Google"**: Não encontrei uma ferramenta oficial chamada "Stitch" do Google. Se você está se referindo a outra ferramenta, por favor me informe e posso ajudar com a integração específica.

**Alternativas do Google**:
- **Google Material Design**: Sistema de design do Google
- **Google Web Designer**: Ferramenta de design web (descontinuada)
- **Google Sites**: Criação de sites (não para design de componentes)

---

**Data**: Dezembro 2025  
**Versão**: 1.0






