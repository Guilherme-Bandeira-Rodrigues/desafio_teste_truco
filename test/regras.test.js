const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Partida, forca, resultadoMao } = require("../src/truco");
const carta = (valor, naipe) => ({ valor, naipe });
test("manilhas seguem ordem de naipes e sucedem a vira", () => {
  const vira = carta("7", "paus");
  const forcas = ["ouros", "espadas", "copas", "paus"].map((n) =>
    forca(carta("Q", n), vira),
  );
  assert.deepEqual(
    forcas,
    [...forcas].sort((a, b) => a - b),
  );
  assert.equal(new Set(forcas).size, 4);
  assert.ok(forcas[0] > forca(carta("3", "ouros"), vira));
});
test("mão empatada três vezes não pontua", () => {
  assert.deepEqual(resultadoMao([null, null, null]), {
    finalizada: true,
    vencedor: null,
  });
});
test("a sequência completa de apostas não permite aumento além de doze", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao();
  p.pedir(0);
  p.responder(1, "aumentar");
  p.responder(0, "aumentar");
  p.responder(1, "aumentar");
  assert.deepEqual(p.pendente, { time: 1, valor: 12 });
  assert.throws(() => p.responder(0, "aumentar"));
  p.responder(0, "correr");
  assert.deepEqual(p.placar, [0, 9]);
});
test("não permite dupla responder ao próprio pedido ou jogar fora do turno", () => {
  const p = new Partida({ dealer: 3 });
  p.novaMao();
  assert.throws(() => p.jogar(1, p.maos[1][0]));
  p.pedir(0);
  assert.throws(() => p.responder(2, "aceitar"));
  p.responder(1, "aceitar");
  assert.equal(p.valor, 3);
  assert.throws(() => p.pedir(0));
});
test("mão de onze recusada atribui um ponto ao adversário", () => {
  const p = new Partida({ placar: [11, 4] });
  p.novaMao();
  assert.throws(() => p.decidir(1, false));
  p.decidir(0, false);
  assert.deepEqual(p.placar, [11, 5]);
  assert.equal(p.maoFinalizada, true);
});
