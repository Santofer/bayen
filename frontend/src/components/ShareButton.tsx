/**
 * Bouton de partage — Web Share API + fallback WhatsApp/Copier/Facebook
 * Optimisé pour le Maroc (WhatsApp = canal #1)
 */

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, MessageCircle, Link, Globe, Check, X } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  productName: string
  brand: string
  score: number | null
  barcode: string
  className?: string
}

export default function ShareButton({ productName, brand, score, barcode, className }: ShareButtonProps) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const shareUrl = `https://bayen.ma/produit/${barcode}`
  const scoreText = score != null ? ` ${score}/100` : ''
  const shareText = `${t('share.text')} — ${productName} (${brand})${scoreText}`

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleShare = async () => {
    // Mobile : utiliser le Web Share API natif
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${productName} — Bayen`,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch {
        // Annulé par l'utilisateur ou erreur — fallback au dropdown
      }
    }
    // Desktop / fallback : ouvrir le dropdown
    setOpen(!open)
  }

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`
    window.open(url, '_blank', 'noopener')
    setOpen(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback pour les navigateurs plus anciens
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'noopener,width=600,height=400')
    setOpen(false)
  }

  const isRtl = locale === 'ary'

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        onClick={handleShare}
        className="bg-[#476a32] hover:bg-[#3a5829] text-[#f0f2d2] dark:bg-[#b1cf3a] dark:hover:bg-[#9dba2e] dark:text-[#1c3014] gap-2 shadow-md"
        size="sm"
      >
        <Share2 size={16} />
        {t('share.title')}
      </Button>

      {/* Dropdown fallback */}
      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 z-50 min-w-[180px] rounded-lg border bg-card shadow-lg p-1',
            isRtl ? 'left-0' : 'right-0'
          )}
        >
          {/* Fermer */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-accent transition-colors"
          >
            <MessageCircle size={18} className="text-[#25D366]" />
            <span>{t('share.whatsapp')}</span>
          </button>

          {/* Copier le lien */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-accent transition-colors"
          >
            {copied ? (
              <>
                <Check size={18} className="text-primary" />
                <span className="text-primary font-medium">{t('share.copied')}</span>
              </>
            ) : (
              <>
                <Link size={18} className="text-muted-foreground" />
                <span>{t('share.copyLink')}</span>
              </>
            )}
          </button>

          {/* Facebook */}
          <button
            onClick={handleFacebook}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-accent transition-colors"
          >
            <Globe size={18} className="text-[#1877F2]" />
            <span>{t('share.facebook')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
