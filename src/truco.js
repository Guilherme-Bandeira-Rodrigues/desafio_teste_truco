"use strict";
const VALORES = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"],
  NAIPES = ["ouros", "espadas", "copas", "paus"];
function cartaValida(c) {
  return c && VALORES.includes(c.valor) && NAIPES.includes(c.naipe);
}
function baralho() {
  return VALORES.flatMap((valor) => NAIPES.map((naipe) => ({ valor, naipe })));
}
function forca(c, vira) {
  if (!cartaValida(c) || !cartaValida(vira)) throw new Error("Carta inválida");
  const i = VALORES.indexOf(c.valor),
    manilha = VALORES[(VALORES.indexOf(vira.valor) + 1) % 10];
  return c.valor === manilha ? 10 + NAIPES.indexOf(c.naipe) : i;
}
function resultadoRodada(jogadas, vira) {
  if (!Array.isArray(jogadas) || jogadas.length !== 4)
    throw new Error("Rodada incompleta");
  if (
    Array.from(jogadas).some(
      (x) =>
        !x || !Number.isInteger(x.jogador) || x.jogador < 0 || x.jogador > 3,
    ) ||
    new Set(jogadas.map((x) => x.jogador)).size !== 4 ||
    jogadas.some((x) => !cartaValida(x.carta)) ||
    new Set(jogadas.map((x) => x.carta.valor + ":" + x.carta.naipe)).size !== 4
  )
    throw new Error("Jogadores inválidos ou repetidos");
  const maior = Math.max(...jogadas.map((x) => forca(x.carta, vira))),
    melhores = jogadas.filter((x) => forca(x.carta, vira) === maior);
  return new Set(melhores.map((x) => x.jogador % 2)).size > 1
    ? { time: null, jogador: null }
    : { time: melhores[0].jogador % 2, jogador: melhores[0].jogador };
}
function resultadoMao(r) {
  if (
    !Array.isArray(r) ||
    r.length > 3 ||
    Array.from(r).some((v) => v !== null && v !== 0 && v !== 1)
  )
    throw new Error("Resultados inválidos");
  if (r.length < 2) return { finalizada: false, vencedor: null };
  if (r.length === 2) {
    if (
      (r[0] === null && r[1] === null) ||
      (r[0] !== null && r[1] !== null && r[0] !== r[1])
    )
      return { finalizada: false, vencedor: null };
    return { finalizada: true, vencedor: r[0] ?? r[1] };
  }
  const cont = [0, 1].map((t) => r.filter((x) => x === t).length);
  return {
    finalizada: true,
    vencedor:
      cont[0] >= 2 ? 0 : cont[1] >= 2 ? 1 : (r.find((x) => x !== null) ?? null),
  };
}
class Partida {
  constructor({ dealer = 0, placar = [0, 0], rng = Math.random } = {}) {
    if (
      !Number.isInteger(dealer) ||
      dealer < 0 ||
      dealer > 3 ||
      !Array.isArray(placar) ||
      placar.length !== 2 ||
      placar.some((x) => !Number.isInteger(x) || x < 0 || x >= 12)
    )
      throw new Error("Configuração inválida");
    this.dealer = dealer;
    this.placar = [...placar];
    this.rng = rng;
    this.vencedor = null;
    this.maoFinalizada = true;
    this._primeira = true;
  }
  novaMao(distribuicao) {
    if (this.vencedor !== null || !this.maoFinalizada)
      throw new Error("Não é possível iniciar mão");
    let cartas;
    if (distribuicao) {
      if (
        !Array.isArray(distribuicao.maos) ||
        distribuicao.maos.length !== 4 ||
        distribuicao.maos.some((m) => !Array.isArray(m) || m.length !== 3)
      )
        throw new Error("Distribuição inválida");
      cartas = [...distribuicao.maos.flat(), distribuicao.vira];
    } else {
      cartas = baralho();
      for (let i = cartas.length - 1; i > 0; i--) {
        const x = this.rng();
        if (typeof x !== "number" || !(x >= 0 && x < 1))
          throw new Error("rng inválido");
        const j = Math.floor(x * (i + 1));
        [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
      }
      distribuicao = {
        maos: Array.from({ length: 4 }, (_, i) =>
          cartas.slice(i * 3, i * 3 + 3),
        ),
        vira: cartas[12],
      };
      cartas = cartas.slice(0, 13);
    }
    if (
      cartas.some((c) => !cartaValida(c)) ||
      new Set(cartas.map((c) => c.valor + ":" + c.naipe)).size !== 13
    )
      throw new Error("Cartas inválidas ou duplicadas");
    if (!this._primeira) this.dealer = (this.dealer + 1) % 4;
    this._primeira = false;
    this.maos = distribuicao.maos.map((m) => m.map((c) => ({ ...c })));
    this.vira = { ...distribuicao.vira };
    this.vez = (this.dealer + 1) % 4;
    this.mesa = [];
    this.rodadas = [];
    this.valor = 1;
    this.pendente = null;
    this.ultimoPedido = null;
    this.maoFinalizada = false;
    this.maoDeFerro = this.placar.every((x) => x === 11);
    const onze = this.placar.indexOf(11);
    this.maoDeOnze =
      !this.maoDeFerro && onze >= 0 ? { time: onze, decidida: false } : null;
  }
  terminar(time) {
    this.maoFinalizada = true;
    this.pendente = null;
    if (time !== null) {
      this.placar[time] += this.valor;
      if (this.placar[time] >= 12) this.vencedor = time;
    }
  }
  decidir(time, jogar) {
    if (
      !this.maoDeOnze ||
      this.maoDeOnze.decidida ||
      time !== this.maoDeOnze.time ||
      typeof jogar !== "boolean"
    )
      throw new Error("Decisão inválida");
    this.maoDeOnze.decidida = true;
    if (jogar) this.valor = 3;
    else this.terminar(1 - time);
  }
  jogar(j, c) {
    if (
      this.maoFinalizada ||
      this.pendente ||
      (this.maoDeOnze && !this.maoDeOnze.decidida) ||
      j !== this.vez
    )
      throw new Error("Jogada inválida");
    const i = this.maos[j].findIndex(
      (x) => x.valor === c?.valor && x.naipe === c?.naipe,
    );
    if (i < 0) throw new Error("Carta ausente");
    this.mesa.push({ jogador: j, carta: this.maos[j].splice(i, 1)[0] });
    if (this.mesa.length < 4) {
      this.vez = (j + 1) % 4;
      return;
    }
    const resultado = resultadoRodada(this.mesa, this.vira);
    this.rodadas.push(resultado.time);
    this.vez = resultado.jogador ?? this.mesa[0].jogador;
    this.mesa = [];
    const fim = resultadoMao(this.rodadas);
    if (fim.finalizada) this.terminar(fim.vencedor);
  }
  pedir(j) {
    if (
      this.maoFinalizada ||
      this.pendente ||
      this.maoDeOnze ||
      this.maoDeFerro ||
      this.vez !== j ||
      this.ultimoPedido === j % 2
    )
      throw new Error("Pedido inválido");
    const valor = { 1: 3, 3: 6, 6: 9, 9: 12 }[this.valor];
    if (!valor) throw new Error("Aposta máxima");
    this.pendente = { time: j % 2, valor };
    this.ultimoPedido = j % 2;
  }
  responder(j, acao) {
    if (
      !Number.isInteger(j) ||
      j < 0 ||
      j > 3 ||
      !this.pendente ||
      j % 2 === this.pendente.time ||
      !["aceitar", "correr", "aumentar"].includes(acao)
    )
      throw new Error("Resposta inválida");
    if (acao === "correr") {
      this.terminar(this.pendente.time);
      return;
    }
    const proximo = { 3: 6, 6: 9, 9: 12 }[this.pendente.valor];
    if (acao === "aumentar" && !proximo) throw new Error("Aposta máxima");
    this.valor = this.pendente.valor;
    if (acao === "aceitar") this.pendente = null;
    else {
      this.pendente = { time: j % 2, valor: proximo };
      this.ultimoPedido = j % 2;
    }
  }
}
module.exports = {
  VALORES,
  NAIPES,
  baralho,
  forca,
  resultadoRodada,
  resultadoMao,
  Partida,
};
