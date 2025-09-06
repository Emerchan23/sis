import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = 'default' // Por enquanto usando um usuário padrão
    
    const userPrefs = db.prepare("SELECT * FROM user_prefs WHERE userId = ?").get(userId) as any
    
    if (!userPrefs) {
      // Se não existir, criar preferências padrão
      const defaultPrefs = {
        currentEmpresaId: null,
        theme: 'light',
        language: 'pt-BR'
      }
      
      db.prepare(`
        INSERT INTO user_prefs (userId, json, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(
        userId,
        JSON.stringify(defaultPrefs),
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      return NextResponse.json(defaultPrefs)
    }
    
    return NextResponse.json(JSON.parse(userPrefs.json))
  } catch (error) {
    console.error('Error fetching user prefs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = 'default' // Por enquanto usando um usuário padrão
    const body = await request.json()
    
    // Verificar se já existe
    const existing = db.prepare("SELECT * FROM user_prefs WHERE userId = ?").get(userId)
    
    if (existing) {
      // Atualizar
      db.prepare(`
        UPDATE user_prefs 
        SET json = ?, updated_at = ?
        WHERE userId = ?
      `).run(
        JSON.stringify(body),
        new Date().toISOString(),
        userId
      )
    } else {
      // Criar novo
      db.prepare(`
        INSERT INTO user_prefs (userId, json, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(
        userId,
        JSON.stringify(body),
        new Date().toISOString(),
        new Date().toISOString()
      )
    }
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating user prefs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}