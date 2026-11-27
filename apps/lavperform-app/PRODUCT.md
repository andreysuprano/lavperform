# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Donos e gestores de lavanderias (redes e unidades, self-service e convencionais) no Brasil. Usam o CRM no desktop durante a operação e no celular ao longo do dia, para acompanhar vendas, entender a base de clientes e disparar campanhas de fidelização e reconquista. (Inferido do código e do README; não foi entrevistado.)

## Product Purpose
LavPerform é o CRM white-label de fidelização e recorrência para lavanderias. Reúne dashboard operacional, base de clientes com segmentação RFV, campanhas recorrentes por WhatsApp, tráfego pago, redes sociais, integrações com sistemas de lavanderia (VmLav, Cicclo, Maxlav, L2) e carteira de créditos.

## Capabilities and Constraints
- Frontend React + Vite + Chakra UI v3 (`apps/lavperform-app`); tema por white-label (`seld` usa primária #7bc9f1).
- Dashboard "Início": saudação, Resumo do dia (Vendas do dia, Ciclos do dia, Clientes ativos, Reconquista), Segmentação RFV, atalhos, ranking "Quem mais gasta / Quem mais compra", tabela "Compras do dia".
- Menu: Dashboard, Tráfego, Fidelização e Recorrência, Clientes, Canais de Comunicação, Integrações, Redes Sociais, Ajustes, Minha Página, Academy.
- Interface em português do Brasil.

## Brand Commitments
Manter a cor azul da marca (#7bc9f1), o logo LavPerform (foguete dentro de uma gota) e os textos atuais da interface. (Confirmado pelo usuário em 2026-11-25.)

## Evidence on Hand
Logos em `public/seld/`. Não há dados reais de clientes nem métricas de negócio no repositório; qualquer número em propostas visuais é demonstrativo.

## Product Principles
- Clareza operacional primeiro: o dono precisa ler o dia em segundos.
- Frescor e limpeza como linguagem de marca, sem perder densidade de CRM.
- Funciona em white-label: a cor primária muda, a estrutura permanece.

## Accessibility & Inclusion
Contraste mínimo AA; o azul de marca claro não serve como cor de texto sobre fundo claro.
