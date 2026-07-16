/**
 * Copia texto para a área de transferência
 * Usa a API moderna do Clipboard quando disponível, com fallback para o método legado
 * @param text - Texto a ser copiado
 * @returns Promise<boolean> - true se copiou com sucesso, false caso contrário
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Tenta usar a API moderna do Clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('Falha ao copiar usando clipboard API:', err)
    }
  }

  // Fallback usando textarea e execCommand
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    document.execCommand('copy')
    textArea.remove()
    return true
  } catch (err) {
    console.error('Falha ao copiar:', err)
    textArea.remove()
    return false
  }
}
