export const tableStickyStyles = {
  '& [data-sticky]': {
    position: 'sticky',
    zIndex: 1,
    bg: 'bg',

    _after: {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      top: '0',
      bottom: '-1px',
      width: '32px',
    },
  },

  '& [data-sticky=end]': {
    _after: {
      insetInlineEnd: '0',
      translate: '100% 0',
      // shadow: 'inset 8px 0px 8px -8px rgba(0, 0, 0, 0.16)',
    },
  },

  '& [data-sticky=start]': {
    _after: {
      insetInlineStart: '0',
      translate: '-100% 0',
      shadow: 'inset -8px 0px 8px -8px rgba(0, 0, 0, 0.16)',
    },
  },
}
