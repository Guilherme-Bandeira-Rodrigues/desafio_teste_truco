"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  VALORES,
  NAIPES,
  baralho,
  forca,
  resultadoRodada,
  resultadoMao,
  Partida,
} = require("../src/truco");
const valores = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"],
  naipes = ["ouros", "espadas", "copas", "paus"];
const c = (valor, naipe) => ({ valor, naipe });
function rng(s) {
  return () => ((s = (s * 48271) % 2147483647) - 1) / 2147483646;
}
function distribuicao() {
  return {
    vira: c("7", "ouros"),
    maos: [
      [c("3", "ouros"), c("2", "ouros"), c("A", "ouros")],
      [c("A", "copas"), c("K", "copas"), c("J", "copas")],
      [c("6", "ouros"), c("5", "ouros"), c("4", "ouros")],
      [c("4", "copas"), c("7", "copas"), c("6", "copas")],
    ],
  };
}
function estado(p) {
  return JSON.stringify({
    dealer: p.dealer,
    placar: p.placar,
    vez: p.vez,
    maos: p.maos,
    vira: p.vira,
    mesa: p.mesa,
    rodadas: p.rodadas,
    valor: p.valor,
    pendente: p.pendente,
    maoFinalizada: p.maoFinalizada,
    vencedor: p.vencedor,
  });
}
test("contrato: 40 cartas únicas e ordem dos valores e naipes", () => {
  assert.deepEqual(VALORES, valores);
  assert.deepEqual(NAIPES, naipes);
  const deck = baralho();
  assert.equal(deck.length, 40);
  assert.equal(new Set(deck.map((x) => x.valor + ":" + x.naipe)).size, 40);
  for (const valor of valores)
    for (const naipe of naipes)
      assert.equal(
        deck.filter((x) => x.valor === valor && x.naipe === naipe).length,
        1,
      );
});
for (let i = 0; i < valores.length; i++)
  test(`vira ${valores[i]}: próxima carta é manilha e naipes obedecem ordem`, () => {
    const vira = c(valores[i], "ouros"),
      manilha = valores[(i + 1) % 10];
    const forcas = naipes.map((n) => forca(c(manilha, n), vira));
    assert.ok(forcas.every((v, k) => k === 0 || v > forcas[k - 1]));
    for (const valor of valores.filter((v) => v !== manilha))
      for (const n of naipes) assert.ok(forca(c(valor, n), vira) < forcas[0]);
  });
test("cartas comuns têm ordem 4,5,6,7,Q,J,K,A,2,3 e naipe não desempata", () => {
  const vira = c("3", "ouros"),
    comuns = valores.filter((v) => v !== "4");
  const forcas = comuns.map((v) => forca(c(v, "ouros"), vira));
  assert.ok(forcas.every((v, i) => i === 0 || v > forcas[i - 1]));
  for (const valor of comuns)
    assert.equal(new Set(naipes.map((n) => forca(c(valor, n), vira))).size, 1);
});
for (const [nome, carta, vira] of [
  ["valor inválido", c("8", "paus"), c("3", "paus")],
  ["naipe inválido", c("3", "coringa"), c("3", "paus")],
  ["vira ausente", c("3", "paus"), null],
  ["carta ausente", null, c("3", "paus")],
])
  test(`força rejeita ${nome}`, () => assert.throws(() => forca(carta, vira)));
