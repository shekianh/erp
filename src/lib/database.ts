
import { supabase } from './supabase'

export interface DatabaseEntity {
  id?: string
  created_at?: string
  updated_at?: string
}

class DatabaseService {
  async list(tableName: string) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      return { list: data || [] }
    } catch (error) {
      console.error(`Erro ao listar ${tableName}:`, error)
      throw error
    }
  }

  async create(tableName: string, data: any) {
    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert([{
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      
      return result
    } catch (error) {
      console.error(`Erro ao criar em ${tableName}:`, error)
      throw error
    }
  }

  async update(tableName: string, id: string, data: any) {
    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      return result
    } catch (error) {
      console.error(`Erro ao atualizar ${tableName}:`, error)
      throw error
    }
  }

  async delete(tableName: string, id: string) {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) throw error
      
      return true
    } catch (error) {
      console.error(`Erro ao deletar de ${tableName}:`, error)
      throw error
    }
  }

  async findById(tableName: string, id: string) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      return data
    } catch (error) {
      console.error(`Erro ao buscar em ${tableName}:`, error)
      throw error
    }
  }
}

// Instância única do serviço
const db = new DatabaseService()

// Interface que simula a estrutura do Lumi SDK
export const entities = {
  produtos: {
    list: () => db.list('produtos'),
    create: (data: any) => db.create('produtos', data),
    update: (id: string, data: any) => db.update('produtos', id, data),
    delete: (id: string) => db.delete('produtos', id),
    findById: (id: string) => db.findById('produtos', id)
  },
  vendas: {
    list: () => db.list('vendas'),
    create: (data: any) => db.create('vendas', data),
    update: (id: string, data: any) => db.update('vendas', id, data),
    delete: (id: string) => db.delete('vendas', id),
    findById: (id: string) => db.findById('vendas', id)
  },
  ordens_producao: {
    list: () => db.list('ordens_producao'),
    create: (data: any) => db.create('ordens_producao', data),
    update: (id: string, data: any) => db.update('ordens_producao', id, data),
    delete: (id: string) => db.delete('ordens_producao', id),
    findById: (id: string) => db.findById('ordens_producao', id)
  },
  funcionarios: {
    list: () => db.list('funcionarios'),
    create: (data: any) => db.create('funcionarios', data),
    update: (id: string, data: any) => db.update('funcionarios', id, data),
    delete: (id: string) => db.delete('funcionarios', id),
    findById: (id: string) => db.findById('funcionarios', id)
  },
  financeiro: {
    list: () => db.list('financeiro'),
    create: (data: any) => db.create('financeiro', data),
    update: (id: string, data: any) => db.update('financeiro', id, data),
    delete: (id: string) => db.delete('financeiro', id),
    findById: (id: string) => db.findById('financeiro', id)
  }
}

export default db
