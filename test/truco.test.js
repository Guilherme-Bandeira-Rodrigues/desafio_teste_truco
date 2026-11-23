const { test } = require("node:test");
const a = require("node:assert/strict");
const {
  baralho,
  forca,
  resultadoRodada,
  resultadoMao,
  Partida,
} = require("../src/truco");
const c = (valor, naipe) => ({ valor, naipe });
test("baralho e ordem cíclica das manilhas", () => {
  a.equal(baralho().length, 40);
  const vira = c("3", "ouros");
  a.ok(forca(c("4", "paus"), vira) > forca(c("4", "copas"), vira));
  a.ok(forca(c("4", "ouros"), vira) > forca(c("3", "paus"), vira));
  a.equal(forca(c("2", "paus"), vira), forca(c("2", "ouros"), vira));
});
test("empate entre adversários e parceiros", () => {
  const vira = c("4", "ouros"),
    j = [
      { jogador: 0, carta: c("3", "paus") },
      { jogador: 1, carta: c("3", "copas") },
      { jogador: 2, carta: c("4", "paus") },
      { jogador: 3, carta: c("6", "paus") },
    ];
  a.equal(resultadoRodada(j, vira).time, null);
  j[1].carta = c("2", "copas");
  j[2].carta = c("3", "ouros");
  a.deepEqual(resultadoRodada(j, vira), { time: 0, jogador: 0 });
});
test("resultado da mão cobre empates e terceira rodada", () => {
  for (const [r, w] of [
    [[null, 0], 0],
    [[1, null], 1],
    [[0, 1, null], 0],
    [[null, null, null], null],
    [[0, 1, 1], 1],
  ])
    a.deepEqual(resultadoMao(r), { finalizada: true, vencedor: w });
  a.equal(resultadoMao([0, 1]).finalizada, false);
});
test("apostas e corrida preservam valor anterior", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao();
  p.pedir(0);
  a.throws(() => p.jogar(0, p.maos[0][0]));
  p.responder(1, "aumentar");
  a.equal(p.valor, 3);
  p.responder(0, "correr");
  a.deepEqual(p.placar, [0, 3]);
});
test("mão de onze e de ferro restringem apostas", () => {
  const p = new Partida({ placar: [11, 4] });
  p.novaMao();
  a.throws(() => p.jogar(p.vez, p.maos[p.vez][0]));
  p.decidir(0, true);
  a.equal(p.valor, 3);
  a.throws(() => p.pedir(p.vez));
  const f = new Partida({ placar: [11, 11] });
  f.novaMao();
  a.equal(f.maoDeFerro, true);
  a.throws(() => f.pedir(f.vez));
});
test("simulação de partida completa", () => {
  const p = new Partida();
  let n = 0;
  while (p.vencedor === null && n++ < 500) {
    p.novaMao();
    if (p.maoDeOnze) p.decidir(p.maoDeOnze.time, true);
    while (!p.maoFinalizada) p.jogar(p.vez, p.maos[p.vez][0]);
  }
  a.ok([0, 1].includes(p.vencedor));
  a.ok(p.placar[p.vencedor] >= 12);
});
test("distribuição inválida não muda o dealer e não inicia mão", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao();
  p.pedir(p.vez);
  p.responder((p.vez + 1) % 4, "correr");
  a.throws(() => p.novaMao({ maos: [] }));
  a.equal(p.dealer, 3);
  a.equal(p.maoFinalizada, true);
  p.novaMao();
  a.equal(p.dealer, 0);
});