test("vencedor de rodada é dono da carta mais forte; empates entre duplas anulam a rodada", () => {
  const vira = c("7", "ouros"),
    j = [
      { jogador: 0, carta: c("3", "ouros") },
      { jogador: 1, carta: c("2", "ouros") },
      { jogador: 2, carta: c("A", "ouros") },
      { jogador: 3, carta: c("K", "ouros") },
    ];
  assert.deepEqual(resultadoRodada(j, vira), { time: 0, jogador: 0 });
  j[1].carta = c("3", "copas");
  assert.deepEqual(resultadoRodada(j, vira), { time: null, jogador: null });
  j[1].carta = c("2", "copas");
  j[2].carta = c("3", "espadas");
  assert.deepEqual(resultadoRodada(j, vira), { time: 0, jogador: 0 });
});
test("rodada exige quatro jogadores distintos de 0 a 3", () => {
  const vira = c("4", "paus"),
    base = Array.from({ length: 4 }, (_, jogador) => ({
      jogador,
      carta: c("3", naipes[jogador]),
    }));
  assert.throws(() => resultadoRodada(base.slice(0, 3), vira));
  for (const numero of [-1, 4, 1.5, "1", null]) {
    const j = base.map((x) => ({ ...x }));
    j[3].jogador = numero;
    assert.throws(() => resultadoRodada(j, vira));
  }
  const repetida = base.map((x) => ({ ...x }));
  repetida[3].jogador = 0;
  assert.throws(() => resultadoRodada(repetida, vira));
  const cartaDuplicada = base.map((x) => ({ ...x }));
  cartaDuplicada[3].carta = cartaDuplicada[0].carta;
  assert.throws(() => resultadoRodada(cartaDuplicada, vira));
});
for (const entrada of [
  null,
  {},
  [0, 1, 0, 1],
  [0, 2],
  [0, undefined],
  ["0"],
  Array(1),
])
  test(`resultado de mão inválido: ${JSON.stringify(entrada)}`, () =>
    assert.throws(() => resultadoMao(entrada)));
for (const valor of [-1, 1, NaN, Infinity, "0", null])
  test(`distribuição rejeita saída inválida de rng: ${String(valor)}`, () => {
    const p = new Partida({ rng: () => valor });
    assert.throws(() => p.novaMao());
    assert.equal(p.maoFinalizada, true);
  });
for (const [rodadas, finalizada, vencedor] of [
  [[], false, null],
  [[0], false, null],
  [[1], false, null],
  [[null], false, null],
  [[0, 1], false, null],
  [[1, 0], false, null],
  [[null, null], false, null],
  [[0, 0], true, 0],
  [[1, 1], true, 1],
  [[null, 0], true, 0],
  [[null, 1], true, 1],
  [[0, null], true, 0],
  [[1, null], true, 1],
  [[0, 1, 0], true, 0],
  [[0, 1, 1], true, 1],
  [[1, 0, 0], true, 0],
  [[1, 0, 1], true, 1],
  [[0, 1, null], true, 0],
  [[1, 0, null], true, 1],
  [[null, null, 0], true, 0],
  [[null, null, 1], true, 1],
  [[null, null, null], true, null],
])
  test(`resultado da mão ${JSON.stringify(rodadas)}`, () =>
    assert.deepEqual(resultadoMao(rodadas), { finalizada, vencedor }));
for (const dealer of [0, 1, 2, 3])
  test(`dealer ${dealer}: abre jogador seguinte e são distribuídas 13 cartas distintas`, () => {
    const p = new Partida({ dealer, rng: rng(17) });
    p.novaMao();
    assert.equal(p.vez, (dealer + 1) % 4);
    assert.deepEqual(
      p.maos.map((m) => m.length),
      [3, 3, 3, 3],
    );
    const cartas = [...p.maos.flat(), p.vira];
    assert.equal(new Set(cartas.map((x) => x.valor + ":" + x.naipe)).size, 13);
    assert.equal(p.valor, 1);
    assert.equal(p.maoFinalizada, false);
    assert.deepEqual(p.rodadas, []);
    assert.deepEqual(p.mesa, []);
  });
