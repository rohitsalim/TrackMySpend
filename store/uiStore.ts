/**
 * UI State Store
 * Manages global UI state including loading states, modals, and notifications
 * Following .cursorrules requirement for UI store
 */

import { create } from 'zustand'

interface UIState {
  // Loading states
  isLoading: boolean
  loadingMessage?: string
  
  // Modal states
  isUploadModalOpen: boolean
  isTransactionEditModalOpen: boolean
  editingTransactionId?: string
  
  // Notification system
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration?: number
  }>
  
  // Actions
  setLoading: (isLoading: boolean, message?: string) => void
  openUploadModal: () => void
  closeUploadModal: () => void
  openTransactionEditModal: (transactionId?: string) => void
  closeTransactionEditModal: () => void
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isLoading: false,
  loadingMessage: undefined,
  isUploadModalOpen: false,
  isTransactionEditModalOpen: false,
  editingTransactionId: undefined,
  notifications: [],

  // Actions
  setLoading: (isLoading: boolean, message?: string) => {
    set({ isLoading, loadingMessage: message })
  },

  openUploadModal: () => {
    set({ isUploadModalOpen: true })
  },

  closeUploadModal: () => {
    set({ isUploadModalOpen: false })
  },

  openTransactionEditModal: (transactionId?: string) => {
    set({ 
      isTransactionEditModalOpen: true,
      editingTransactionId: transactionId 
    })
  },

  closeTransactionEditModal: () => {
    set({ 
      isTransactionEditModalOpen: false,
      editingTransactionId: undefined 
    })
  },

  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newNotification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    }
    
    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }))

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, newNotification.duration)
    }
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }))
  },

  clearNotifications: () => {
    set({ notifications: [] })
  }
}))