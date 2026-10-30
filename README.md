# QA_AUTO — Mockup da Plataforma QA Autônomo

Protótipo navegável de uma plataforma de automação de testes de software guiada por IA, com 16 telas interativas e dados fictícios.

**Acesse o mockup:** https://bis-jr.github.io/QA_AUTO/

## Telas

| Área | Telas |
|---|---|
| Base | Login · Onboarding (4 passos) · Dashboard central |
| Conectar | Fontes de dados e projetos · Configurações da organização |
| Operar | 01 Test Case Genesis · 02 API Contract Self-healing · 03 Natural Language Assertions · 04 Mutation Testing · 05 Test Debt Scoring · 06 Regulatory Compliance · 07 Performance Prediction · 08 Visual Regression · 09 Chaos Engineering · 10 Cross-browser/Device Matrix |
| Analisar | Relatórios |

No menu lateral, pare o cursor sobre uma funcionalidade (01 a 10) ou clique com o botão direito para ver a descrição dela.

## Estrutura

```
index.html          → redireciona para Login.dc.html
*.dc.html           → uma tela por arquivo (template + lógica)
dc-lite.js          → runtime que renderiza as telas com React 18
assets/             → logos (Fast Innovation AI, QA Autonomous)
```

Cada tela tem um template dentro de `<x-dc>` (com `{{ campo }}`, `<sc-for>` e `<sc-if>`) e uma classe `Component extends DCLogic` em `<script type="text/x-dc">`, cujo `renderVals()` fornece os dados e as ações da tela.

## Rodar localmente

As telas precisam ser servidas por HTTP (abrir o arquivo direto no navegador não funciona):

```bash
python -m http.server 8000
# abra http://localhost:8000
```

## Observações

- Todos os dados são fictícios; nenhuma tela depende de backend.
- O estado (aprovações, filtros etc.) é mantido em memória e é reiniciado ao trocar de tela.