test("distribuição fixa é copiada e jogadores não podem usar carta de outra mão", () => {
  const d = distribuicao(),
    p = new Partida({ dealer: 3 });
  p.novaMao(d);
  d.maos[0][0].valor = "4";
  assert.deepEqual(p.maos[0][0], c("3", "ouros"));
  const antes = estado(p);
  assert.throws(() => p.jogar(0, c("A", "copas")));
  assert.equal(estado(p), antes);
});
test("quatro jogadas concluem uma rodada; duas vitórias da dupla encerram a mão", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao(distribuicao());
  p.jogar(0, c("3", "ouros"));
  p.jogar(1, c("A", "copas"));
  p.jogar(2, c("6", "ouros"));
  p.jogar(3, c("4", "copas"));
  assert.deepEqual(p.rodadas, [0]);
  assert.equal(p.vez, 0);
  assert.deepEqual(p.mesa, []);
  p.jogar(0, c("2", "ouros"));
  p.jogar(1, c("K", "copas"));
  p.jogar(2, c("5", "ouros"));
  p.jogar(3, c("7", "copas"));
  assert.deepEqual(p.rodadas, [0, 0]);
  assert.deepEqual(p.placar, [1, 0]);
  assert.equal(p.maoFinalizada, true);
  assert.throws(() => p.jogar(0, c("A", "ouros")));
});
test("três rodadas empatadas mantêm o mesmo primeiro jogador e ninguém pontua", () => {
  const p = new Partida({ dealer: 3 }),
    d = {
      vira: c("Q", "ouros"),
      maos: [
        [c("3", "ouros"), c("2", "ouros"), c("A", "ouros")],
        [c("3", "copas"), c("2", "copas"), c("A", "copas")],
        [c("4", "ouros"), c("5", "ouros"), c("6", "ouros")],
        [c("4", "copas"), c("5", "copas"), c("6", "copas")],
      ],
    };
  p.novaMao(d);
  for (let rodada = 0; rodada < 3; rodada++) {
    for (let jogador = 0; jogador < 4; jogador++)
      p.jogar(jogador, d.maos[jogador][rodada]);
    assert.equal(p.vez, 0);
  }
  assert.deepEqual(p.rodadas, [null, null, null]);
  assert.deepEqual(p.placar, [0, 0]);
  assert.equal(p.maoFinalizada, true);
});
test("vitória do jogador 1 em uma rodada faz dele o próximo a abrir", () => {
  const d = distribuicao();
  [d.maos[0][0], d.maos[1][0]] = [d.maos[1][0], d.maos[0][0]];
  const p = new Partida({ dealer: 3 });
  p.novaMao(d);
  for (let j = 0; j < 4; j++) p.jogar(j, d.maos[j][0]);
  assert.equal(p.vez, 1);
  assert.deepEqual(p.rodadas, [1]);
  assert.deepEqual(p.mesa, []);
});
test("aposta aceita permite aumento apenas da dupla adversária na vez dela", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao(distribuicao());
  p.pedir(0);
  p.responder(1, "aceitar");
  assert.throws(() => p.pedir(0));
  p.jogar(0, c("3", "ouros"));
  p.pedir(1);
  assert.deepEqual(p.pendente, { time: 1, valor: 6 });
  p.responder(0, "aceitar");
  assert.equal(p.valor, 6);
});
test("mão de onze aceita vale três pontos para quem vencer", () => {
  const p = new Partida({ dealer: 3, placar: [11, 4] });
  p.novaMao(distribuicao());
  p.decidir(0, true);
  for (let k = 0; k < 2; k++)
    for (let j = 0; j < 4; j++) p.jogar(j, distribuicao().maos[j][k]);
  assert.deepEqual(p.placar, [14, 4]);
  assert.equal(p.vencedor, 0);
  assert.equal(p.maoFinalizada, true);
});
test("não inicia outra mão antes de encerrar a atual e dealer roda na próxima", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao(distribuicao());
  assert.throws(() => p.novaMao());
  p.pedir(0);
  p.responder(1, "correr");
  p.novaMao();
  assert.equal(p.dealer, 0);
  assert.equal(p.vez, 1);
});
for (const [acao, placar, valor] of [
  ["aceitar", [0, 0], 3],
  ["correr", [1, 0], 1],
])
  test(`resposta ${acao} ao truco`, () => {
    const p = new Partida({ dealer: 3 });
    p.novaMao();
    p.pedir(0);
    p.responder(1, acao);
    assert.deepEqual(p.placar, placar);
    assert.equal(p.valor, valor);
    assert.equal(p.pendente, null);
    assert.equal(p.maoFinalizada, acao === "correr");
    if (acao === "aceitar") assert.equal(p.vez, 0);
  });
