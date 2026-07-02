const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('database.sqlite');

const cursosData = {
  "6º Ano": [
    "AVENTURA NO MUNDO DIGITAL",
    "CLUBE DE LEITURA-(RÊ)FABULANDO",
    "MÚSICA",
    "PENSAMENTO COMPUTACIONAL",
    "XADREZ"
  ],
  "7º Ano": [
    "CLUBE DE LEITURA DE FÃ A AUTOR",
    "MÚSICA ELETROACÚSTICA",
    "PENSAMENTO COMPUTACIONAL",
    "SÉRIES E NARRATIVAS CRIANDO MULTIVERSOS",
    "XADREZ"
  ],
  "8º Ano": [
    "CLUBE DE ASTRONOMIA",
    "CLUBE DE LEITURA TRILHAS PARA O DEBATE",
    "EMPREENDEDORISMO",
    "OFICINA DE FOTOGRAFIA E MEMÓRIA",
    "PENSAMENTO COMPUTACIONAL"
  ],
  "9º Ano": [
    "CLUBE DE LEITURA OFICINA DE CINEMA",
    "INVESTIGAÇÃO CIENTÍFICA PANC",
    "MATEMÁTICA NA LENTE",
    "O QUE VOCÊ VAI SER QUANDO CRESCER?",
    "PROJETO SOCIOAMBIENTAL"
  ],
  "1ª Série": [
    "CIÊNCIAS DA NATUREZA APROFUNDAMENTOS",
    "CIÊNCIAS HUMANAS APROFUNDAMENTOS",
    "LINGUAGENS APROFUNDAMENTOS",
    "MATEMÁTICA APROFUNDAMENTOS",
    "TECH HUB"
  ],
  "2ª Série": [
    "CIÊNCIAS DA NATUREZA APROFUNDAMENTOS",
    "CIÊNCIAS HUMANAS APROFUNDAMENTOS",
    "LINGUAGENS APROFUNDAMENTOS",
    "MATEMÁTICA APROFUNDAMENTOS"
  ],
  "3ª Série": [
    "CIÊNCIAS DA NATUREZA APROFUNDAMENTOS",
    "CIÊNCIAS HUMANAS APROFUNDAMENTOS",
    "LINGUAGENS APROFUNDAMENTOS",
    "MATEMÁTICA APROFUNDAMENTOS"
  ]
};

const stmtInsert = db.prepare(`
  INSERT INTO cursos (id, nome, categoria, turmaId, serie, vagas, status, vagasOcupadas) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtCheck = db.prepare(`SELECT count(*) as c FROM cursos WHERE nome = ? AND serie = ?`);

let adicionados = 0;
let ignorados = 0;

for (const [serie, nomes] of Object.entries(cursosData)) {
  let categoria = 'EFAF';
  if (serie.includes('Série')) {
    categoria = 'EM';
  }

  for (const nome of nomes) {
    const limpo = nome.trim();
    // Verifica se ja existe
    const exists = stmtCheck.get(limpo, serie).c > 0;
    
    if (!exists) {
      stmtInsert.run(
        crypto.randomUUID(),
        limpo,
        categoria,
        "", // turmaId
        serie,
        30, // vagas default
        "ativo",
        0
      );
      adicionados++;
    } else {
      ignorados++;
    }
  }
}

console.log(`Adicionados: ${adicionados}`);
console.log(`Já existiam (ignorados): ${ignorados}`);
