// @ts-ignore
import Database from "better-sqlite3"

const DB_PATH = process.env.DB_PATH || "./erp.db"

let db: Database.Database | null = null

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma("journal_mode = WAL")
    migrate(db)
  }
  return db
}

function migrate(db: Database.Database) {
  db.exec(`

  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    nome TEXT NOT NULL,
    documento TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    email TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    marca TEXT,
    precoVenda REAL NOT NULL,
    custo REAL NOT NULL,
    taxaImposto REAL NOT NULL,
    modalidadeVenda TEXT,
    estoque INTEGER,
    linkRef TEXT,
    custoRef REAL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    numero INTEGER UNIQUE NOT NULL,
    data TEXT NOT NULL,
    clienteId TEXT NOT NULL,
    tipo TEXT NOT NULL,
    observacoes TEXT
  );

  CREATE TABLE IF NOT EXISTS itens_pedido (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    pedidoId TEXT NOT NULL,
    produtoId TEXT NOT NULL,
    quantidade REAL NOT NULL,
    precoUnitario REAL NOT NULL,
    custoUnitario REAL NOT NULL,
    taxaImposto REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recebimentos (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    pedidoId TEXT NOT NULL,
    valor REAL NOT NULL,
    data TEXT NOT NULL,
    formaPagamento TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS empresas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS empresa_config (
    empresaId TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_prefs (
    userId TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rates_capital (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    nome TEXT NOT NULL,
    percentual REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rates_imposto (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    nome TEXT NOT NULL,
    percentual REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS modalidades (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    nome TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS linhas_venda (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    dataPedido TEXT NOT NULL,
    numeroOF TEXT,
    numeroDispensa TEXT,
    cliente TEXT,
    produto TEXT,
    modalidade TEXT,
    valorVenda REAL NOT NULL,
    taxaCapitalPerc REAL DEFAULT 0,
    taxaCapitalVl REAL DEFAULT 0,
    taxaImpostoPerc REAL DEFAULT 0,
    taxaImpostoVl REAL DEFAULT 0,
    custoMercadoria REAL DEFAULT 0,
    somaCustoFinal REAL DEFAULT 0,
    lucroValor REAL DEFAULT 0,
    lucroPerc REAL DEFAULT 0,
    dataRecebimento TEXT,
    paymentStatus TEXT NOT NULL DEFAULT 'PENDENTE',
    settlementStatus TEXT,
    acertoId TEXT,
    cor TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS participantes (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    nome TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    defaultPercent REAL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS acertos (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    data TEXT NOT NULL,
    titulo TEXT,
    observacoes TEXT,
    linhaIds TEXT NOT NULL,
    totalLucro REAL NOT NULL,
    totalDespesasRateio REAL NOT NULL,
    totalDespesasIndividuais REAL NOT NULL,
    totalLiquidoDistribuivel REAL NOT NULL,
    distribuicoes TEXT NOT NULL,
    despesas TEXT NOT NULL,
    ultimoRecebimentoBanco TEXT,
    status TEXT NOT NULL DEFAULT 'aberto',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS despesas_pendentes (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    tipo TEXT NOT NULL,
    participanteId TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    usedInAcertoId TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orcamentos (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    numero INTEGER NOT NULL,
    data TEXT NOT NULL,
    clienteId TEXT,
    clienteNome TEXT NOT NULL,
    clienteDocumento TEXT,
    clienteTelefone TEXT,
    clienteEmail TEXT,
    clienteEndereco TEXT,
    itens TEXT NOT NULL,
    observacoes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS seqs (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vale_movimentos (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    clienteId TEXT NOT NULL,
    data TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
    valor REAL NOT NULL,
    descricao TEXT,
    referenciaId TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outros_negocios (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    pessoa TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('emprestimo', 'venda')),
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    data TEXT NOT NULL,
    jurosAtivo INTEGER NOT NULL DEFAULT 0,
    jurosMesPercent REAL,
    pagamentos TEXT, -- JSON array of payments
    createdAt TEXT NOT NULL
  );

  -- Performance Indexes for faster queries
  -- Company-based indexes (most important)
  CREATE INDEX IF NOT EXISTS idx_clientes_company ON clientes(companyId);
  CREATE INDEX IF NOT EXISTS idx_produtos_company ON produtos(companyId);
  CREATE INDEX IF NOT EXISTS idx_pedidos_company ON pedidos(companyId);
  CREATE INDEX IF NOT EXISTS idx_itens_company ON itens_pedido(companyId);
  CREATE INDEX IF NOT EXISTS idx_recebimentos_company ON recebimentos(companyId);
  CREATE INDEX IF NOT EXISTS idx_linhas_venda_company ON linhas_venda(companyId);
  CREATE INDEX IF NOT EXISTS idx_participantes_company ON participantes(companyId);
  CREATE INDEX IF NOT EXISTS idx_acertos_company ON acertos(companyId);
  CREATE INDEX IF NOT EXISTS idx_despesas_pendentes_company ON despesas_pendentes(companyId);
  CREATE INDEX IF NOT EXISTS idx_orcamentos_company ON orcamentos(companyId);
  CREATE INDEX IF NOT EXISTS idx_vale_movimentos_company ON vale_movimentos(companyId);
  CREATE INDEX IF NOT EXISTS idx_vale_movimentos_cliente ON vale_movimentos(companyId, clienteId);
  CREATE INDEX IF NOT EXISTS idx_outros_negocios_company ON outros_negocios(companyId);
  
  -- JOIN optimization indexes
  CREATE INDEX IF NOT EXISTS idx_itens_pedido ON itens_pedido(pedidoId);
  CREATE INDEX IF NOT EXISTS idx_recebimentos_pedido ON recebimentos(pedidoId);
  
  -- Sorting optimization indexes
  CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(companyId, data DESC);
  CREATE INDEX IF NOT EXISTS idx_clientes_created ON clientes(companyId, createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_produtos_created ON produtos(companyId, createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_recebimentos_data ON recebimentos(companyId, data DESC);
  CREATE INDEX IF NOT EXISTS idx_linhas_venda_data ON linhas_venda(companyId, dataPedido DESC);
  
  -- Search optimization indexes
  CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(companyId, nome);
  CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(companyId, nome);
  CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(companyId, numero);
  CREATE INDEX IF NOT EXISTS idx_orcamentos_data ON orcamentos(companyId, data DESC);
  CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON orcamentos(companyId, numero);
  `)
  // initialize order sequence if empty
  const row = db.prepare("SELECT value FROM seqs WHERE key = 'pedido'").get() as { value: number } | undefined
  if (!row) {
    db.prepare("INSERT INTO seqs(key,value) VALUES('pedido',1)").run()
  }
  
  // initialize orcamento sequence if empty
  const orcRow = db.prepare("SELECT value FROM seqs WHERE key = 'orcamento'").get() as { value: number } | undefined
  if (!orcRow) {
    db.prepare("INSERT INTO seqs(key,value) VALUES('orcamento',1)").run()
  }
}