for (const [aumentos, pontos] of [
  [0, 1],
  [1, 3],
  [2, 6],
  [3, 9],
])
  test(`correr após ${aumentos} aumento(s) entrega ${pontos} pontos ao pedinte`, () => {
    const p = new Partida({ dealer: 3 });
    p.novaMao();
    p.pedir(0);
    for (let i = 0; i < aumentos; i++)
      p.responder(i % 2 === 0 ? 1 : 0, "aumentar");
    const pedinte = p.pendente.time;
    p.responder(1 - pedinte, "correr");
    assert.equal(p.placar[pedinte], pontos);
    assert.equal(p.placar[1 - pedinte], 0);
    assert.equal(p.maoFinalizada, true);
  });
test("ações inválidas durante aposta pendente não alteram estado", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao();
  p.pedir(0);
  const antes = estado(p);
  for (const f of [
    () => p.pedir(0),
    () => p.jogar(0, p.maos[0][0]),
    () => p.responder(0, "aceitar"),
    () => p.responder(2, "correr"),
    () => p.responder(1, "talvez"),
    () => p.responder(4, "aceitar"),
  ]) {
    assert.throws(f);
    assert.equal(estado(p), antes);
  }
});
for (const [placar, time] of [
  [[11, 4], 0],
  [[4, 11], 1],
])
  test(`mão de onze da dupla ${time}: decisão, proibição de truco e corrida`, () => {
    const p = new Partida({ placar });
    p.novaMao();
    assert.deepEqual(p.maoDeOnze, { time, decidida: false });
    assert.throws(() => p.jogar(p.vez, p.maos[p.vez][0]));
    assert.throws(() => p.decidir(1 - time, true));
    p.decidir(time, true);
    assert.equal(p.valor, 3);
    assert.throws(() => p.pedir(p.vez));
    assert.throws(() => p.decidir(time, true));
  });
test("mão de ferro vale um, não tem decisão ou truco", () => {
  const p = new Partida({ placar: [11, 11] });
  p.novaMao();
  assert.equal(p.maoDeFerro, true);
  assert.equal(p.maoDeOnze, null);
  assert.equal(p.valor, 1);
  assert.throws(() => p.pedir(p.vez));
  assert.throws(() => p.decidir(0, true));
});
test("partida encerra aos 12 pontos e não aceita nova mão", () => {
  const p = new Partida({ dealer: 3, placar: [11, 0] });
  p.novaMao();
  p.decidir(0, false);
  // A dupla 1 recebe um ponto; em seguida um caso controlado termina para a dupla 0.
  const q = new Partida({ dealer: 3, placar: [10, 0] });
  q.novaMao();
  q.pedir(0);
  q.responder(1, "aumentar");
  q.responder(0, "aumentar");
  q.responder(1, "correr");
  assert.equal(q.vencedor, 0);
  assert.equal(q.placar[0] >= 12, true);
  assert.throws(() => q.novaMao());
});
test("partidas completas terminam para várias sequências reproduzíveis", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const p = new Partida({ rng: rng(seed) });
    let maos = 0;
    while (p.vencedor === null && maos++ < 500) {
      p.novaMao();
      if (p.maoDeOnze) p.decidir(p.maoDeOnze.time, true);
      while (!p.maoFinalizada) p.jogar(p.vez, p.maos[p.vez][0]);
    }
    assert.ok([0, 1].includes(p.vencedor), `semente ${seed}`);
    assert.ok(p.placar[p.vencedor] >= 12);
  }
});
