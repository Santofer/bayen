/**
 * Toggle dark/light mode
 * Persiste en localStorage, applique la classe .dark sur <html>
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('bayen_theme')
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDark(isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('bayen_theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  // Éviter le flash pendant l'hydratation
  if (!mounted) return <div className="w-9 h-9" />

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-9 w-9 rounded-full"
      aria-label={dark ? 'Mode clair' : 'Mode sombre'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  )
}
