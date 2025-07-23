import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useUIStore } from '@/store/uiStore'

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      isLoading: false,
      loadingMessage: undefined,
      isUploadModalOpen: false,
      isTransactionEditModalOpen: false,
      editingTransactionId: undefined,
      notifications: []
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('loading state management', () => {
    it('should set loading state correctly', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setLoading(true, 'Loading transactions...')
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.loadingMessage).toBe('Loading transactions...')
    })

    it('should clear loading state', () => {
      const { result } = renderHook(() => useUIStore())

      // Set loading first
      act(() => {
        result.current.setLoading(true, 'Loading...')
      })

      // Clear loading
      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.loadingMessage).toBeUndefined()
    })

    it('should set loading without message', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.loadingMessage).toBeUndefined()
    })
  })

  describe('upload modal management', () => {
    it('should open upload modal', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.openUploadModal()
      })

      expect(result.current.isUploadModalOpen).toBe(true)
    })

    it('should close upload modal', () => {
      const { result } = renderHook(() => useUIStore())

      // Open modal first
      act(() => {
        result.current.openUploadModal()
      })

      // Close modal
      act(() => {
        result.current.closeUploadModal()
      })

      expect(result.current.isUploadModalOpen).toBe(false)
    })
  })

  describe('transaction edit modal management', () => {
    it('should open transaction edit modal without transaction ID', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.openTransactionEditModal()
      })

      expect(result.current.isTransactionEditModalOpen).toBe(true)
      expect(result.current.editingTransactionId).toBeUndefined()
    })

    it('should open transaction edit modal with transaction ID', () => {
      const { result } = renderHook(() => useUIStore())
      const transactionId = 'transaction-123'

      act(() => {
        result.current.openTransactionEditModal(transactionId)
      })

      expect(result.current.isTransactionEditModalOpen).toBe(true)
      expect(result.current.editingTransactionId).toBe(transactionId)
    })

    it('should close transaction edit modal', () => {
      const { result } = renderHook(() => useUIStore())

      // Open modal first with transaction ID
      act(() => {
        result.current.openTransactionEditModal('transaction-123')
      })

      // Close modal
      act(() => {
        result.current.closeTransactionEditModal()
      })

      expect(result.current.isTransactionEditModalOpen).toBe(false)
      expect(result.current.editingTransactionId).toBeUndefined()
    })
  })

  describe('notification management', () => {
    it('should add notification with all properties', () => {
      const { result } = renderHook(() => useUIStore())

      const notification = {
        type: 'success' as const,
        title: 'Success!',
        message: 'Operation completed successfully',
        duration: 3000
      }

      act(() => {
        result.current.addNotification(notification)
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]).toMatchObject(notification)
      expect(result.current.notifications[0].id).toBeDefined()
    })

    it('should add notification with default duration', () => {
      const { result } = renderHook(() => useUIStore())

      const notification = {
        type: 'info' as const,
        title: 'Info'
      }

      act(() => {
        result.current.addNotification(notification)
      })

      expect(result.current.notifications[0].duration).toBe(5000)
    })

    it('should add multiple notifications', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'First notification'
        })
        result.current.addNotification({
          type: 'error',
          title: 'Second notification'
        })
      })

      expect(result.current.notifications).toHaveLength(2)
      expect(result.current.notifications[0].title).toBe('First notification')
      expect(result.current.notifications[1].title).toBe('Second notification')
    })

    it('should generate unique IDs for notifications', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'First'
        })
        result.current.addNotification({
          type: 'info',
          title: 'Second'
        })
      })

      const ids = result.current.notifications.map(n => n.id)
      expect(ids[0]).not.toBe(ids[1])
    })

    it('should remove notification by ID', () => {
      const { result } = renderHook(() => useUIStore())

      // Add notifications
      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'First'
        })
        result.current.addNotification({
          type: 'error',
          title: 'Second'
        })
      })

      const firstNotificationId = result.current.notifications[0].id

      // Remove first notification
      act(() => {
        result.current.removeNotification(firstNotificationId)
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].title).toBe('Second')
    })

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useUIStore())

      // Add multiple notifications
      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'First'
        })
        result.current.addNotification({
          type: 'error',
          title: 'Second'
        })
        result.current.addNotification({
          type: 'warning',
          title: 'Third'
        })
      })

      // Clear all
      act(() => {
        result.current.clearNotifications()
      })

      expect(result.current.notifications).toHaveLength(0)
    })

    it('should auto-remove notification after duration', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Auto-remove test',
          duration: 1000
        })
      })

      expect(result.current.notifications).toHaveLength(1)

      // Fast-forward time by 1000ms
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.notifications).toHaveLength(0)
      
      vi.useRealTimers()
    })

    it('should not auto-remove notification with zero duration', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.addNotification({
          type: 'error',
          title: 'Persistent notification',
          duration: 0
        })
      })

      expect(result.current.notifications).toHaveLength(1)

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(10000)
      })

      // Should still be there
      expect(result.current.notifications).toHaveLength(1)
      
      vi.useRealTimers()
    })

    it('should handle different notification types', () => {
      const { result } = renderHook(() => useUIStore())

      const notificationTypes = ['success', 'error', 'warning', 'info'] as const

      notificationTypes.forEach((type, index) => {
        act(() => {
          result.current.addNotification({
            type,
            title: `${type} notification`
          })
        })
      })

      expect(result.current.notifications).toHaveLength(4)
      notificationTypes.forEach((type, index) => {
        expect(result.current.notifications[index].type).toBe(type)
        expect(result.current.notifications[index].title).toBe(`${type} notification`)
      })
    })
  })

  describe('state persistence', () => {
    it('should maintain state across multiple operations', () => {
      const { result } = renderHook(() => useUIStore())

      // Perform multiple operations
      act(() => {
        result.current.setLoading(true, 'Loading...')
        result.current.openUploadModal()
        result.current.openTransactionEditModal('tx-123')
        result.current.addNotification({
          type: 'success',
          title: 'All operations complete'
        })
      })

      // Verify all states are maintained
      expect(result.current.isLoading).toBe(true)
      expect(result.current.loadingMessage).toBe('Loading...')
      expect(result.current.isUploadModalOpen).toBe(true)
      expect(result.current.isTransactionEditModalOpen).toBe(true)
      expect(result.current.editingTransactionId).toBe('tx-123')
      expect(result.current.notifications).toHaveLength(1)
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUIStore())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.loadingMessage).toBeUndefined()
      expect(result.current.isUploadModalOpen).toBe(false)
      expect(result.current.isTransactionEditModalOpen).toBe(false)
      expect(result.current.editingTransactionId).toBeUndefined()
      expect(result.current.notifications).toEqual([])
    })
  })
})