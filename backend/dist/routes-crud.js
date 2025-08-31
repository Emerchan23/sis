import { nanoid } from "nanoid";
import { getDb } from "./db.js";
import { uid } from "./util.js";
// Helper function to get current company ID from user preferences
function getCurrentCompanyId(req) {
    const db = getDb();
    const row = db.prepare("SELECT json FROM user_prefs WHERE userId=?").get("default");
    if (!row)
        return null;
    try {
        const prefs = JSON.parse(row.json);
        return prefs.currentEmpresaId || null;
    }
    catch {
        return null;
    }
}
export async function registerCrudRoutes(app) {
    const db = getDb();
    /* Clientes */
    app.get("/clientes", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM clientes WHERE companyId = ? ORDER BY createdAt DESC").all(companyId);
    });
    app.post("/clientes", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const body = req.body;
        const id = nanoid();
        db.prepare("INSERT INTO clientes (id,companyId,nome,documento,endereco,telefone,email,createdAt) VALUES (?,?,?,?,?,?,?,?)").run(id, companyId, body.nome, body.documento, body.endereco ?? null, body.telefone ?? null, body.email ?? null, new Date().toISOString());
        return { id };
    });
    app.put("/clientes/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        db.prepare("UPDATE clientes SET nome=?, documento=?, endereco=?, telefone=?, email=? WHERE id=? AND companyId=?").run(b.nome, b.documento, b.endereco ?? null, b.telefone ?? null, b.email ?? null, id, companyId);
        return { ok: true };
    });
    app.delete("/clientes/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        db.prepare("DELETE FROM clientes WHERE id = ? AND companyId = ?").run(id, companyId);
        return { ok: true };
    });
    /* Produtos */
    app.get("/produtos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM produtos WHERE companyId = ? ORDER BY createdAt DESC").all(companyId);
    });
    app.post("/produtos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = nanoid();
        db.prepare(`INSERT INTO produtos (id,companyId,nome,descricao,marca,precoVenda,custo,taxaImposto,modalidadeVenda,estoque,linkRef,custoRef,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, companyId, b.nome, b.descricao ?? null, b.marca ?? null, b.precoVenda, b.custo, b.taxaImposto, b.modalidadeVenda ?? null, b.estoque ?? null, b.linkRef ?? null, b.custoRef ?? null, new Date().toISOString());
        return { id };
    });
    app.put("/produtos/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        db.prepare(`UPDATE produtos SET nome=?,descricao=?,marca=?,precoVenda=?,custo=?,taxaImposto=?,modalidadeVenda=?,estoque=?,linkRef=?,custoRef=? WHERE id=? AND companyId=?`).run(b.nome, b.descricao ?? null, b.marca ?? null, b.precoVenda, b.custo, b.taxaImposto, b.modalidadeVenda ?? null, b.estoque ?? null, b.linkRef ?? null, b.custoRef ?? null, id, companyId);
        return { ok: true };
    });
    app.delete("/produtos/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        db.prepare("DELETE FROM produtos WHERE id = ? AND companyId = ?").run(id, companyId);
        return { ok: true };
    });
    /* Pedidos + Itens */
    app.get("/pedidos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        // Optimized query to eliminate N+1 problem
        const pedidosQuery = `
      SELECT 
        p.*,
        ip.id as item_id,
        ip.produtoId,
        ip.quantidade,
        ip.precoUnitario,
        ip.custoUnitario,
        ip.taxaImposto
      FROM pedidos p
      LEFT JOIN itens_pedido ip ON p.id = ip.pedidoId
      WHERE p.companyId = ?
      ORDER BY date(p.data) DESC, p.numero DESC, ip.id
    `;
        const rows = db.prepare(pedidosQuery).all(companyId);
        // Group items by pedido
        const pedidosMap = new Map();
        for (const row of rows) {
            if (!pedidosMap.has(row.id)) {
                pedidosMap.set(row.id, {
                    id: row.id,
                    companyId: row.companyId,
                    numero: row.numero,
                    data: row.data,
                    clienteId: row.clienteId,
                    tipo: row.tipo,
                    observacoes: row.observacoes,
                    itens: []
                });
            }
            const pedido = pedidosMap.get(row.id);
            if (row.item_id) {
                pedido.itens.push({
                    id: row.item_id,
                    produtoId: row.produtoId,
                    quantidade: row.quantidade,
                    precoUnitario: row.precoUnitario,
                    custoUnitario: row.custoUnitario,
                    taxaImposto: row.taxaImposto
                });
            }
        }
        return Array.from(pedidosMap.values());
    });
    app.post("/pedidos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = nanoid();
        const numeroRow = db.prepare("SELECT value FROM seqs WHERE key='pedido'").get();
        const numero = Number(numeroRow?.value ?? 1);
        const tx = db.transaction(() => {
            db.prepare("INSERT INTO pedidos (id,companyId,numero,data,clienteId,tipo,observacoes) VALUES (?,?,?,?,?,?,?)").run(id, companyId, numero, b.data, b.clienteId, b.tipo, b.observacoes ?? null);
            const next = numero + 1;
            db.prepare("UPDATE seqs SET value=? WHERE key='pedido'").run(next);
            const itens = Array.isArray(b.itens) ? b.itens : [];
            const ins = db.prepare("INSERT INTO itens_pedido (id,pedidoId,produtoId,quantidade,precoUnitario,custoUnitario,taxaImposto) VALUES (?,?,?,?,?,?,?)");
            for (const it of itens) {
                ins.run(nanoid(), id, it.produtoId, it.quantidade, it.precoUnitario, it.custoUnitario, it.taxaImposto);
            }
        });
        tx();
        return { id, numero };
    });
    app.put("/pedidos/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        const tx = db.transaction(() => {
            db.prepare("UPDATE pedidos SET data=?, clienteId=?, tipo=?, observacoes=? WHERE id=? AND companyId=?").run(b.data, b.clienteId, b.tipo, b.observacoes ?? null, id, companyId);
            db.prepare("DELETE FROM itens_pedido WHERE pedidoId=?").run(id);
            const ins = db.prepare("INSERT INTO itens_pedido (id,pedidoId,produtoId,quantidade,precoUnitario,custoUnitario,taxaImposto) VALUES (?,?,?,?,?,?,?)");
            for (const it of b.itens ?? []) {
                ins.run(nanoid(), id, it.produtoId, it.quantidade, it.precoUnitario, it.custoUnitario, it.taxaImposto);
            }
        });
        tx();
        return { ok: true };
    });
    app.delete("/pedidos/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const tx = db.transaction(() => {
            db.prepare("DELETE FROM itens_pedido WHERE pedidoId=?").run(id);
            db.prepare("DELETE FROM pedidos WHERE id=? AND companyId=?").run(id, companyId);
            db.prepare("DELETE FROM recebimentos WHERE pedidoId=?").run(id);
        });
        tx();
        return { ok: true };
    });
    /* Recebimentos */
    app.get("/recebimentos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM recebimentos WHERE companyId = ? ORDER BY date(data) DESC").all(companyId);
    });
    app.post("/recebimentos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = nanoid();
        db.prepare("INSERT INTO recebimentos (id,companyId,pedidoId,valor,data,formaPagamento) VALUES (?,?,?,?,?,?)").run(id, companyId, b.pedidoId, b.valor, b.data, b.formaPagamento);
        return { id };
    });
    app.put("/recebimentos/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        db.prepare("UPDATE recebimentos SET pedidoId=?, valor=?, data=?, formaPagamento=? WHERE id=? AND companyId=?").run(b.pedidoId, b.valor, b.data, b.formaPagamento, id, companyId);
        return { ok: true };
    });
    app.delete("/recebimentos/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        db.prepare("DELETE FROM recebimentos WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    /* Modalidades */
    app.get("/modalidades", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM modalidades WHERE companyId = ? ORDER BY nome").all(companyId);
    });
    app.post("/modalidades", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = nanoid();
        db.prepare("INSERT INTO modalidades (id,companyId,nome) VALUES (?,?,?)").run(id, companyId, b.nome);
        return { id };
    });
    app.put("/modalidades/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        db.prepare("UPDATE modalidades SET nome=? WHERE id=? AND companyId=?").run(b.nome, id, companyId);
        return { ok: true };
    });
    app.delete("/modalidades/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        db.prepare("DELETE FROM modalidades WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    /* Rates */
    app.get("/rates/capital", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM rates_capital WHERE companyId = ? ORDER BY percentual").all(companyId);
    });
    app.post("/rates/capital", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = nanoid();
        db.prepare("INSERT INTO rates_capital (id,companyId,nome,percentual) VALUES (?,?,?,?)").run(id, companyId, b.nome, b.percentual);
        return { id };
    });
    app.put("/rates/capital/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        db.prepare("UPDATE rates_capital SET nome=?, percentual=? WHERE id=? AND companyId=?").run(b.nome, b.percentual, id, companyId);
        return { ok: true };
    });
    app.delete("/rates/capital/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        db.prepare("DELETE FROM rates_capital WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    app.get("/rates/imposto", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM rates_imposto WHERE companyId = ? ORDER BY percentual").all(companyId);
    });
    app.post("/rates/imposto", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = nanoid();
        db.prepare("INSERT INTO rates_imposto (id,companyId,nome,percentual) VALUES (?,?,?,?)").run(id, companyId, b.nome, b.percentual);
        return { id };
    });
    app.put("/rates/imposto/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        db.prepare("UPDATE rates_imposto SET nome=?, percentual=? WHERE id=? AND companyId=?").run(b.nome, b.percentual, id, companyId);
        return { ok: true };
    });
    app.delete("/rates/imposto/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        db.prepare("DELETE FROM rates_imposto WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    /* Empresas */
    app.get("/empresas", async () => {
        return db.prepare("SELECT * FROM empresas ORDER BY nome").all();
    });
    app.post("/empresas", async (req) => {
        const b = req.body;
        const id = nanoid();
        db.prepare("INSERT INTO empresas (id,nome) VALUES (?,?)").run(id, b.nome);
        return { id };
    });
    app.put("/empresas/:id", async (req) => {
        const id = req.params.id;
        const b = req.body;
        db.prepare("UPDATE empresas SET nome=? WHERE id=?").run(b.nome, id);
        return { ok: true };
    });
    app.delete("/empresas/:id", async (req) => {
        const id = req.params.id;
        db.prepare("DELETE FROM empresas WHERE id=?").run(id);
        return { ok: true };
    });
    app.get("/empresa-config/:empresaId", async (req) => {
        const empresaId = req.params.empresaId;
        const row = db.prepare("SELECT json FROM empresa_config WHERE empresaId=?").get(empresaId);
        return row ? JSON.parse(row.json) : null;
    });
    app.put("/empresa-config/:empresaId", async (req) => {
        const empresaId = req.params.empresaId;
        const json = JSON.stringify(req.body ?? {});
        const up = db.prepare("UPDATE empresa_config SET json=? WHERE empresaId=?").run(json, empresaId);
        if (up.changes === 0)
            db.prepare("INSERT INTO empresa_config (empresaId,json) VALUES (?,?)").run(empresaId, json);
        return { ok: true };
    });
    /* User prefs (p/ empresa corrente, densidade etc.) */
    app.get("/user-prefs", async (req) => {
        const row = db.prepare("SELECT json FROM user_prefs WHERE userId=?").get("default");
        return row ? JSON.parse(row.json) : {};
    });
    app.put("/user-prefs", async (req) => {
        const json = JSON.stringify(req.body ?? {});
        const up = db.prepare("UPDATE user_prefs SET json=? WHERE userId=?").run(json, "default");
        if (up.changes === 0)
            db.prepare("INSERT INTO user_prefs (userId,json) VALUES (?,?)").run("default", json);
        return { ok: true };
    });
    /* Linhas de Vendas (planilha) */
    app.get("/linhas-venda", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return db.prepare("SELECT * FROM linhas_venda ORDER BY date(dataPedido) DESC, createdAt DESC").all();
        }
        return db.prepare("SELECT * FROM linhas_venda WHERE companyId = ? ORDER BY date(dataPedido) DESC, createdAt DESC").all(companyId);
    });
    app.post("/linhas-venda", async (req) => {
        const b = req.body;
        const id = nanoid();
        const calc = computeLine(b);
        db.prepare(`INSERT INTO linhas_venda
      (id,companyId,dataPedido,numeroOF,numeroDispensa,cliente,produto,modalidade,valorVenda,
       taxaCapitalPerc,taxaCapitalVl,taxaImpostoPerc,taxaImpostoVl,custoMercadoria,somaCustoFinal,
       lucroValor,lucroPerc,dataRecebimento,paymentStatus,settlementStatus,acertoId,cor,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, b.companyId ?? null, b.dataPedido, b.numeroOF ?? null, b.numeroDispensa ?? null, b.cliente ?? null, b.produto ?? null, b.modalidade ?? null, calc.valorVenda, calc.taxaCapitalPerc, calc.taxaCapitalVl, calc.taxaImpostoPerc, calc.taxaImpostoVl, calc.custoMercadoria, calc.somaCustoFinal, calc.lucroValor, calc.lucroPerc, b.dataRecebimento ?? null, b.paymentStatus ?? "PENDENTE", b.settlementStatus ?? null, b.acertoId ?? null, b.cor ?? null, new Date().toISOString());
        return { id };
    });
    app.put("/linhas-venda/:id", async (req) => {
        const id = req.params.id;
        const b = req.body;
        const calc = computeLine(b);
        db.prepare(`UPDATE linhas_venda SET companyId=?,dataPedido=?,numeroOF=?,numeroDispensa=?,cliente=?,produto=?,modalidade=?,valorVenda=?,
       taxaCapitalPerc=?,taxaCapitalVl=?,taxaImpostoPerc=?,taxaImpostoVl=?,custoMercadoria=?,somaCustoFinal=?,lucroValor=?,lucroPerc=?,
       dataRecebimento=?,paymentStatus=?,settlementStatus=?,acertoId=?,cor=? WHERE id=?`).run(b.companyId ?? null, b.dataPedido, b.numeroOF ?? null, b.numeroDispensa ?? null, b.cliente ?? null, b.produto ?? null, b.modalidade ?? null, calc.valorVenda, calc.taxaCapitalPerc, calc.taxaCapitalVl, calc.taxaImpostoPerc, calc.taxaImpostoVl, calc.custoMercadoria, calc.somaCustoFinal, calc.lucroValor, calc.lucroPerc, b.dataRecebimento ?? null, b.paymentStatus ?? "PENDENTE", b.settlementStatus ?? null, b.acertoId ?? null, b.cor ?? null, id);
        return { ok: true };
    });
    app.patch("/linhas-venda/:id/cor", async (req) => {
        const id = req.params.id;
        const b = req.body;
        // Get company ID before update
        const row = db.prepare("SELECT companyId FROM linhas_venda WHERE id=?").get(id);
        db.prepare("UPDATE linhas_venda SET cor=? WHERE id=?").run(b.cor ?? null, id);
        return { ok: true };
    });
    app.patch("/linhas-venda/:id", async (req) => {
        const id = req.params.id;
        const b = req.body;
        // Get company ID before update
        const row = db.prepare("SELECT companyId FROM linhas_venda WHERE id=?").get(id);
        const updates = [];
        const values = [];
        if (b.acertoId !== undefined) {
            updates.push('acertoId=?');
            values.push(b.acertoId);
        }
        if (b.settlementStatus !== undefined) {
            updates.push('settlementStatus=?');
            values.push(b.settlementStatus);
        }
        if (b.paymentStatus !== undefined) {
            updates.push('paymentStatus=?');
            values.push(b.paymentStatus);
        }
        if (b.dataRecebimento !== undefined) {
            updates.push('dataRecebimento=?');
            values.push(b.dataRecebimento);
        }
        if (b.cor !== undefined) {
            updates.push('cor=?');
            values.push(b.cor);
        }
        if (updates.length > 0) {
            values.push(id);
            db.prepare(`UPDATE linhas_venda SET ${updates.join(', ')} WHERE id=?`).run(...values);
        }
        return { ok: true };
    });
    app.delete("/linhas-venda/:id", async (req) => {
        const id = req.params.id;
        // Get company ID before deletion
        const row = db.prepare("SELECT companyId FROM linhas_venda WHERE id=?").get(id);
        db.prepare("DELETE FROM linhas_venda WHERE id=?").run(id);
        return { ok: true };
    });
    // Participantes
    app.get("/participantes", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM participantes WHERE companyId=? ORDER BY createdAt DESC").all(companyId);
    });
    app.post("/participantes", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = uid();
        const createdAt = new Date().toISOString();
        db.prepare(`INSERT INTO participantes 
      (id, companyId, nome, ativo, defaultPercent, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?)`)
            .run(id, companyId, b.nome, b.ativo ? 1 : 0, b.defaultPercent || null, createdAt);
        return { id };
    });
    app.patch("/participantes/:id", async (req) => {
        const id = req.params.id;
        const b = req.body;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        db.prepare(`UPDATE participantes SET 
      nome=?, ativo=?, defaultPercent=? 
      WHERE id=? AND companyId=?`)
            .run(b.nome, b.ativo ? 1 : 0, b.defaultPercent || null, id, companyId);
        return { ok: true };
    });
    app.delete("/participantes/:id", async (req) => {
        const id = req.params.id;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        db.prepare("DELETE FROM participantes WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    // Acertos
    app.get("/acertos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        const rows = db.prepare("SELECT * FROM acertos WHERE companyId=? ORDER BY createdAt DESC").all(companyId);
        // Parse JSON fields
        return rows.map((row) => ({
            ...row,
            linhaIds: JSON.parse(row.linhaIds || '[]'),
            distribuicoes: JSON.parse(row.distribuicoes || '[]'),
            despesas: JSON.parse(row.despesas || '[]'),
            ultimoRecebimentoBanco: row.ultimoRecebimentoBanco ? JSON.parse(row.ultimoRecebimentoBanco) : undefined
        }));
    });
    app.post("/acertos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = uid();
        const createdAt = new Date().toISOString();
        db.prepare(`INSERT INTO acertos 
      (id, companyId, data, titulo, observacoes, linhaIds, totalLucro, totalDespesasRateio, 
       totalDespesasIndividuais, totalLiquidoDistribuivel, distribuicoes, despesas, 
       ultimoRecebimentoBanco, status, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, companyId, b.data, b.titulo || null, b.observacoes || null, JSON.stringify(b.linhaIds || []), b.totalLucro, b.totalDespesasRateio, b.totalDespesasIndividuais, b.totalLiquidoDistribuivel, JSON.stringify(b.distribuicoes || []), JSON.stringify(b.despesas || []), b.ultimoRecebimentoBanco ? JSON.stringify(b.ultimoRecebimentoBanco) : null, b.status || 'aberto', createdAt);
        return { id };
    });
    app.patch("/acertos/:id", async (req) => {
        const id = req.params.id;
        const b = req.body;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const updates = [];
        const values = [];
        if (b.titulo !== undefined) {
            updates.push('titulo=?');
            values.push(b.titulo);
        }
        if (b.observacoes !== undefined) {
            updates.push('observacoes=?');
            values.push(b.observacoes);
        }
        if (b.status !== undefined) {
            updates.push('status=?');
            values.push(b.status);
        }
        if (b.linhaIds !== undefined) {
            updates.push('linhaIds=?');
            values.push(JSON.stringify(b.linhaIds));
        }
        if (b.distribuicoes !== undefined) {
            updates.push('distribuicoes=?');
            values.push(JSON.stringify(b.distribuicoes));
        }
        if (b.despesas !== undefined) {
            updates.push('despesas=?');
            values.push(JSON.stringify(b.despesas));
        }
        if (b.ultimoRecebimentoBanco !== undefined) {
            updates.push('ultimoRecebimentoBanco=?');
            values.push(b.ultimoRecebimentoBanco ? JSON.stringify(b.ultimoRecebimentoBanco) : null);
        }
        if (updates.length > 0) {
            values.push(id, companyId);
            db.prepare(`UPDATE acertos SET ${updates.join(', ')} WHERE id=? AND companyId=?`).run(...values);
        }
        return { ok: true };
    });
    app.delete("/acertos/:id", async (req) => {
        const id = req.params.id;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        db.prepare("DELETE FROM acertos WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    // Despesas Pendentes
    app.get("/despesas-pendentes", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM despesas_pendentes WHERE companyId=? ORDER BY createdAt DESC").all(companyId);
    });
    app.post("/despesas-pendentes", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = uid();
        const createdAt = new Date().toISOString();
        db.prepare(`INSERT INTO despesas_pendentes 
      (id, companyId, descricao, valor, tipo, participanteId, status, usedInAcertoId, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, companyId, b.descricao, b.valor, b.tipo, b.participanteId || null, b.status || 'pendente', b.usedInAcertoId || null, createdAt);
        return { id };
    });
    app.patch("/despesas-pendentes/:id", async (req) => {
        const id = req.params.id;
        const b = req.body;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const updates = [];
        const values = [];
        if (b.descricao !== undefined) {
            updates.push('descricao=?');
            values.push(b.descricao);
        }
        if (b.valor !== undefined) {
            updates.push('valor=?');
            values.push(b.valor);
        }
        if (b.tipo !== undefined) {
            updates.push('tipo=?');
            values.push(b.tipo);
        }
        if (b.participanteId !== undefined) {
            updates.push('participanteId=?');
            values.push(b.participanteId);
        }
        if (b.status !== undefined) {
            updates.push('status=?');
            values.push(b.status);
        }
        if (b.usedInAcertoId !== undefined) {
            updates.push('usedInAcertoId=?');
            values.push(b.usedInAcertoId);
        }
        if (updates.length > 0) {
            values.push(id, companyId);
            db.prepare(`UPDATE despesas_pendentes SET ${updates.join(', ')} WHERE id=? AND companyId=?`).run(...values);
        }
        return { ok: true };
    });
    app.delete("/despesas-pendentes/:id", async (req) => {
        const id = req.params.id;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        db.prepare("DELETE FROM despesas_pendentes WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    // Orçamentos
    app.get("/orcamentos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        const rows = db.prepare("SELECT * FROM orcamentos WHERE companyId=? ORDER BY data DESC, numero DESC").all(companyId);
        return rows.map(row => ({
            ...row,
            itens: JSON.parse(row.itens || '[]'),
            cliente: {
                id: row.clienteId,
                nome: row.clienteNome,
                documento: row.clienteDocumento,
                telefone: row.clienteTelefone,
                email: row.clienteEmail,
                endereco: row.clienteEndereco
            }
        }));
    });
    app.post("/orcamentos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = uid();
        const now = new Date().toISOString();
        // Get next numero
        const seqRow = db.prepare("SELECT value FROM seqs WHERE key = 'orcamento'").get();
        const numero = seqRow?.value || 1;
        db.prepare("UPDATE seqs SET value = ? WHERE key = 'orcamento'").run(numero + 1);
        db.prepare(`INSERT INTO orcamentos 
      (id, companyId, numero, data, clienteId, clienteNome, clienteDocumento, clienteTelefone, clienteEmail, clienteEndereco, itens, observacoes, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, companyId, numero, b.data || now, b.cliente?.id || null, b.cliente?.nome || '', b.cliente?.documento || null, b.cliente?.telefone || null, b.cliente?.email || null, b.cliente?.endereco || null, JSON.stringify(b.itens || []), b.observacoes || null, now, now);
        return { id, numero };
    });
    app.patch("/orcamentos/:id", async (req) => {
        const id = req.params.id;
        const b = req.body;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const now = new Date().toISOString();
        db.prepare(`UPDATE orcamentos SET 
      clienteId=?, clienteNome=?, clienteDocumento=?, clienteTelefone=?, clienteEmail=?, clienteEndereco=?, 
      itens=?, observacoes=?, updatedAt=? 
      WHERE id=? AND companyId=?`)
            .run(b.cliente?.id || null, b.cliente?.nome || '', b.cliente?.documento || null, b.cliente?.telefone || null, b.cliente?.email || null, b.cliente?.endereco || null, JSON.stringify(b.itens || []), b.observacoes || null, now, id, companyId);
        return { ok: true };
    });
    app.delete("/orcamentos/:id", async (req) => {
        const id = req.params.id;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        db.prepare("DELETE FROM orcamentos WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    // Vale Movimentos
    app.get("/vale-movimentos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM vale_movimentos WHERE companyId=? ORDER BY data DESC, createdAt DESC").all(companyId);
    });
    app.get("/vale-movimentos/cliente/:clienteId", async (req) => {
        const clienteId = req.params.clienteId;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        return db.prepare("SELECT * FROM vale_movimentos WHERE companyId=? AND clienteId=? ORDER BY data DESC, createdAt DESC").all(companyId, clienteId);
    });
    app.post("/vale-movimentos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = uid();
        const createdAt = new Date().toISOString();
        db.prepare(`INSERT INTO vale_movimentos 
      (id, companyId, clienteId, data, tipo, valor, descricao, referenciaId, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, companyId, b.clienteId, b.data, b.tipo, b.valor, b.descricao || null, b.referenciaId || null, createdAt);
        return { id };
    });
    app.delete("/vale-movimentos/:id", async (req) => {
        const id = req.params.id;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        db.prepare("DELETE FROM vale_movimentos WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
    app.get("/vale-saldos", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return {};
        }
        const movimentos = db.prepare("SELECT clienteId, tipo, valor FROM vale_movimentos WHERE companyId=?").all(companyId);
        const saldos = {};
        for (const mov of movimentos) {
            const current = saldos[mov.clienteId] || 0;
            saldos[mov.clienteId] = mov.tipo === 'credito' ? current + mov.valor : current - mov.valor;
        }
        // Garantir que saldos nunca sejam negativos
        for (const clienteId in saldos) {
            saldos[clienteId] = Math.max(0, saldos[clienteId]);
        }
        return saldos;
    });
    /* Outros Negócios */
    app.get("/outros-negocios", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            return [];
        }
        const rows = db.prepare("SELECT * FROM outros_negocios WHERE companyId = ? ORDER BY data DESC, createdAt DESC").all(companyId);
        return rows.map((row) => ({
            ...row,
            jurosAtivo: !!row.jurosAtivo,
            pagamentos: row.pagamentos ? JSON.parse(row.pagamentos) : []
        }));
    });
    app.post("/outros-negocios", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const b = req.body;
        const id = uid();
        const createdAt = new Date().toISOString();
        db.prepare(`INSERT INTO outros_negocios 
      (id, companyId, pessoa, tipo, descricao, valor, data, jurosAtivo, jurosMesPercent, pagamentos, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, companyId, b.pessoa, b.tipo, b.descricao, b.valor, b.data, b.jurosAtivo ? 1 : 0, b.jurosMesPercent || null, JSON.stringify(b.pagamentos || []), createdAt);
        return { id };
    });
    app.put("/outros-negocios/:id", async (req) => {
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        const id = req.params.id;
        const b = req.body;
        // Buscar o registro atual para manter os campos não fornecidos
        const current = db.prepare("SELECT * FROM outros_negocios WHERE id=? AND companyId=?").get(id, companyId);
        if (!current) {
            throw new Error("Registro não encontrado");
        }
        // Usar valores atuais como fallback para campos não fornecidos
        const pessoa = b.pessoa !== undefined ? b.pessoa : current.pessoa;
        const tipo = b.tipo !== undefined ? b.tipo : current.tipo;
        const descricao = b.descricao !== undefined ? b.descricao : current.descricao;
        const valor = b.valor !== undefined ? b.valor : current.valor;
        const data = b.data !== undefined ? b.data : current.data;
        const jurosAtivo = b.jurosAtivo !== undefined ? (b.jurosAtivo ? 1 : 0) : current.jurosAtivo;
        const jurosMesPercent = b.jurosMesPercent !== undefined ? b.jurosMesPercent : current.jurosMesPercent;
        const pagamentos = b.pagamentos !== undefined ? JSON.stringify(b.pagamentos) : current.pagamentos;
        db.prepare(`UPDATE outros_negocios SET 
      pessoa=?, tipo=?, descricao=?, valor=?, data=?, jurosAtivo=?, jurosMesPercent=?, pagamentos=? 
      WHERE id=? AND companyId=?`)
            .run(pessoa, tipo, descricao, valor, data, jurosAtivo, jurosMesPercent, pagamentos, id, companyId);
        return { ok: true };
    });
    app.delete("/outros-negocios/:id", async (req) => {
        const id = req.params.id;
        const companyId = getCurrentCompanyId(req);
        if (!companyId) {
            throw new Error("Empresa não selecionada");
        }
        db.prepare("DELETE FROM outros_negocios WHERE id=? AND companyId=?").run(id, companyId);
        return { ok: true };
    });
}
function computeLine(b) {
    const valor = Number(b.valorVenda || 0);
    const capPerc = Number(b.taxaCapitalPerc || 0);
    const impPerc = Number(b.taxaImpostoPerc || 0);
    const custo = Number(b.custoMercadoria || 0);
    const taxaCapitalVl = +(valor * (capPerc / 100)).toFixed(2);
    const taxaImpostoVl = +(valor * (impPerc / 100)).toFixed(2);
    const somaCustoFinal = +(custo + taxaCapitalVl + taxaImpostoVl).toFixed(2);
    const lucroValor = +(valor - somaCustoFinal).toFixed(2);
    const lucroPerc = valor > 0 ? +((lucroValor / valor) * 100).toFixed(2) : 0;
    return {
        valorVenda: valor,
        taxaCapitalPerc: capPerc,
        taxaCapitalVl,
        taxaImpostoPerc: impPerc,
        taxaImpostoVl,
        custoMercadoria: custo,
        somaCustoFinal,
        lucroValor,
        lucroPerc,
    };
}
