# Testes de Software — Truco paulista

## Especificação

Motor e testes de truco paulista para **duas duplas** (jogadores 0 e 2 contra 1 e 3), conforme o desafio. Na variante adotada usam-se 40 cartas; a manilha é o valor seguinte ao da vira, ciclicamente, e suas forças crescem em ouros, espadas, copas e paus. A mão tem até três rodadas e a partida termina quando uma dupla alcança 12 pontos.

As apostas seguem 1 → 3 → 6 → 9 → 12; quem corre entrega ao adversário o valor anterior ao pedido. Com 11 pontos, a dupla decide jogar a mão por 3 ou correr por 1; em 11 × 11 a mão vale 1. Nesses dois casos não há pedido de truco.

## Executar os testes

Requer Node.js 20 ou superior; sem dependências externas.

```sh
npm test
```

Os testes em JavaScript usam `node:test` e `node:assert/strict`. Cobrem baralho, manilhas, empate entre parceiros e adversários, resultado das rodadas e mãos, apostas, corrida, mão de onze, mão de ferro, distribuição inválida e simulação de partida completa. Uma asserção falha identifica o caso e produz retorno diferente de zero.

## Usar o motor

```js
const { Partida } = require('./src/truco');
const jogo = new Partida();
jogo.novaMao();
jogo.jogar(jogo.vez, jogo.maos[jogo.vez][0]);
console.log(jogo.mesa, jogo.vez);
```

`novaMao()` distribui cartas; `jogar(jogador, carta)` avança a rodada; `pedir(jogador)` e `responder(jogador, 'aceitar' | 'correr' | 'aumentar')` controlam apostas. Em mão de onze, chame `decidir(time, booleano)` antes de jogar. O construtor aceita placar, dealer e função aleatória; `novaMao` também aceita distribuição fixa com quatro mãos de três cartas e vira. Cartas usam `{ valor, naipe }`.

## Contrato e organização dos testes

A força das cartas comuns cresce em `4 5 6 7 Q J K A 2 3`; somente manilhas usam naipe para desempate. O jogador seguinte ao dealer abre, e a vez circula por quatro jogadores. Quem ganha uma rodada abre a seguinte; no empate abre quem iniciou. Se a primeira rodada empata, a primeira vitória posterior decide. Se a primeira é vencida e alguma rodada seguinte empata, vence quem ganhou a primeira. Três empates não pontuam, inclusive em mão de ferro.

O pedido de truco só pode partir de quem está na vez, e a mesma dupla não pode pedir duas vezes seguidas. Uma aposta pendente impede novas jogadas; qualquer integrante adversário pode aceitá-la, correr ou aumentar. As funções `resultadoRodada` e `resultadoMao` recebem respectivamente quatro jogadas de jogadores distintos com cartas distintas, e uma sequência de até três resultados (0, 1 ou `null`); rejeitam entradas inválidas.

Os testes em `test/` cobrem todas as viras, ordem das manilhas, tabelas de empates, distribuição, rodadas e partidas completas, sequência de apostas, mão de onze, mão de ferro e ações inválidas. A fonte aleatória injetável deve devolver números em `[0, 1)`.

## Colaborador

Guilherme-Bandeira-Rodrigues
