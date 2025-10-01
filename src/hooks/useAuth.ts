
import { useState, useEffect } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseAvailable } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  })

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!isSupabaseAvailable()) {
          console.warn('⚠️ Cliente Supabase não disponível - modo offline')
          setAuthState({
            user: null,
            session: null,
            loading: false
          })
          return
        }

        console.log('🔍 Verificando sessão atual...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Erro ao verificar sessão:', error)
          setAuthState({
            user: null,
            session: null,
            loading: false
          })
          return
        }

        console.log('✅ Sessão verificada:', session ? 'Ativa' : 'Inativa')
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false
        })
      } catch (error) {
        console.error('❌ Erro inesperado ao verificar sessão:', error)
        setAuthState({
          user: null,
          session: null,
          loading: false
        })
      }
    }

    // Verificar sessão inicial
    checkSession()

    // Escutar mudanças de autenticação
    let subscription: any = null
    
    try {
      if (isSupabaseAvailable()) {
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            try {
              console.log('🔄 Auth state change:', event, session ? 'Session ativa' : 'Session inativa')
              
              setAuthState({
                user: session?.user ?? null,
                session,
                loading: false
              })

              // Removido: notificação de login realizado com sucesso
              if (event === 'SIGNED_OUT') {
                toast.success('👋 Logout realizado com sucesso!')
              }
            } catch (error) {
              console.error('❌ Erro no callback de auth state change:', error)
            }
          }
        )
        subscription = authSubscription
      }
    } catch (error) {
      console.error('❌ Erro ao configurar listener de auth:', error)
    }

    return () => {
      try {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('❌ Erro ao remover listener de auth:', error)
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        throw new Error('Email e senha são obrigatórios')
      }

      if (!isSupabaseAvailable()) {
        throw new Error('Sistema de autenticação temporariamente indisponível')
      }

      console.log('🔐 Tentando fazer login com:', email)
      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Erro no login:', error)
        throw error
      }

      console.log('✅ Login bem-sucedido!')
      return { data, error: null }
    } catch (error) {
      const authError = error as AuthError
      console.error('❌ Erro no login:', authError)
      
      let errorMessage = 'Erro ao fazer login'
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos'
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
      } else if (authError.message.includes('temporarily indisponível')) {
        errorMessage = 'Sistema temporariamente indisponível. Tente novamente em alguns minutos.'
      }
      
      toast.error(errorMessage)
      return { data: null, error: authError }
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      if (!email || !password) {
        throw new Error('Email e senha são obrigatórios')
      }

      if (!isSupabaseAvailable()) {
        throw new Error('Sistema de cadastro temporariamente indisponível')
      }

      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) throw error

      toast.success('✅ Conta criada com sucesso! Verifique seu email.')
      return { data, error: null }
    } catch (error) {
      const authError = error as AuthError
      console.error('❌ Erro no cadastro:', authError)
      toast.error(authError.message || 'Erro ao criar conta')
      return { data: null, error: authError }
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const signOut = async () => {
    try {
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Cliente Supabase não disponível para logout')
        return
      }

      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
    } catch (error) {
      const authError = error as AuthError
      console.error('❌ Erro no logout:', authError)
      toast.error(authError.message || 'Erro ao fazer logout')
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const resetPassword = async (email: string) => {
    try {
      if (!email) {
        throw new Error('Email é obrigatório')
      }

      if (!isSupabaseAvailable()) {
        throw new Error('Sistema de recuperação temporariamente indisponível')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      toast.success('📧 Email de recuperação enviado!')
      return { error: null }
    } catch (error) {
      const authError = error as AuthError
      console.error('❌ Erro na recuperação de senha:', authError)
      toast.error(authError.message || 'Erro ao enviar email de recuperação')
      return { error: authError }
    }
  }

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated: !!authState.user
  }
}
